// Web Push (phone & desktop notifications) using only Node's built-in crypto — no extra packages.
// Implements VAPID (RFC 8292) and message encryption "aes128gcm" (RFC 8291 / RFC 8188).
//
// Turn it on with two settings (create them once with `npm run vapid-keys`):
//   VAPID_PUBLIC_KEY=…   VAPID_PRIVATE_KEY=…   (optional) VAPID_SUBJECT=mailto:you@example.com
const crypto = require('crypto');
const db = require('../db');

const q = () => db.promise();
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const keys = () => {
  const pub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (!pub || !priv || fromB64u(pub).length !== 65 || fromB64u(priv).length !== 32) return null;
  return { pub, priv };
};
const enabled = () => !!keys();

function subject() {
  const s = (process.env.VAPID_SUBJECT || '').trim();
  if (/^(mailto:|https:)/.test(s)) return s;
  const m = String(process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || '').match(/[^\s<>]+@[^\s<>]+/);
  return `mailto:${m ? m[0] : 'admin@learnvoy.app'}`;
}

/** The "Authorization: vapid t=…, k=…" header for a push service. */
function vapidHeader(endpoint, k = keys()) {
  const pubRaw = fromB64u(k.pub);
  const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: k.priv, x: b64u(pubRaw.subarray(1, 33)), y: b64u(pubRaw.subarray(33, 65)) }, format: 'jwk' });
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject() }));
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${k.pub}`;
}

/** Encrypts a payload for one subscription (RFC 8291, single record). */
function encrypt(payload, p256dh, auth, testing = {}) {
  const uaPublic = fromB64u(p256dh);
  const authSecret = fromB64u(auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error('Bad subscription keys');
  const ecdh = crypto.createECDH('prime256v1');
  let asPublic;
  if (testing.asPrivate) { ecdh.setPrivateKey(fromB64u(testing.asPrivate)); asPublic = ecdh.getPublicKey(); } else asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const salt = testing.salt ? fromB64u(testing.salt) : crypto.randomBytes(16); // fixed values only in tests
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

// Only ever send to real browser push services (stops the server being used to call other addresses).
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
function allowedEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    if (u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname))) return true;
    // Local testing only (never in production).
    return process.env.NODE_ENV !== 'production' && process.env.PUSH_ALLOW_LOCAL === '1' && /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  } catch { return false; }
}

async function sendOne(sub, message) {
  const body = encrypt(JSON.stringify(message), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: vapidHeader(sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal' },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404 || res.status === 410) {
    await q().query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
    return 'gone';
  }
  if (!res.ok) throw new Error(`push service said HTTP ${res.status}`);
  await q().query('UPDATE push_subscriptions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [sub.id]).catch(() => {});
  return 'sent';
}

/** Send a notification to every device the member turned push on for. Never throws. */
async function pushToUser(userId, { title, body = '', url = '/notifications', tag } = {}) {
  if (!enabled()) return { sent: 0 };
  try {
    const [subs] = await q().query('SELECT * FROM push_subscriptions WHERE user_id = ? LIMIT 10', [userId]);
    let sent = 0;
    for (const s of subs) {
      if (!allowedEndpoint(s.endpoint)) continue;
      try { if ((await sendOne(s, { title: String(title).slice(0, 120), body: String(body).slice(0, 300), url, tag })) === 'sent') sent++; } catch (e) { console.warn('[push]', e.message); }
    }
    return { sent };
  } catch (err) {
    console.warn('[push] skipped:', err.message);
    return { sent: 0 };
  }
}

module.exports = { enabled, keys, vapidHeader, encrypt, allowedEndpoint, pushToUser, b64u, fromB64u };
