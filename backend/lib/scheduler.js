// Background jobs that run every hour:
//   • task due-date reminders            (in-app + email if "reminders" on)
//   • "come back" nudge after 3 quiet days (at most weekly)
//   • weekly progress summary (Mondays, 9am+ in the member's time zone)
//   • job alerts for new strong matches  (at most daily)
//   • follow-up reminder 7 days after applying
//   • "time to study" before each session on the member's weekly study schedule
// Emails are only sent when SMTP is configured; in-app notifications always are.
require('dotenv').config();
const db = require('../db');
const { sendMail, emailConfigured } = require('./mailer');
const { matchJob, customSkills, mentions } = require('./skills');
const { loadProfile } = require('./careerProfile');
const E = require('./engagement');

const q = () => db.promise();
const parse = (v, d) => { if (!v) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };
// 'YYYY-MM-DD HH:MM:SS' in server-local time — the same format MySQL uses for TIMESTAMP columns.
const sqlTime = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const HOURS = (n) => sqlTime(new Date(Date.now() - n * 3600000));
const older = (ts, hours) => !ts || new Date(ts).getTime() < Date.now() - hours * 3600000;

async function email(user, type, subject, layout) {
  if (!emailConfigured() || !user.email || Number(user.email_verified) === 0) return false;
  const { text, html } = E.emailLayout({ ...layout, unsubscribe: E.unsubscribeUrl(user.id, type) });
  try {
    const r = await sendMail({ to: user.email, subject, text, html });
    return r.delivered;
  } catch (err) {
    console.warn(`[scheduler] email to user ${user.id} failed: ${err.message}`);
    return false;
  }
}

async function usersWithSettings() {
  const [users] = await q().query('SELECT id, name, email, created_at, email_verified FROM users');
  const [settings] = await q().query('SELECT * FROM user_settings');
  const byId = new Map(settings.map((s) => [s.user_id, s]));
  return users.map((u) => ({ ...u, settings: { email_weekly: 1, email_reminders: 1, email_job_alerts: 1, email_followups: 1, daily_goal: 1, timezone: 'America/New_York', ...(byId.get(u.id) || {}) } }));
}

/* ---------- Due tasks ---------- */
async function dueTaskReminders(users) {
  let sent = 0;
  for (const u of users) {
    const tz = u.settings.timezone;
    const today = E.dayIn(tz);
    const tomorrow = E.addDays(today, 1);
    const [tasks] = await q().query(
      `SELECT t.id, t.title, t.due_date, r.id AS roadmap_id, r.title AS roadmap_title
       FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE r.user_id = ? AND t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date <= ? AND t.reminded_at IS NULL`,
      [u.id, tomorrow]
    );
    if (!tasks.length) continue;
    const label = (d) => { const s = String(d instanceof Date ? d.toISOString() : d).slice(0, 10); return s < today ? 'overdue' : s === today ? 'due today' : 'due tomorrow'; };
    for (const t of tasks) {
      await E.notify(u.id, { title: `Task ${label(t.due_date)}`, message: `“${t.title}” in ${t.roadmap_title}`, link: `/roadmaps/${t.roadmap_id}`, type: 'due' });
      await q().query('UPDATE tasks SET reminded_at = CURRENT_TIMESTAMP WHERE id = ?', [t.id]);
    }
    if (u.settings.email_reminders) {
      await email(u, 'email_reminders', tasks.length === 1 ? `Reminder: “${tasks[0].title}” is ${label(tasks[0].due_date)}` : `${tasks.length} tasks are due soon`, {
        heading: tasks.length === 1 ? 'A task is due soon' : `${tasks.length} tasks are due soon`,
        intro: `Hi ${u.name.split(' ')[0]}, here’s what’s coming up on your roadmaps.`,
        items: tasks.slice(0, 8).map((t) => ({ title: t.title, meta: `${t.roadmap_title} · ${label(t.due_date)}`, url: `${E.APP_URL()}/roadmaps/${t.roadmap_id}` })),
        cta: { label: 'Open LearnMap', url: `${E.APP_URL()}/dashboard` },
      });
    }
    sent += tasks.length;
  }
  return sent;
}

/* ---------- Nudge after a few quiet days ---------- */
async function inactivityNudges(users) {
  let sent = 0;
  for (const u of users) {
    if (!older(u.settings.last_nudge_at, 24 * 7)) continue;
    const [[{ pending }]] = await q().query(
      `SELECT COUNT(*) AS pending FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id WHERE r.user_id = ? AND t.status <> 'done'`, [u.id]
    );
    if (!Number(pending)) continue;
    const summary = await E.learningSummary(u.id);
    const lastActive = summary.lastActive || String(u.created_at instanceof Date ? u.created_at.toISOString() : u.created_at).slice(0, 10);
    const today = E.dayIn(u.settings.timezone);
    if (lastActive > E.addDays(today, -3)) continue;
    const [next] = await q().query(
      `SELECT t.title, r.id AS roadmap_id, r.title AS roadmap_title FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE r.user_id = ? AND t.status <> 'done' ORDER BY r.id DESC, m.position, t.position LIMIT 1`, [u.id]
    );
    const n = next[0];
    await E.notify(u.id, { title: 'Pick up where you left off', message: n ? `Next up: “${n.title}” — about 30 minutes is enough to keep going.` : 'Your roadmap is waiting.', link: n ? `/roadmaps/${n.roadmap_id}` : '/roadmaps', type: 'nudge' });
    if (u.settings.email_reminders && n) {
      await email(u, 'email_reminders', `Your next step: ${n.title}`, {
        heading: 'Ready for your next step?',
        intro: `Hi ${u.name.split(' ')[0]}, it’s been a few days. One small task keeps your momentum — here’s what’s next on “${n.roadmap_title}”.`,
        items: [{ title: n.title, meta: n.roadmap_title, url: `${E.APP_URL()}/roadmaps/${n.roadmap_id}` }],
        cta: { label: 'Continue learning', url: `${E.APP_URL()}/roadmaps/${n.roadmap_id}` },
      });
    }
    await E.saveSettings(u.id, { last_nudge_at: new Date() });
    sent++;
  }
  return sent;
}

/* ---------- Job matches ---------- */
async function matchesFor(userId, since, min = Number(process.env.JOB_ALERT_MIN_MATCH) || 70) {
  const profile = await loadProfile(userId);
  if (!profile.skills.length && !profile.target_roles.length) return [];
  const [rows] = await q().query(
    `SELECT j.id, j.title, j.company, j.location, j.remote, j.skills, j.description FROM jobs j
     LEFT JOIN job_applications a ON a.job_id = j.id AND a.user_id = ?
     WHERE j.user_id IS NULL AND a.id IS NULL AND j.fetched_at >= ? LIMIT 2000`, [userId, since]
  );
  const custom = customSkills(profile.skills);
  return rows.map((j) => {
    let skills = parse(j.skills, []);
    const hits = custom.filter((k) => mentions(`${j.title}\n${j.description || ''}`, k));
    skills = [...skills, ...hits.filter((k) => !skills.includes(k))];
    return { ...j, match: matchJob({ title: j.title, skills }, profile).score || 0 };
  }).filter((j) => j.match >= min).filter((j) => !profile.remote_only || Number(j.remote)).sort((a, b) => b.match - a.match);
}

async function jobAlerts(users) {
  let sent = 0;
  for (const u of users) {
    if (!older(u.settings.last_job_alert_at, 20)) continue;
    const since = u.settings.last_job_alert_at ? sqlTime(new Date(u.settings.last_job_alert_at)) : HOURS(72);
    const jobs = (await matchesFor(u.id, since)).slice(0, 5);
    await E.saveSettings(u.id, { last_job_alert_at: new Date() });
    if (!jobs.length) continue;
    await E.notify(u.id, { title: jobs.length > 1 ? `${jobs.length} new jobs match you` : '1 new job matches you', message: `Top match: ${jobs[0].title}${jobs[0].company ? ` at ${jobs[0].company}` : ''} (${jobs[0].match}%)`, link: '/jobs', type: 'jobs' });
    if (u.settings.email_job_alerts) {
      await email(u, 'email_job_alerts', `${jobs.length} new job${jobs.length > 1 ? 's' : ''} that match your skills`, {
        heading: 'New jobs that match you',
        intro: `Hi ${u.name.split(' ')[0]}, these roles were posted recently and fit your skills well.`,
        items: jobs.map((j) => ({ title: `${j.title}${j.company ? ` — ${j.company}` : ''}`, meta: `${j.match}% match${j.location ? ` · ${j.location}` : ''}`, url: `${E.APP_URL()}/jobs/${j.id}` })),
        cta: { label: 'See all matches', url: `${E.APP_URL()}/jobs` },
      });
    }
    sent++;
  }
  return sent;
}

/* ---------- Follow-ups ---------- */
async function followUps(users) {
  let sent = 0;
  for (const u of users) {
    const [apps] = await q().query(
      `SELECT id, job_title, company, job_id FROM job_applications
       WHERE user_id = ? AND status = 'applied' AND applied_at IS NOT NULL AND applied_at <= ? AND followup_sent_at IS NULL`,
      [u.id, HOURS(24 * 7)]
    );
    if (!apps.length) continue;
    for (const a of apps) {
      await E.notify(u.id, { title: 'Time to follow up?', message: `It’s been a week since you applied to ${a.job_title}${a.company ? ` at ${a.company}` : ''}. A short, polite note to the recruiter can help.`, link: '/applications', type: 'followup' });
      await q().query('UPDATE job_applications SET followup_sent_at = CURRENT_TIMESTAMP WHERE id = ?', [a.id]);
    }
    if (u.settings.email_followups) {
      await email(u, 'email_followups', apps.length === 1 ? `Follow up on ${apps[0].job_title}?` : `Follow up on ${apps.length} applications?`, {
        heading: 'A week since you applied',
        intro: 'Recruiters get many applications. A short, polite follow-up (2–3 sentences: your interest, one strength, thanks) can move you up the pile.',
        items: apps.map((a) => ({ title: a.job_title, meta: a.company || '', url: `${E.APP_URL()}/applications` })),
        cta: { label: 'Open your tracker', url: `${E.APP_URL()}/applications` },
      });
    }
    sent += apps.length;
  }
  return sent;
}

/* ---------- Interviews coming up ---------- */
async function interviewReminders(users) {
  let sent = 0;
  for (const u of users) {
    const [apps] = await q().query(
      `SELECT id, job_title, company, interview_at, job_id FROM job_applications
       WHERE user_id = ? AND interview_at IS NOT NULL AND interview_reminded_at IS NULL`, [u.id]
    );
    const soon = apps.filter((a) => { const t = new Date(a.interview_at).getTime(); return t > Date.now() && t - Date.now() <= 26 * 3600000; });
    for (const a of soon) {
      const when = new Date(a.interview_at).toLocaleString('en-US', { timeZone: E.validTz(u.settings.timezone) ? u.settings.timezone : 'UTC', weekday: 'short', hour: 'numeric', minute: '2-digit' });
      const practice = a.job_id ? `/interview?job=${a.job_id}` : '/interview';
      await E.notify(u.id, { title: `Interview ${when}`, message: `${a.job_title}${a.company ? ` at ${a.company}` : ''}. A 10-minute mock interview now is the best prep.`, link: practice, type: 'interview' });
      if (u.settings.email_reminders) {
        await email(u, 'email_reminders', `Your interview for ${a.job_title} is ${when}`, {
          heading: `Interview ${when}`,
          intro: `Good luck with ${a.job_title}${a.company ? ` at ${a.company}` : ''}! Warm up with a quick mock interview tailored to this job.`,
          items: [{ title: 'Practice with an AI mock interview', meta: '5 questions · feedback on every answer', url: `${E.APP_URL()}${practice}` }],
          cta: { label: 'Practice now', url: `${E.APP_URL()}${practice}` },
        });
      }
      await q().query('UPDATE job_applications SET interview_reminded_at = CURRENT_TIMESTAMP WHERE id = ?', [a.id]);
      sent++;
    }
  }
  return sent;
}

/* ---------- Weekly summary ---------- */
async function weeklyDigests(users, { force = false } = {}) {
  let sent = 0;
  for (const u of users) {
    const tz = u.settings.timezone;
    if (!force && (E.weekdayIn(tz) !== 'Mon' || E.hourIn(tz) < 9 || !older(u.settings.last_digest_at, 24 * 6))) continue;
    const s = await E.learningSummary(u.id);
    const [next] = await q().query(
      `SELECT t.title, r.id AS roadmap_id, r.title AS roadmap_title FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE r.user_id = ? AND t.status <> 'done' ORDER BY r.id DESC, m.position, t.position LIMIT 3`, [u.id]
    );
    const jobs = (await matchesFor(u.id, HOURS(24 * 7))).slice(0, 3);
    await E.saveSettings(u.id, { last_digest_at: new Date() });
    if (!s.week && !next.length && !jobs.length) continue;
    const headline = s.week ? `You finished ${s.week} task${s.week > 1 ? 's' : ''} last week` : 'A fresh week to make progress';
    await E.notify(u.id, { title: 'Your weekly summary', message: `${headline}.${s.streak ? ` ${s.streak}-day learning streak.` : ''}${jobs.length ? ` ${jobs.length} strong job match${jobs.length > 1 ? 'es' : ''}.` : ''}`, link: '/dashboard', type: 'digest' });
    if (u.settings.email_weekly) {
      await email(u, 'email_weekly', headline, {
        heading: headline,
        intro: `${s.streak ? `You’re on a ${s.streak}-day learning streak. ` : ''}Here’s your plan for this week${jobs.length ? ' and a few jobs worth a look' : ''}.`,
        items: [
          ...next.map((t) => ({ title: t.title, meta: `Next up · ${t.roadmap_title}`, url: `${E.APP_URL()}/roadmaps/${t.roadmap_id}` })),
          ...jobs.map((j) => ({ title: `${j.title}${j.company ? ` — ${j.company}` : ''}`, meta: `${j.match}% match`, url: `${E.APP_URL()}/jobs/${j.id}` })),
        ],
        cta: { label: 'Open your dashboard', url: `${E.APP_URL()}/dashboard` },
      });
    }
    sent++;
  }
  return sent;
}

/* ---------- "Time to study" (the weekly study schedule) ---------- */
// The scheduler runs hourly, so each session gets one reminder sometime in the hour before it.
const minutesIn = (tz, date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: E.validTz(tz) ? tz : 'UTC', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return (get('hour') % 24) * 60 + get('minute');
};
async function studyReminders(users, now = new Date()) {
  const S = require('./studySchedule');
  let sent = 0;
  for (const u of users) {
    const sched = S.parseSchedule(u.settings);
    if (!sched.active || !sched.remind) continue;
    const tz = u.settings.timezone;
    const today = E.dayIn(tz, now);
    if (u.settings.last_study_ping === today || !sched.days.includes(S.weekdayOf(today))) continue;
    const [hh, mm] = sched.time.split(':').map(Number);
    const until = hh * 60 + mm - minutesIn(tz, now);
    if (until < 0 || until >= 60) continue;
    const [[next]] = await q().query(
      `SELECT t.title, r.id AS roadmap_id, r.title AS roadmap_title FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE r.user_id = ? AND t.status <> 'done' ORDER BY (t.due_date IS NULL), t.due_date, r.created_at DESC, m.order_index, t.created_at LIMIT 1`, [u.id]
    ).catch(() => [[null]]);
    await E.notify(u.id, {
      title: until <= 5 ? 'Time to study' : `Study session at ${sched.time}`,
      message: next ? `Next up: “${next.title}” in ${next.roadmap_title}` : 'Pick a roadmap and keep going.',
      link: next ? `/roadmaps/${next.roadmap_id}` : '/calendar', type: 'study',
    });
    await E.saveSettings(u.id, { last_study_ping: today });
    sent++;
  }
  return sent;
}

let running = false;
async function runScheduler(opts = {}) {
  if (running) return null;
  running = true;
  const out = {};
  try {
    const users = await usersWithSettings();
    for (const [name, fn] of Object.entries({ due: dueTaskReminders, interviews: interviewReminders, study: studyReminders, nudges: inactivityNudges, jobAlerts, followUps, digests: (us) => weeklyDigests(us, opts) })) {
      try { out[name] = await fn(users); } catch (err) { out[name] = `error: ${err.message}`; console.warn(`[scheduler] ${name}: ${err.message}`); }
    }
    const total = Object.values(out).filter((v) => typeof v === 'number').reduce((a, b) => a + b, 0);
    if (total) console.log(`[scheduler] ${Object.entries(out).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  } finally {
    running = false;
  }
  return out;
}

function startScheduler() {
  if (process.env.DISABLE_SCHEDULER === '1') return;
  setTimeout(() => runScheduler().catch(() => {}), 60 * 1000);
  setInterval(() => runScheduler().catch(() => {}), 60 * 60 * 1000).unref();
}

module.exports = { runScheduler, startScheduler, studyReminders };
