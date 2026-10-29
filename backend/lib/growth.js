// Growth pack helpers: share links, invite codes, referrals and badges.
const crypto = require('crypto');
const db = require('../db');
const { notify } = require('./engagement');

const q = () => db.promise();

// Easy to read aloud and type: no 0/O/1/l/I.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function randomCode(len = 10) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const RESERVED = new Set(['admin', 'administrator', 'api', 'app', 'login', 'logout', 'signup', 'register', 'u', 'r', 'verify', 'settings',
  'support', 'help', 'about', 'privacy', 'terms', 'learnmap', 'learnvoy', 'www', 'root', 'staff', 'team', 'official', 'null', 'undefined', 'me', 'profile']);
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

/** Normalises a requested username and returns an error message if it can't be used. */
function checkUsername(raw) {
  const u = String(raw || '').trim().toLowerCase();
  if (!USERNAME_RE.test(u) || u.length < 3) return { u, error: 'Use 3–30 letters, numbers, - or _ (start and end with a letter or number).' };
  if (RESERVED.has(u)) return { u, error: 'That name is reserved. Try another.' };
  return { u, error: null };
}

/** Suggests an available username from the member's name, e.g. "harie" or "harie-2". */
async function suggestUsername(name) {
  const base = String(name || 'learner').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'learner';
  const start = base.length >= 3 && !RESERVED.has(base) ? base : `${base}-learns`.slice(0, 28);
  for (let i = 0; i < 50; i++) {
    const candidate = i ? `${start}-${i + 1}` : start;
    const [rows] = await q().query('SELECT user_id FROM public_profiles WHERE username = ?', [candidate]);
    if (!rows.length) return candidate;
  }
  return `${start}-${randomCode(4)}`;
}

/** The member's personal invite code (created on first use). */
async function inviteCode(userId) {
  await q().query('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [userId]).catch(() => {});
  const [rows] = await q().query('SELECT invite_code FROM user_settings WHERE user_id = ?', [userId]);
  if (rows[0]?.invite_code) return rows[0].invite_code;
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const [taken] = await q().query('SELECT user_id FROM user_settings WHERE invite_code = ?', [code]);
    if (taken.length) continue;
    await q().query('UPDATE user_settings SET invite_code = ? WHERE user_id = ?', [code, userId]);
    return code;
  }
  throw new Error('Could not create an invite code');
}

async function awardBadge(userId, badgeId) {
  const [have] = await q().query('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?', [userId, badgeId]);
  if (have.length) return false;
  await q().query('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, badgeId]);
  return true;
}

/** Called right after a new account is created. Never throws — signing up must always work. */
async function recordReferral(newUserId, code) {
  try {
    const c = String(code || '').trim().toLowerCase();
    if (!/^[a-z0-9]{6,16}$/.test(c)) return;
    const [rows] = await q().query('SELECT user_id FROM user_settings WHERE invite_code = ?', [c]);
    const inviterId = rows[0]?.user_id;
    if (!inviterId || inviterId === newUserId) return;
    await q().query('INSERT INTO referrals (inviter_id, invitee_id) VALUES (?, ?)', [inviterId, newUserId]);
    await q().query('UPDATE user_stats SET xp_points = xp_points + 50 WHERE user_id = ?', [inviterId]).catch(() => {});
    const [[u]] = await q().query('SELECT name FROM users WHERE id = ?', [newUserId]);
    const first = await awardBadge(inviterId, 9).catch(() => false);
    await notify(inviterId, {
      title: `${(u?.name || 'A friend').split(' ')[0]} joined with your invite`,
      message: first ? 'You earned the Ambassador badge and 50 XP. Thanks for spreading the word!' : 'You earned 50 XP. Thanks for spreading the word!',
      link: '/profile',
      type: 'invite',
    });
  } catch (err) {
    if (!/duplicate|unique/i.test(err.message)) console.warn('[growth] referral skipped:', err.message);
  }
}

module.exports = { randomCode, checkUsername, suggestUsername, inviteCode, awardBadge, recordReferral };
