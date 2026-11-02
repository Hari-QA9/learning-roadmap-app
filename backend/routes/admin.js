// Admin dashboard data: growth, engagement, AI usage, jobs, feedback and recent errors.
const express = require('express');
const router = express.Router();
const db = require('../db');
const admin = require('../middleware/admin');
const { recentErrors } = require('../lib/errorLog');
const { emailConfigured } = require('../lib/mailer');

const q = () => db.promise();
const p = (n) => String(n).padStart(2, '0');
const sqlTime = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
const ago = (days) => sqlTime(new Date(Date.now() - days * 86400000));
const dayKey = (v) => String(v instanceof Date ? sqlTime(v) : v).slice(0, 10);
const one = async (sql, params = []) => { try { const [r] = await q().query(sql, params); return Number(Object.values(r[0] || {})[0]) || 0; } catch { return 0; } };
const many = async (sql, params = []) => { try { const [r] = await q().query(sql, params); return r; } catch { return []; } };

router.get('/overview', admin, async (req, res) => {
  const [
    users, users7, users30, verified, onboarded, active7, roadmaps, tasksDone7, interviews,
    aiToday, ai7, ai30, jobsTotal, jobsCustom,
  ] = await Promise.all([
    one('SELECT COUNT(*) FROM users'),
    one('SELECT COUNT(*) FROM users WHERE created_at >= ?', [ago(7)]),
    one('SELECT COUNT(*) FROM users WHERE created_at >= ?', [ago(30)]),
    one('SELECT COUNT(*) FROM users WHERE email_verified = 1'),
    one('SELECT COUNT(*) FROM user_settings WHERE onboarded = 1'),
    one('SELECT COUNT(DISTINCT user_id) FROM activity_days WHERE day >= ?', [ago(7).slice(0, 10)]),
    one('SELECT COUNT(*) FROM roadmaps'),
    one('SELECT COALESCE(SUM(tasks_done), 0) FROM activity_days WHERE day >= ?', [ago(7).slice(0, 10)]),
    one('SELECT COUNT(*) FROM interview_sessions'),
    one('SELECT COUNT(*) FROM ai_usage WHERE created_at >= ?', [ago(1)]),
    one('SELECT COUNT(*) FROM ai_usage WHERE created_at >= ?', [ago(7)]),
    one('SELECT COUNT(*) FROM ai_usage WHERE created_at >= ?', [ago(30)]),
    one('SELECT COUNT(*) FROM jobs WHERE user_id IS NULL'),
    one('SELECT COUNT(*) FROM jobs WHERE user_id IS NOT NULL'),
  ]);

  const signupRows = await many('SELECT created_at FROM users WHERE created_at >= ?', [ago(14)]);
  const signups = Array.from({ length: 14 }, (_, i) => {
    const d = sqlTime(new Date(Date.now() - (13 - i) * 86400000)).slice(0, 10);
    return { day: d, count: signupRows.filter((r) => dayKey(r.created_at) === d).length };
  });
  const aiByKind = await many('SELECT kind, COUNT(*) AS n FROM ai_usage WHERE created_at >= ? GROUP BY kind ORDER BY n DESC', [ago(7)]);
  const topAi = await many(
    `SELECT u.id, u.name, u.email, COUNT(*) AS n FROM ai_usage a JOIN users u ON u.id = a.user_id
     WHERE a.created_at >= ? GROUP BY u.id, u.name, u.email ORDER BY n DESC LIMIT 5`, [ago(7)]
  );
  const jobsBySource = await many('SELECT source, COUNT(*) AS n, MAX(fetched_at) AS last FROM jobs WHERE user_id IS NULL GROUP BY source ORDER BY n DESC');
  const apps = await many('SELECT status, COUNT(*) AS n FROM job_applications GROUP BY status');
  const feedback = await many('SELECT f.*, u.name AS user_name FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.id DESC LIMIT 10');

  res.json({
    users: { total: users, new7: users7, new30: users30, verified, onboarded, active7 },
    learning: { roadmaps, tasksDone7, interviews },
    ai: { today: aiToday, week: ai7, month: ai30, byKind: aiByKind.map((r) => ({ kind: r.kind, n: Number(r.n) })), topUsers: topAi.map((r) => ({ ...r, n: Number(r.n) })) },
    jobs: { total: jobsTotal, custom: jobsCustom, bySource: jobsBySource.map((r) => ({ source: r.source, n: Number(r.n), last: r.last })) },
    applications: apps.map((r) => ({ status: r.status, n: Number(r.n) })),
    signups,
    feedback: feedback.map((f) => ({ id: f.id, user: f.user_name || 'Unknown', message: f.message || f.feedback || f.content || '', rating: f.rating ?? null, created_at: f.created_at })),
    errors: recentErrors().slice(0, 25),
    system: {
      email: emailConfigured(), scheduler: process.env.DISABLE_SCHEDULER !== '1', googleSignIn: !!(process.env.GOOGLE_CLIENT_ID || '').trim(),
      youtube: !!(process.env.YOUTUBE_API_KEY || '').trim(), adzuna: !!(process.env.ADZUNA_APP_ID || '').trim(), jsearch: !!(process.env.JSEARCH_API_KEY || '').trim(),
      node: process.version, uptimeMin: Math.round(process.uptime() / 60),
    },
  });
});

router.get('/users', admin, async (req, res) => {
  const text = String(req.query.q || '').trim().toLowerCase();
  const rows = await many(
    `SELECT u.id, u.name, u.email, u.created_at, u.email_verified, s.last_active,
            (SELECT COUNT(*) FROM roadmaps r WHERE r.user_id = u.id) AS roadmaps
     FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
     ${text ? 'WHERE LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?' : ''}
     ORDER BY u.id DESC LIMIT 50`,
    text ? [`%${text}%`, `%${text}%`] : []
  );
  res.json(rows.map((r) => ({ ...r, email_verified: r.email_verified === undefined ? true : !!Number(r.email_verified), roadmaps: Number(r.roadmaps) })));
});

/* ---------- Machine learning: models, at-risk learners, experiment, embeddings ---------- */
router.get('/ml', admin, async (req, res) => {
  const QR = require('../lib/quitRisk');
  const E = require('../lib/embeddings');
  try {
    const model = await QR.activeModel();
    const [[latest]] = await q().query('SELECT MAX(day) AS day FROM ml_snapshots');
    const day = latest && latest.day ? String(latest.day instanceof Date ? latest.day.toISOString() : latest.day).slice(0, 10) : null;
    const atRisk = day ? await many(
      `SELECT s.user_id, s.risk, s.features, s.nudged, s.holdout, u.name, u.email FROM ml_snapshots s JOIN users u ON u.id = s.user_id
       WHERE s.day = ? ORDER BY s.risk DESC LIMIT 12`, [day]) : [];
    // Did the nudges help? Compare high-risk learners who got one with the holdout group.
    const exp = await many(
      `SELECT nudged, holdout, COUNT(*) AS n, SUM(label) AS quit FROM ml_snapshots
       WHERE label IS NOT NULL AND risk >= ? GROUP BY nudged, holdout`, [Number(process.env.QUIT_RISK_NUDGE) || 0.6]);
    const group = (pred) => { const rows = exp.filter(pred); const n = rows.reduce((a, r) => a + Number(r.n), 0); return { n, quit_rate: n ? rows.reduce((a, r) => a + Number(r.quit), 0) / n : null }; };
    const [embedCounts, personalised, reviewsLogged, labelled, snapshots] = await Promise.all([
      many('SELECT kind, COUNT(*) AS n FROM embeddings GROUP BY kind'),
      one('SELECT COUNT(*) FROM user_settings WHERE fsrs_w IS NOT NULL'),
      one('SELECT COUNT(*) FROM flashcard_reviews'),
      one('SELECT COUNT(*) FROM ml_snapshots WHERE label IS NOT NULL'),
      one('SELECT COUNT(*) FROM ml_snapshots'),
    ]);
    res.json({
      quit_risk: {
        model: { kind: model.kind, version: model.version, trained_at: model.trained_at || null, metrics: model.metrics || null },
        snapshots, labelled, day,
        at_risk: atRisk.map((r) => {
          const f = JSON.parse(r.features);
          return { name: r.name, email: r.email, risk: Math.round(Number(r.risk) * 100), reasons: QR.reasons(model, f), days_since_active: f.days_since_active, nudged: !!Number(r.nudged), holdout: !!Number(r.holdout) };
        }),
        experiment: { nudged: group((r) => Number(r.nudged) === 1), holdout: group((r) => Number(r.holdout) === 1) },
      },
      embeddings: { enabled: E.enabled(), model: E.MODEL(), counts: Object.fromEntries(embedCounts.map((r) => [r.kind, Number(r.n)])) },
      memory: { personalised, reviews_logged: reviewsLogged },
    });
  } catch (err) {
    console.error('[admin] ml', err.message);
    res.status(500).json({ message: 'Could not load ML status.' });
  }
});

// Rebuild past snapshots from activity history, then try to train.
router.post('/ml/quit-risk/train', admin, async (req, res) => {
  const QR = require('../lib/quitRisk');
  try {
    const back = await QR.backfill(Math.min(365, Math.max(14, parseInt(req.body?.days, 10) || 120)));
    const result = await QR.trainFromDb();
    res.json({ ...back, accepted: result.accepted, metrics: result.metrics || null, reason: result.reason || null,
      message: result.accepted ? `New model trained — test AUC ${result.metrics.auc.toFixed(2)}` : `Kept the current model: ${result.reason}` });
  } catch (err) {
    console.error('[admin] train', err.message);
    res.status(500).json({ message: 'Training failed.' });
  }
});

module.exports = router;
