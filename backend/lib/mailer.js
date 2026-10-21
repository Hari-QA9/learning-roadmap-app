// Sends email through SMTP when SMTP_* is set in backend/.env.
// Without it, emails are printed to the backend terminal so local dev still works.
require('dotenv').config();

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

async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  if (!t) {
    console.log('\n──────── Email (SMTP not configured — printed here instead) ────────');
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}`);
    console.log('──────────────────────────────────────────────────────────────────\n');
    return { delivered: false };
  }
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
  return { delivered: true };
}

// Check the SMTP settings once at startup so problems show up immediately.
async function verifyMail() {
  const t = getTransport();
  if (!t) { console.log('[mail] SMTP not configured — password reset links will be printed here.'); return; }
  try {
    await t.verify();
    console.log(`[mail] Ready to send email as ${process.env.SMTP_USER}.`);
  } catch (err) {
    console.error(`[mail] Email settings didn't work: ${err.message}`);
    console.error('[mail] Check SMTP_* in backend/.env (for Gmail, use an App Password with 2-Step Verification on).');
  }
}

module.exports = { sendMail, verifyMail, emailConfigured: () => !!process.env.SMTP_HOST };
