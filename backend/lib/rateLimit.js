// Simple per-user rate limiter (in memory). Protects the AI bill and the free
// Gemini quota from one member (or a script) sending hundreds of requests.
function rateLimit({ windowMs = 60 * 60 * 1000, max = 40, name = 'requests' } = {}) {
  const hits = new Map(); // key -> [timestamps]
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, list] of hits) {
      const kept = list.filter((t) => t > cutoff);
      if (kept.length) hits.set(k, kept); else hits.delete(k);
    }
  }, 10 * 60 * 1000).unref();

  return (req, res, next) => {
    const key = (req.user && req.user.id) || req.ip || 'anon';
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => t > now - windowMs);
    if (list.length >= max) {
      const retryMin = Math.ceil((list[0] + windowMs - now) / 60000);
      return res.status(429).json({ message: `You’ve reached the limit for AI ${name}. Please try again in ${retryMin} minute${retryMin === 1 ? '' : 's'}.` });
    }
    list.push(now);
    hits.set(key, list);
    // Record the request for the admin dashboard (never blocks the request).
    try {
      require('../db').promise().query('INSERT INTO ai_usage (user_id, kind) VALUES (?, ?)', [(req.user && req.user.id) || null, String(name).slice(0, 40)]).catch(() => {});
    } catch { /* ignore */ }
    next();
  };
}

module.exports = rateLimit;
