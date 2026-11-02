// Calendar: a private subscription link (iCal feed) with task due dates, interviews and your
// weekly study sessions, so they appear in Google Calendar / Outlook / Apple Calendar and stay
// up to date — plus the in-app calendar (events, study schedule, auto-planning).
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { buildICS } = require('../lib/ics');
const E = require('../lib/engagement');
const { ownRoadmap } = require('../lib/ownership');
const S = require('../lib/studySchedule');

const q = () => db.promise();
const API = require('../lib/security').publicApiUrl;
const feedUrl = (token) => `${API()}/calendar/feed/${token}.ics`;
const ymd = (d) => String(d instanceof Date ? d.toISOString() : d).slice(0, 10);

async function tokenFor(userId, reset = false) {
  const s = await E.getSettings(userId);
  if (s.calendar_token && !reset) return s.calendar_token;
  const token = crypto.randomBytes(24).toString('hex');
  await E.saveSettings(userId, { calendar_token: token });
  return token;
}

router.get('/link', auth, async (req, res) => {
  try {
    const url = feedUrl(await tokenFor(req.user.id));
    res.json({ url, webcal: url.replace(/^https?:/, 'webcal:'), isLocal: /localhost|127\.0\.0\.1/.test(url) });
  } catch (err) {
    console.error('[calendar] link', err.message);
    res.status(500).json({ message: 'Could not create your calendar link.' });
  }
});

// New link (the old one stops working) — e.g. if it was shared by mistake.
router.post('/link/reset', auth, async (req, res) => {
  try {
    const url = feedUrl(await tokenFor(req.user.id, true));
    res.json({ url, webcal: url.replace(/^https?:/, 'webcal:'), isLocal: /localhost|127\.0\.0\.1/.test(url) });
  } catch (err) {
    res.status(500).json({ message: 'Could not reset your calendar link.' });
  }
});

// The feed itself (no login — the long random token is the key).
router.get('/feed/:token', async (req, res) => {
  const token = String(req.params.token || '').replace(/\.ics$/, '');
  if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).json({ message: 'Not found' });
  try {
    const [rows] = await q().query('SELECT user_id FROM user_settings WHERE calendar_token = ?', [token]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const userId = rows[0].user_id;
    const app = E.APP_URL();
    const [tasks] = await q().query(
      `SELECT t.id, t.title, t.due_date, r.id AS roadmap_id, r.title AS roadmap_title
       FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE r.user_id = ? AND t.status <> 'done' AND t.due_date IS NOT NULL`, [userId]
    );
    const [apps] = await q().query(
      `SELECT id, job_title, company, interview_at, location, next_step, url FROM job_applications
       WHERE user_id = ? AND interview_at IS NOT NULL AND status IN ('applied', 'interviewing', 'offer')`, [userId]
    );
    const settings = await E.getSettings(userId);
    const sched = S.parseSchedule(settings);
    const study = [];
    if (sched.active) {
      const tz = E.validTz(settings.timezone) ? settings.timezone : null;
      const first = S.nextStudyDay(E.dayIn(settings.timezone), sched.days);
      study.push({
        uid: `study-${userId}@learnmap`, local: { ...S.localRange(first, sched.time, sched.minutes), tz },
        rrule: `FREQ=WEEKLY;BYDAY=${sched.days.map((d) => S.BYDAY[d]).join(',')}`,
        title: 'Study time — Learnvoy', description: 'Your weekly study session. Open Learnvoy to see what’s next.', url: `${app}/calendar`, alarmMinutes: 10,
      });
    }
    const events = [
      ...study,
      ...tasks.map((t) => ({ uid: `task-${t.id}@learnmap`, allDay: ymd(t.due_date), title: `Due: ${t.title}`, description: `Roadmap: ${t.roadmap_title}`, url: `${app}/roadmaps/${t.roadmap_id}` })),
      ...apps.map((a) => {
        const start = new Date(a.interview_at);
        return { uid: `interview-${a.id}@learnmap`, start, end: new Date(start.getTime() + 3600000), title: `Interview: ${a.job_title}${a.company ? ` — ${a.company}` : ''}`, description: [a.next_step, 'Practice first with a Learnvoy mock interview.'].filter(Boolean).join('\n'), url: `${app}/applications`, location: a.location || '', alarmMinutes: 60 };
      }),
    ];
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="learnvoy.ics"');
    res.setHeader('Cache-Control', 'private, max-age=900');
    res.end(buildICS(events, 'Learnvoy'));
  } catch (err) {
    console.error('[calendar] feed', err.message);
    res.status(500).json({ message: 'Could not build the calendar.' });
  }
});

/* ---------- In-app calendar ---------- */
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Weekly study schedule
router.get('/schedule', auth, async (req, res) => {
  try {
    const s = await E.getSettings(req.user.id);
    res.json({ ...S.parseSchedule(s), timezone: s.timezone });
  } catch (err) {
    res.status(500).json({ message: 'Could not load your study schedule.' });
  }
});

router.put('/schedule', auth, async (req, res) => {
  const v = S.validateSchedule(req.body || {});
  if (v.error) return res.status(400).json({ message: v.error });
  try {
    const s = await E.saveSettings(req.user.id, v.patch);
    const out = S.parseSchedule(s);
    res.json({ ...out, timezone: s.timezone, message: out.active ? 'Study schedule saved' : 'Study schedule turned off' });
  } catch (err) {
    console.error('[calendar] schedule', err.message);
    res.status(500).json({ message: 'Could not save your study schedule.' });
  }
});

// Everything dated between `from` and `to` (at most ~6 weeks): task due dates, interviews,
// plus overdue tasks, the study schedule and how many open tasks still have no date.
router.get('/events', auth, async (req, res) => {
  const { from, to } = req.query;
  if (!YMD.test(String(from)) || !YMD.test(String(to)) || from > to) return res.status(400).json({ message: 'Pick a date range.' });
  if (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`) > 62 * 86400000) return res.status(400).json({ message: 'Pick a shorter date range.' });
  try {
    const uid = req.user.id;
    const settings = await E.getSettings(uid);
    const today = E.dayIn(settings.timezone);
    const base = `SELECT t.id, t.title, t.status, t.due_date, t.priority, r.id AS roadmap_id, r.title AS roadmap_title
      FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id WHERE r.user_id = ?`;
    const [tasks] = await q().query(`${base} AND t.due_date IS NOT NULL AND t.due_date BETWEEN ? AND ? ORDER BY t.due_date, t.id`, [uid, from, to]);
    const [overdue] = await q().query(`${base} AND t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date < ? ORDER BY t.due_date, t.id LIMIT 50`, [uid, today]);
    const [[{ undated }]] = await q().query(`SELECT COUNT(*) AS undated FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
      WHERE r.user_id = ? AND t.status <> 'done' AND t.due_date IS NULL`, [uid]);
    const [apps] = await q().query(`SELECT id, job_title, company, interview_at, location FROM job_applications
      WHERE user_id = ? AND interview_at IS NOT NULL AND status IN ('applied', 'interviewing', 'offer')`, [uid]);
    const fix = (t) => ({ ...t, due_date: ymd(t.due_date) });
    res.json({
      today,
      tasks: tasks.map(fix),
      overdue: overdue.map(fix),
      interviews: apps.filter((a) => { const d = String(a.interview_at).slice(0, 10); return d >= from && d <= to; }),
      schedule: S.parseSchedule(settings),
      undated: Number(undated),
    });
  } catch (err) {
    console.error('[calendar] events', err.message);
    res.status(500).json({ message: 'Could not load your calendar.' });
  }
});

// Spread a roadmap's open, undated tasks over your study days (a few per session), in order.
router.post('/plan', auth, async (req, res) => {
  const roadmapId = parseInt(req.body?.roadmap_id, 10);
  const perDay = Math.min(5, Math.max(1, parseInt(req.body?.per_day, 10) || 1));
  try {
    const roadmap = roadmapId && (await ownRoadmap(roadmapId, req.user.id));
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });
    const settings = await E.getSettings(req.user.id);
    const sched = S.parseSchedule(settings);
    const today = E.dayIn(settings.timezone);
    const start = YMD.test(String(req.body?.start || '')) && req.body.start >= today ? req.body.start : today;
    const [open] = await q().query(
      `SELECT t.id FROM tasks t JOIN modules m ON m.id = t.module_id
       WHERE m.roadmap_id = ? AND t.status <> 'done' AND t.due_date IS NULL
       ORDER BY m.order_index, m.id, t.created_at, t.id LIMIT 300`, [roadmapId]
    );
    if (!open.length) return res.status(400).json({ message: 'Every open task in this roadmap already has a date.' });
    let day = S.nextStudyDay(start, sched.days);
    const planned = [];
    for (let i = 0; i < open.length; i++) {
      if (i && i % perDay === 0) day = S.nextStudyDay(E.addDays(day, 1), sched.days);
      planned.push({ id: open[i].id, due: day });
    }
    for (const p of planned) await q().query('UPDATE tasks SET due_date = ?, reminded_at = NULL WHERE id = ?', [p.due, p.id]);
    res.json({
      scheduled: planned.length, first: planned[0].due, last: planned[planned.length - 1].due, task_ids: planned.map((p) => p.id),
      message: `${planned.length} task${planned.length === 1 ? '' : 's'} planned through ${planned[planned.length - 1].due}`,
    });
  } catch (err) {
    console.error('[calendar] plan', err.message);
    res.status(500).json({ message: 'Could not plan this roadmap.' });
  }
});

// Undo a plan: clear the dates it set (only on your own tasks).
router.post('/plan/undo', auth, async (req, res) => {
  const ids = (Array.isArray(req.body?.task_ids) ? req.body.task_ids : []).map((x) => parseInt(x, 10)).filter((x) => x > 0).slice(0, 300);
  if (!ids.length) return res.status(400).json({ message: 'Nothing to undo.' });
  try {
    const [r] = await q().query(
      `UPDATE tasks SET due_date = NULL, reminded_at = NULL WHERE id IN (?) AND module_id IN
         (SELECT m.id FROM modules m JOIN roadmaps rm ON rm.id = m.roadmap_id WHERE rm.user_id = ?)`, [ids, req.user.id]
    );
    res.json({ cleared: r.affectedRows ?? ids.length, message: 'Plan undone' });
  } catch (err) {
    console.error('[calendar] undo', err.message);
    res.status(500).json({ message: 'Could not undo the plan.' });
  }
});

module.exports = router;
