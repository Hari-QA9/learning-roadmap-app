// Turn phone & desktop notifications on/off for a device, and send a test.
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const push = require('../lib/push');

const q = () => db.promise();
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

router.get('/config', (req, res) => {
  const k = push.keys();
  res.json({ enabled: !!k, publicKey: k ? k.pub : null });
});

router.get('/status', auth, async (req, res) => {
  const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?', [req.user.id]);
  res.json({ enabled: push.enabled(), devices: Number(n) });
});

router.post('/subscribe', auth, async (req, res) => {
  if (!push.enabled()) return res.status(400).json({ message: 'Notifications aren’t set up on this server yet.' });
  const s = req.body.subscription || {};
  const endpoint = String(s.endpoint || '');
  const p256dh = String(s.keys?.p256dh || '');
  const authKey = String(s.keys?.auth || '');
  if (!push.allowedEndpoint(endpoint)) return res.status(400).json({ message: 'This browser’s notification service isn’t supported.' });
  if (push.fromB64u(p256dh).length !== 65 || push.fromB64u(authKey).length < 16) return res.status(400).json({ message: 'Invalid subscription.' });
  try {
    const h = hash(endpoint);
    const device = String(req.headers['user-agent'] || '').replace(/\s+/g, ' ').slice(0, 120);
    const [existing] = await q().query('SELECT id FROM push_subscriptions WHERE endpoint_hash = ?', [h]);
    if (existing.length) await q().query('UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ?, device = ? WHERE id = ?', [req.user.id, p256dh, authKey, device, existing[0].id]);
    else await q().query('INSERT INTO push_subscriptions (user_id, endpoint, endpoint_hash, p256dh, auth, device) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, endpoint, h, p256dh, authKey, device]);
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?', [req.user.id]);
    if (Number(n) > 10) await q().query('DELETE FROM push_subscriptions WHERE user_id = ? ORDER BY created_at LIMIT ?', [req.user.id, Number(n) - 10]).catch(() => {});
    res.json({ message: 'Notifications are on for this device.' });
  } catch (err) {
    console.error('[push] subscribe', err.message);
    res.status(500).json({ message: 'Could not turn notifications on.' });
  }
});

router.post('/unsubscribe', auth, async (req, res) => {
  await q().query('DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', [hash(req.body.endpoint), req.user.id]);
  res.json({ message: 'Notifications are off for this device.' });
});

router.post('/test', auth, async (req, res) => {
  const r = await push.pushToUser(req.user.id, { title: 'Notifications are working 🎉', body: 'You’ll get reminders, nudges and updates here.', url: '/dashboard', tag: 'test' });
  if (!r.sent) return res.status(400).json({ message: 'No device received it. Turn notifications on again on this device.' });
  res.json({ message: `Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}.` });
});

module.exports = router;
