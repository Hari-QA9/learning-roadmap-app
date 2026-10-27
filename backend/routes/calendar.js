// Calendar: a private subscription link (iCal feed) with task due dates and interview dates,
// so they appear in Google Calendar / Outlook / Apple Calendar and stay up to date.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { buildICS } = require('../lib/ics');
const E = require('../lib/engagement');

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
    const events = [
      ...tasks.map((t) => ({ uid: `task-${t.id}@learnmap`, allDay: ymd(t.due_date), title: `Due: ${t.title}`, description: `Roadmap: ${t.roadmap_title}`, url: `${app}/roadmaps/${t.roadmap_id}` })),
      ...apps.map((a) => {
        const start = new Date(a.interview_at);
        return { uid: `interview-${a.id}@learnmap`, start, end: new Date(start.getTime() + 3600000), title: `Interview: ${a.job_title}${a.company ? ` — ${a.company}` : ''}`, description: [a.next_step, 'Practice first with a LearnMap mock interview.'].filter(Boolean).join('\n'), url: `${app}/applications`, location: a.location || '', alarmMinutes: 60 };
      }),
    ];
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="learnmap.ics"');
    res.setHeader('Cache-Control', 'private, max-age=900');
    res.end(buildICS(events, 'LearnMap'));
  } catch (err) {
    console.error('[calendar] feed', err.message);
    res.status(500).json({ message: 'Could not build the calendar.' });
  }
});

module.exports = router;
