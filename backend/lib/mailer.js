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

module.exports = { sendMail, emailConfigured: () => !!process.env.SMTP_HOST };
