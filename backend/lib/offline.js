// Changes made while offline are sent later by the app with the time they really happened
// (X-Queued-At). Trust it only if it's recent and not in the future, so streaks and study
// time count on the right day without letting anyone rewrite old history.
const MAX_AGE = 14 * 24 * 3600 * 1000;

function queuedAt(req) {
  const raw = req.get ? req.get('x-queued-at') : req.headers?.['x-queued-at'];
  if (!raw) return null;
  const d = new Date(String(raw));
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  const now = Date.now();
  if (t > now + 5 * 60 * 1000 || t < now - MAX_AGE) return null;
  return d;
}

module.exports = { queuedAt };
