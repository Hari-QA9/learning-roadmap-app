// Sends email. Two ways, pick one in backend/.env (or the hosting provider's settings):
//
//  1. Brevo email API (recommended for hosting — works on Render's free plan, which blocks SMTP):
//       BREVO_API_KEY=xkeysib-...
//       MAIL_FROM=Learnvoy <you@gmail.com>     (an address you verified in Brevo → Senders)
//  2. SMTP (fine on your own computer, e.g. Gmail with an App Password):
//       SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//
// With neither, emails are printed to the backend terminal so local dev still works.
require('dotenv').config();

const brevoKey = () => process.env.BREVO_API_KEY || '';
const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || '';

/** "Learnvoy <me@x.com>" → { name: 'Learnvoy', email: 'me@x.com' } */
function parseFrom(value) {
  const m = String(value || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || 'Learnvoy', email: m[2].trim() };
  return { name: 'Learnvoy', email: String(value || '').trim() };
}

let transport = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    const nodemailer = require('nodemailer');
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

async function sendWithBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevoKey(), 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseFrom(fromAddress()),
      to: [{ email: to }],
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch { /* ignore */ }
    throw new Error(`Brevo HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }
}

async function sendMail({ to, subject, text, html }) {
  if (brevoKey()) {
    await sendWithBrevo({ to, subject, text, html });
    return { delivered: true };
  }
  const t = getTransport();
  if (!t) {
    console.log('\n──────── Email (not configured — printed here instead) ────────');
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}`);
    console.log('───────────────────────────────────────────────────────────────\n');
    return { delivered: false };
  }
  await t.sendMail({ from: fromAddress(), to, subject, text, html });
  return { delivered: true };
}

// Check the email settings once at startup so problems show up immediately.
async function verifyMail() {
  if (brevoKey()) {
    if (!parseFrom(fromAddress()).email) { console.error('[mail] BREVO_API_KEY is set but MAIL_FROM is missing (e.g. MAIL_FROM=Learnvoy <you@gmail.com>).'); return; }
    try {
      const res = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': brevoKey(), accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[mail] Ready to send email through Brevo as ${parseFrom(fromAddress()).email}.`);
    } catch (err) {
      console.error(`[mail] Brevo key didn't work (${err.message}). Check BREVO_API_KEY.`);
    }
    return;
  }
  const t = getTransport();
  if (!t) { console.log('[mail] Email not configured — password reset links will be printed here.'); return; }
  try {
    await t.verify();
    console.log(`[mail] Ready to send email as ${process.env.SMTP_USER}.`);
  } catch (err) {
    console.error(`[mail] Email settings didn't work: ${err.message}`);
    console.error('[mail] Check SMTP_* in backend/.env (for Gmail, use an App Password with 2-Step Verification on).');
  }
}

module.exports = { sendMail, verifyMail, parseFrom, emailConfigured: () => !!(brevoKey() || process.env.SMTP_HOST) };
