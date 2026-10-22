// Member settings, learning activity (streaks, daily goal), in-app notifications
// and the shared email layout used by reminders and digests.
require('dotenv').config();
const crypto = require('crypto');
const db = require('../db');

const q = () => db.promise();
const APP_URL = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_URL = () => (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}/api`).replace(/\/$/, '');

/* ---------- Settings ---------- */
const DEFAULTS = {
  email_weekly: 1, email_reminders: 1, email_job_alerts: 1, email_followups: 1,
  daily_goal: 1, timezone: 'America/New_York', onboarded: 0, field: null,
};
const EMAIL_TYPES = ['email_weekly', 'email_reminders', 'email_job_alerts', 'email_followups'];

async function getSettings(userId) {
  const [rows] = await q().query('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  return { ...DEFAULTS, ...(rows[0] || {}), exists: !!rows[0] };
}

async function saveSettings(userId, patch) {
  const allowed = ['email_weekly', 'email_reminders', 'email_job_alerts', 'email_followups', 'daily_goal', 'timezone', 'onboarded', 'field',
    'last_digest_at', 'last_nudge_at', 'last_job_alert_at', 'calendar_token'];
  const keys = Object.keys(patch).filter((k) => allowed.includes(k));
  if (!keys.length) return getSettings(userId);
  const [has] = await q().query('SELECT user_id FROM user_settings WHERE user_id = ?', [userId]);
  if (has.length) {
    await q().query(`UPDATE user_settings SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE user_id = ?`, [...keys.map((k) => patch[k]), userId]);
  } else {
    await q().query(`INSERT INTO user_settings (user_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`, [userId, ...keys.map((k) => patch[k])]);
  }
  return getSettings(userId);
}

/* ---------- Dates in the member's own time zone ---------- */
function validTz(tz) {
  try { Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
/** YYYY-MM-DD for `date` in time zone `tz`. */
function dayIn(tz, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: validTz(tz) ? tz : 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function hourIn(tz, date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: validTz(tz) ? tz : 'UTC', hour: 'numeric', hour12: false }).format(date)) % 24;
}
function weekdayIn(tz, date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: validTz(tz) ? tz : 'UTC', weekday: 'short' }).format(date); // Mon, Tue…
}
const addDays = (ymd, n) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/* ---------- Learning activity ---------- */
async function recordTaskDone(userId) {
  const s = await getSettings(userId);
  const day = dayIn(s.timezone);
  const [has] = await q().query('SELECT id FROM activity_days WHERE user_id = ? AND day = ?', [userId, day]);
  if (has.length) await q().query('UPDATE activity_days SET tasks_done = tasks_done + 1 WHERE id = ?', [has[0].id]);
  else await q().query('INSERT INTO activity_days (user_id, day, tasks_done) VALUES (?, ?, 1)', [userId, day]);
  // Keep the stored streak in sync (badges read it).
  const { streak } = await learningSummary(userId);
  await q().query('UPDATE user_stats SET streak_days = ? WHERE user_id = ?', [streak, userId]).catch(() => {});
}

/** Streak = days in a row with at least one task finished, ending today (or yesterday, so it isn't lost before you study today). */
async function learningSummary(userId) {
  const s = await getSettings(userId);
  const today = dayIn(s.timezone);
  const [rows] = await q().query('SELECT day, tasks_done FROM activity_days WHERE user_id = ? AND tasks_done > 0 ORDER BY day DESC LIMIT 400', [userId]);
  const days = new Map(rows.map((r) => [String(r.day instanceof Date ? r.day.toISOString() : r.day).slice(0, 10), Number(r.tasks_done)]));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
  let week = 0;
  for (let i = 0; i < 7; i++) week += days.get(addDays(today, -i)) || 0;
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { day: d, done: days.get(d) || 0 }; });
  const lastActive = rows[0] ? String(rows[0].day instanceof Date ? rows[0].day.toISOString() : rows[0].day).slice(0, 10) : null;
  return { streak, today: days.get(today) || 0, goal: Number(s.daily_goal) || 1, week, last7, lastActive, todayDate: today };
}

/* ---------- In-app notifications ---------- */
async function notify(userId, { title, message, link = null, type = null }) {
  try {
    await q().query('INSERT INTO notifications (user_id, title, message, link, type) VALUES (?, ?, ?, ?, ?)', [userId, String(title).slice(0, 255), String(message || ''), link, type]);
  } catch {
    // Older databases without link/type columns.
    await q().query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [userId, String(title).slice(0, 255), String(message || '')]).catch(() => {});
  }
}

/* ---------- Email unsubscribe links ---------- */
const sign = (userId, type) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'learnmap').update(`${userId}:${type}`).digest('hex').slice(0, 32);
const unsubscribeUrl = (userId, type) => `${API_URL()}/settings/unsubscribe?u=${userId}&t=${encodeURIComponent(type)}&k=${sign(userId, type)}`;
const validUnsubscribe = (userId, type, key) => EMAIL_TYPES.includes(type) && typeof key === 'string' && key.length === 32 && crypto.timingSafeEqual(Buffer.from(sign(userId, type)), Buffer.from(key));

/* ---------- Email layout ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Builds a simple, readable email (works in Gmail/Outlook dark and light).
 * items: [{ title, meta, url }]
 */
function emailLayout({ heading, intro, items = [], cta, footerNote, unsubscribe }) {
  const app = APP_URL();
  const text = [
    heading, '', intro, '',
    ...items.map((i) => `• ${i.title}${i.meta ? ` — ${i.meta}` : ''}${i.url ? `\n  ${i.url}` : ''}`),
    items.length ? '' : null,
    cta ? `${cta.label}: ${cta.url}` : null,
    '', footerNote || 'You get this email because you have a LearnMap account.',
    unsubscribe ? `Turn off these emails: ${unsubscribe}` : null,
    `Manage all email settings: ${app}/profile`,
  ].filter((x) => x !== null).join('\n');

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px 28px">
<tr><td style="font-size:13px;font-weight:600;color:#0071e3;letter-spacing:.02em">LearnMap</td></tr>
<tr><td style="padding-top:10px;font-size:22px;font-weight:700;line-height:1.25">${esc(heading)}</td></tr>
<tr><td style="padding-top:10px;font-size:15px;line-height:1.55;color:#424245">${esc(intro)}</td></tr>
${items.length ? `<tr><td style="padding-top:18px">${items.map((i) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e8e8ed"><tr><td style="padding:12px 0">
<a href="${esc(i.url || app)}" style="font-size:15px;font-weight:600;color:#1d1d1f;text-decoration:none">${esc(i.title)}</a>
${i.meta ? `<div style="font-size:13px;color:#6e6e73;padding-top:2px">${esc(i.meta)}</div>` : ''}</td></tr></table>`).join('')}</td></tr>` : ''}
${cta ? `<tr><td style="padding-top:22px"><a href="${esc(cta.url)}" style="display:inline-block;background:#0071e3;color:#ffffff;font-size:15px;font-weight:600;padding:11px 20px;border-radius:980px;text-decoration:none">${esc(cta.label)}</a></td></tr>` : ''}
<tr><td style="padding-top:28px;font-size:12px;line-height:1.5;color:#86868b">${esc(footerNote || 'You get this email because you have a LearnMap account.')}<br>
${unsubscribe ? `<a href="${esc(unsubscribe)}" style="color:#86868b">Turn off these emails</a> · ` : ''}<a href="${esc(app)}/profile" style="color:#86868b">Email settings</a></td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

module.exports = {
  getSettings, saveSettings, EMAIL_TYPES, dayIn, hourIn, weekdayIn, addDays, validTz,
  recordTaskDone, learningSummary, notify, unsubscribeUrl, validUnsubscribe, emailLayout, APP_URL,
};
