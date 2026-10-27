// Weekly numbers for challenges, buddies, groups and the leaderboard.
// A week runs Monday–Sunday in the viewer's time zone.
const db = require('../db');
const { getSettings, dayIn, addDays, learningSummary } = require('./engagement');

const q = () => db.promise();

async function weekOf(userId) {
  const s = await getSettings(userId).catch(() => ({ timezone: 'America/New_York' }));
  const today = dayIn(s.timezone);
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return { today, start: addDays(today, -dow), end: addDays(today, 6 - dow), daysLeft: 6 - dow, timezone: s.timezone, goal: Number(s.daily_goal) || 1 };
}

const toDay = (v) => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);

/** Points: 10 per task, 1 per focused minute, 1 per card reviewed, 50 per challenge completed. */
const points = (s) => s.tasks * 10 + s.focus + s.reviews + s.challenges * 50;

/** This week's activity for several members at once. */
async function weekStats(userIds, start, { withStreak = false } = {}) {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map(ids.map((id) => [id, { tasks: 0, focus: 0, reviews: 0, challenges: 0, activeDays: 0, streak: 0 }]));
  if (!ids.length) return out;
  const safe = async (sql, params) => { try { const [r] = await q().query(sql, params); return r; } catch { return []; } };
  for (const r of await safe('SELECT user_id, day, tasks_done FROM activity_days WHERE user_id IN (?) AND day >= ?', [ids, start])) {
    const s = out.get(r.user_id); if (!s) continue;
    s.tasks += Number(r.tasks_done) || 0; if (Number(r.tasks_done) > 0) s.activeDays += 1;
  }
  for (const r of await safe('SELECT user_id, SUM(minutes) AS m FROM study_sessions WHERE user_id IN (?) AND day >= ? GROUP BY user_id', [ids, start])) {
    if (out.get(r.user_id)) out.get(r.user_id).focus = Number(r.m) || 0;
  }
  for (const r of await safe('SELECT user_id, SUM(reviews) AS n FROM review_days WHERE user_id IN (?) AND day >= ? GROUP BY user_id', [ids, start])) {
    if (out.get(r.user_id)) out.get(r.user_id).reviews = Number(r.n) || 0;
  }
  for (const r of await safe('SELECT user_id, COUNT(*) AS n FROM challenge_claims WHERE user_id IN (?) AND week = ? GROUP BY user_id', [ids, start])) {
    if (out.get(r.user_id)) out.get(r.user_id).challenges = Number(r.n) || 0;
  }
  if (withStreak) {
    for (const id of ids) {
      const l = await learningSummary(id).catch(() => null);
      if (l) Object.assign(out.get(id), { streak: l.streak, today: l.today, goal: l.goal, lastActive: l.lastActive });
    }
  }
  for (const s of out.values()) s.points = points(s);
  return out;
}

/** "Priya S." — first name and last initial, for lists other people see. */
const shortName = (name) => {
  const parts = String(name || 'Member').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
};

module.exports = { weekOf, weekStats, points, shortName, toDay };
