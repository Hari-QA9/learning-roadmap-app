// Production hardening without extra packages: security headers, CORS allowlist, start-up checks.
const cors = require('cors');

const isProd = () => process.env.NODE_ENV === 'production';

/** Standard security headers (the important parts of what the `helmet` package sets). */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // The API only returns JSON (plus a couple of tiny HTML pages), so it never needs to load anything.
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if (isProd()) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/**
 * CORS: which websites may call the API from a browser.
 * CORS_ORIGINS=https://learnmap.app,https://www.learnmap.app  (comma-separated)
 * If it's not set, APP_URL is allowed; with neither (local development) every origin is allowed.
 */
function corsMiddleware() {
  const list = (process.env.CORS_ORIGINS || process.env.APP_URL || '')
    .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  const allowAll = !list.length || (!isProd() && !process.env.CORS_ORIGINS);
  return cors({
    origin(origin, cb) {
      // No Origin header = not a browser page (calendar apps, uptime checks, curl) — allowed.
      if (!origin || allowAll) return cb(null, true);
      const o = origin.replace(/\/$/, '');
      // Local development and phones on the same Wi-Fi still work outside production.
      if (!isProd() && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(o)) return cb(null, true);
      return cb(null, list.includes(o));
    },
    maxAge: 600,
  });
}

/** Stop with a clear message if production is missing settings it can't run safely without. */
function checkProductionConfig() {
  if (!isProd()) {
    if (!process.env.JWT_SECRET) console.warn('[config] JWT_SECRET is not set — logins will fail. Add it to backend/.env.');
    return;
  }
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be set to a random string of at least 32 characters.');
  if (!process.env.APP_URL || /localhost/.test(process.env.APP_URL)) problems.push('APP_URL must be the real website address (e.g. https://learnmap.vercel.app).');
  if (!process.env.DATABASE_URL && !process.env.MYSQL_URL && !process.env.DB_HOST) problems.push('Set DATABASE_URL (or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) for the production database.');
  if (problems.length) {
    console.error(`\n[config] The backend can't start in production yet:\n - ${problems.join('\n - ')}\n`);
    process.exit(1);
  }
  if (!process.env.PUBLIC_API_URL) console.warn('[config] PUBLIC_API_URL is not set — email unsubscribe links and the calendar feed will point at localhost.');
  if (!process.env.GEMINI_API_KEY) console.warn('[config] GEMINI_API_KEY is not set — AI features will not work.');
}

module.exports = { securityHeaders, corsMiddleware, checkProductionConfig, isProd };
