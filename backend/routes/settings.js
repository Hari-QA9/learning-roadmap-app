// Member settings (emails, daily goal, time zone), today's progress, onboarding, unsubscribe.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { normaliseSkills } = require('../lib/skills');
const E = require('../lib/engagement');

const q = () => db.promise();
const toBool = (v) => (v ? 1 : 0);

router.get('/', auth, async (req, res) => {
  try {
    const s = await E.getSettings(req.user.id);
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM roadmaps WHERE user_id = ?', [req.user.id]);
    const [cp] = await q().query('SELECT user_id FROM career_profiles WHERE user_id = ?', [req.user.id]).catch(() => [[]]);
    // Existing members who already set things up don't need onboarding.
    const needsOnboarding = !Number(s.onboarded) && Number(n) === 0 && !cp.length;
    res.json({
      email_weekly: !!Number(s.email_weekly), email_reminders: !!Number(s.email_reminders),
      email_job_alerts: !!Number(s.email_job_alerts), email_followups: !!Number(s.email_followups),
      daily_goal: Number(s.daily_goal) || 1, timezone: s.timezone, field: s.field, needsOnboarding,
      emailEnabled: require('../lib/mailer').emailConfigured(),
    });
  } catch (err) {
    console.error('[settings] get', err.message);
    res.status(500).json({ message: 'Could not load your settings.' });
  }
});

router.put('/', auth, async (req, res) => {
  const b = req.body || {};
  const patch = {};
  for (const k of E.EMAIL_TYPES) if (b[k] !== undefined) patch[k] = toBool(b[k]);
  if (b.daily_goal !== undefined) patch.daily_goal = Math.min(10, Math.max(1, parseInt(b.daily_goal, 10) || 1));
  if (b.timezone !== undefined && E.validTz(b.timezone)) patch.timezone = String(b.timezone).slice(0, 64);
  try {
    await E.saveSettings(req.user.id, patch);
    res.json({ message: 'Saved' });
  } catch (err) {
    console.error('[settings] save', err.message);
    res.status(500).json({ message: 'Could not save your settings.' });
  }
});

// Today's progress: streak, goal, last 7 days, tasks due soon.
router.get('/today', auth, async (req, res) => {
  try {
    const summary = await E.learningSummary(req.user.id);
    const tomorrow = E.addDays(summary.todayDate, 1);
    const [due] = await q().query(
      `SELECT t.id, t.title, t.due_date, r.id AS roadmap_id, r.title AS roadmap_title
       FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE r.user_id = ? AND t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date <= ?
       ORDER BY t.due_date LIMIT 5`, [req.user.id, E.addDays(tomorrow, 5)]
    );
    res.json({ ...summary, due: due.map((t) => ({ ...t, due_date: String(t.due_date instanceof Date ? t.due_date.toISOString() : t.due_date).slice(0, 10) })) });
  } catch (err) {
    console.error('[settings] today', err.message);
    res.status(500).json({ message: 'Could not load today’s progress.' });
  }
});

// Onboarding: field, goal, target role, skills, level, hours → career profile + starter resume.
router.post('/onboarding', auth, async (req, res) => {
  const b = req.body || {};
  const roles = String(b.target_role || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const skills = normaliseSkills(b.skills || '').slice(0, 40);
  try {
    if (roles.length || skills.length) {
      const [has] = await q().query('SELECT user_id FROM career_profiles WHERE user_id = ?', [req.user.id]);
      const vals = [JSON.stringify(roles), JSON.stringify(skills), String(b.level || '').slice(0, 30)];
      if (has.length) await q().query('UPDATE career_profiles SET target_roles = ?, skills = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [...vals, req.user.id]);
      else await q().query('INSERT INTO career_profiles (target_roles, skills, level, user_id) VALUES (?, ?, ?, ?)', [...vals, req.user.id]);
    }
    // Start a resume with what they told us, unless they already have one.
    const [r] = await q().query('SELECT id FROM user_resumes WHERE user_id = ?', [req.user.id]);
    if (!r.length && (roles.length || skills.length)) {
      const [u] = await q().query('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
      const resume = {
        version: 2,
        contact: { name: u[0]?.name || '', headline: roles[0] || '', email: u[0]?.email || '', phone: '', location: '', linkedin: '', website: '' },
        summary: '', skills: [{ id: 's1', group: '', items: skills.join(', ') }],
        experience: [], projects: [], education: [], certifications: [], research: [], publications: [], volunteer: [], awards: [],
        kind: 'resume', order: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications'], hidden: [], template: 'classic', paper: 'letter', includeLearnMapCerts: true,
      };
      await q().query('INSERT INTO user_resumes (user_id, resume_data) VALUES (?, ?)', [req.user.id, JSON.stringify(resume)]);
    }
    const patch = { onboarded: 1, field: String(b.field || '').slice(0, 60) || null };
    if (b.timezone && E.validTz(b.timezone)) patch.timezone = b.timezone;
    if (b.hours) patch.daily_goal = Number(b.hours) >= 10 ? 2 : 1;
    await E.saveSettings(req.user.id, patch);
    res.json({ message: 'All set' });
  } catch (err) {
    console.error('[settings] onboarding', err.message);
    res.status(500).json({ message: 'Could not save your answers.' });
  }
});

router.post('/onboarding/skip', auth, async (req, res) => {
  try {
    await E.saveSettings(req.user.id, { onboarded: 1, ...(E.validTz(req.body?.timezone) ? { timezone: req.body.timezone } : {}) });
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ message: 'Could not save.' });
  }
});

// One-click unsubscribe from an email (no login needed; link is signed).
router.get('/unsubscribe', async (req, res) => {
  const userId = parseInt(req.query.u, 10);
  const type = String(req.query.t || '');
  const page = (title, body) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f7;color:#1d1d1f;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">
<div style="background:#fff;border-radius:16px;padding:32px;max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">${title}</h1><p style="color:#6e6e73;line-height:1.5;margin:0 0 20px">${body}</p>
<a href="${E.APP_URL()}/profile" style="color:#0071e3;text-decoration:none">Manage email settings</a></div></body>`); };
  try {
    if (!userId || !E.validUnsubscribe(userId, type, String(req.query.k || ''))) return page('Link not valid', 'This unsubscribe link is invalid or incomplete. You can change email settings in your profile.');
    await E.saveSettings(userId, { [type]: 0 });
    const names = { email_weekly: 'weekly summary', email_reminders: 'reminder', email_job_alerts: 'job alert', email_followups: 'follow-up' };
    page('You’re unsubscribed', `You won’t get ${names[type]} emails anymore. You can turn them back on any time.`);
  } catch (err) {
    page('Something went wrong', 'Please try again, or change your email settings in your profile.');
  }
});

// Test-only: run the hourly jobs now (enable with ENABLE_TEST_ROUTES=1).
if (process.env.ENABLE_TEST_ROUTES === '1') {
  router.post('/run-scheduler', auth, async (req, res) => {
    res.json(await require('../lib/scheduler').runScheduler({ force: !!req.body?.force }));
  });
}

module.exports = router;
