const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { sendMail } = require('../lib/mailer');
require('dotenv').config();

const q = () => db.promise();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

/* ---------- Brute-force protection ----------
   After 5 wrong passwords for the same email, block that email for 15 minutes.
   Kept in memory: it resets if the server restarts, which is fine for this app. */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map(); // email -> { count, lockedUntil }

function lockInfo(email) {
  const a = attempts.get(email);
  if (!a) return null;
  if (a.lockedUntil && a.lockedUntil > Date.now()) return a;
  if (a.lockedUntil && a.lockedUntil <= Date.now()) { attempts.delete(email); return null; }
  return a;
}
function recordFailure(email) {
  const a = attempts.get(email) || { count: 0, lockedUntil: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) a.lockedUntil = Date.now() + LOCK_MS;
  attempts.set(email, a);
  return a;
}

const normEmail = (e) => String(e || '').trim().toLowerCase();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function signToken(user, remember) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: remember ? '30d' : '1d' }
  );
}

/* ---------- Email verification ---------- */
async function sendVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await q().query('UPDATE email_verifications SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);
  await q().query('INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [user.id, sha256(token), new Date(Date.now() + 48 * 3600000)]);
  const link = `${APP_URL}/verify-email?token=${token}`;
  const { emailLayout } = require('../lib/engagement');
  const { text, html } = emailLayout({
    heading: 'Confirm your email',
    intro: `Hi ${user.name || ''}, welcome to LearnMap! Please confirm this is your email so we can send reminders and job alerts. The link works for 48 hours.`,
    cta: { label: 'Confirm my email', url: link },
    footerNote: 'If you didn’t create a LearnMap account, you can ignore this email.',
  });
  return sendMail({ to: user.email, subject: 'Confirm your LearnMap email', text, html });
}

// REGISTER
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ message: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (password.length < MIN_PASSWORD) return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters.` });

  try {
    const [existing] = await q().query('SELECT id FROM users WHERE LOWER(email) = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists. Try logging in.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await q().query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );
    await q().query('INSERT INTO user_stats (user_id) VALUES (?)', [result.insertId]).catch(() => {});
    // New accounts confirm their email (existing accounts were marked confirmed when this was added).
    await q().query('UPDATE users SET email_verified = 0 WHERE id = ?', [result.insertId]).catch(() => {});
    sendVerification({ id: result.insertId, name, email }).catch((e) => console.error('[auth] verification email:', e.message));
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const email = normEmail(req.body.email);
  const password = String(req.body.password || '');
  const remember = req.body.remember !== false;
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });

  const lock = lockInfo(email);
  if (lock && lock.lockedUntil) {
    const mins = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.`, locked: true });
  }

  try {
    const [users] = await q().query('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
    const user = users[0];
    const ok = user ? await bcrypt.compare(password, user.password) : false;
    if (!ok) {
      const a = recordFailure(email);
      const left = MAX_ATTEMPTS - a.count;
      if (a.lockedUntil) {
        return res.status(429).json({ message: 'Too many failed attempts. Your account is locked for 15 minutes — or reset your password.', locked: true });
      }
      return res.status(400).json({
        message: left <= 2 ? `Incorrect email or password. ${left} attempt${left === 1 ? '' : 's'} left before a 15-minute lock.` : 'Incorrect email or password.',
      });
    }
    attempts.delete(email);

    // Remember the last visit. (The learning streak now counts days with finished tasks — see lib/engagement.js.)
    try {
      const [statsRows] = await q().query('SELECT user_id FROM user_stats WHERE user_id = ?', [user.id]);
      if (statsRows.length) await q().query('UPDATE user_stats SET last_active = CURDATE() WHERE user_id = ?', [user.id]);
      else await q().query('INSERT INTO user_stats (user_id, streak_days, last_active) VALUES (?, 0, CURDATE())', [user.id]);
    } catch (e) {
      console.error('Last-active update failed:', e.message);
    }

    res.json({
      token: signToken(user, remember),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// FORGOT PASSWORD — always answers the same way so it can't be used to discover accounts
router.post('/forgot-password', async (req, res) => {
  const email = normEmail(req.body.email);
  const generic = { message: 'If an account exists for that email, a reset link is on its way. It expires in 30 minutes.' };
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

  try {
    const [users] = await q().query('SELECT id, name, email FROM users WHERE LOWER(email) = ?', [email]);
    if (!users.length) {
      // Logged only on the server — the user always sees the same message.
      console.log(`[auth] Password reset requested for ${email}, but no account uses that email. Nothing was sent.`);
      return res.json(generic);
    }
    const user = users[0];

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    await q().query('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);
    await q().query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [user.id, sha256(token), expires]);

    const link = `${APP_URL}/reset-password?token=${token}`;
    const result = await sendMail({
      to: user.email,
      subject: 'Reset your LearnMap password',
      text: `Hi ${user.name || ''},\n\nSomeone (hopefully you) asked to reset your LearnMap password.\nOpen this link within 30 minutes to choose a new one:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<p>Hi ${String(user.name || '').replace(/</g, '&lt;')},</p><p>Someone (hopefully you) asked to reset your LearnMap password.</p><p><a href="${link}">Choose a new password</a> — this link expires in 30 minutes.</p><p>If you didn't ask for this, you can ignore this email.</p>`,
    });
    if (result.delivered) console.log(`[auth] Password reset email sent to ${user.email}.`);
    res.json(generic);
  } catch (err) {
    console.error('[auth] Could not send the password reset email:', err.message);
    if (/Invalid login|535|auth/i.test(err.message)) {
      console.error('[auth] Check SMTP_USER and SMTP_PASS in backend/.env (for Gmail, SMTP_PASS must be an App Password).');
    }
    res.json(generic);
  }
});

// RESET PASSWORD (from the emailed link)
router.post('/reset-password', async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!token) return res.status(400).json({ message: 'This reset link is invalid.' });
  if (password.length < MIN_PASSWORD) return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters.` });

  try {
    const [rows] = await q().query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used, u.email FROM password_resets pr
       JOIN users u ON u.id = pr.user_id WHERE pr.token_hash = ?`,
      [sha256(token)]
    );
    const row = rows[0];
    if (!row || Number(row.used) === 1 || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'This reset link has expired or was already used. Please request a new one.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await q().query('UPDATE users SET password = ? WHERE id = ?', [hashed, row.user_id]);
    await q().query('UPDATE password_resets SET used = 1 WHERE user_id = ?', [row.user_id]);
    attempts.delete(normEmail(row.email));
    res.json({ message: 'Password updated. You can log in now.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// CHANGE PASSWORD (signed in)
router.post('/change-password', auth, async (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  if (next.length < MIN_PASSWORD) return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD} characters.` });
  try {
    const [users] = await q().query('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    if (!users.length || !(await bcrypt.compare(current, users[0].password))) {
      return res.status(400).json({ message: 'Your current password is incorrect.' });
    }
    if (await bcrypt.compare(next, users[0].password)) {
      return res.status(400).json({ message: 'Choose a password different from your current one.' });
    }
    await q().query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(next, 10), req.user.id]);
    res.json({ message: 'Password changed.' });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// CONFIRM EMAIL (from the emailed link)
router.post('/verify-email', async (req, res) => {
  const token = String(req.body.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'This confirmation link is invalid.' });
  try {
    const [rows] = await q().query('SELECT * FROM email_verifications WHERE token_hash = ? AND used = 0', [sha256(token)]);
    const row = rows[0];
    if (!row || new Date(row.expires_at) < new Date()) return res.status(400).json({ message: 'This confirmation link has expired or was already used. Log in and send a new one.' });
    await q().query('UPDATE users SET email_verified = 1 WHERE id = ?', [row.user_id]);
    await q().query('UPDATE email_verifications SET used = 1 WHERE user_id = ?', [row.user_id]);
    res.json({ message: 'Email confirmed — thank you!' });
  } catch (err) {
    console.error('[auth] verify', err.message);
    res.status(500).json({ message: 'Could not confirm your email. Please try again.' });
  }
});

const resends = new Map(); // userId -> [timestamps]
router.post('/resend-verification', auth, async (req, res) => {
  const recent = (resends.get(req.user.id) || []).filter((t) => t > Date.now() - 3600000);
  if (recent.length >= 3) return res.status(429).json({ message: 'We’ve sent a few links already. Check your spam folder, or try again in an hour.' });
  try {
    const [u] = await q().query('SELECT id, name, email, email_verified FROM users WHERE id = ?', [req.user.id]);
    if (!u.length) return res.status(404).json({ message: 'Account not found.' });
    if (Number(u[0].email_verified)) return res.json({ message: 'Your email is already confirmed.' });
    await sendVerification(u[0]);
    resends.set(req.user.id, [...recent, Date.now()]);
    res.json({ message: `We sent a new link to ${u[0].email}.` });
  } catch (err) {
    console.error('[auth] resend', err.message);
    res.status(500).json({ message: 'Could not send the email. Please try again.' });
  }
});

// WHO AM I (verification status, admin flag)
const adminEmails = () => String(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
router.get('/me', auth, async (req, res) => {
  try {
    const [u] = await q().query('SELECT id, name, email, email_verified FROM users WHERE id = ?', [req.user.id]);
    if (!u.length) return res.status(404).json({ message: 'Account not found.' });
    res.json({ id: u[0].id, name: u[0].name, email: u[0].email, email_verified: u[0].email_verified === undefined ? true : !!Number(u[0].email_verified), isAdmin: adminEmails().includes(String(u[0].email).toLowerCase()) });
  } catch (err) {
    res.status(500).json({ message: 'Could not load your account.' });
  }
});

// PUBLIC CONFIG for the login page
router.get('/config', (req, res) => {
  res.json({ googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim() || null });
});

// SIGN IN WITH GOOGLE — the browser gets a Google ID token; we verify it with Google.
router.post('/google', async (req, res) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const credential = String(req.body.credential || '');
  if (!clientId) return res.status(400).json({ message: 'Google sign-in isn’t set up on this server.' });
  if (!credential) return res.status(400).json({ message: 'Missing Google credential.' });
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const info = await r.json();
    const validIssuer = ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss);
    if (!r.ok || info.aud !== clientId || !validIssuer || Number(info.exp) * 1000 < Date.now()) {
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }
    if (String(info.email_verified) !== 'true') return res.status(401).json({ message: 'Your Google email isn’t verified.' });
    const email = normEmail(info.email);
    let [users] = await q().query('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
    let isNew = false;
    if (!users.length) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      const name = String(info.name || email.split('@')[0]).slice(0, 255);
      const [ins] = await q().query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, randomPassword]);
      await q().query('INSERT INTO user_stats (user_id) VALUES (?)', [ins.insertId]).catch(() => {});
      [users] = await q().query('SELECT * FROM users WHERE id = ?', [ins.insertId]);
      isNew = true;
    }
    const user = users[0];
    // Google already confirmed this email.
    await q().query('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]).catch(() => {});
    await q().query('UPDATE user_stats SET last_active = CURDATE() WHERE user_id = ?', [user.id]).catch(() => {});
    res.json({ token: signToken(user, true), user: { id: user.id, name: user.name, email: user.email }, isNew });
  } catch (err) {
    console.error('[auth] google', err.message);
    res.status(500).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

module.exports = router;
