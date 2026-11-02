// Quit-risk prediction: which currently-active learners are likely to go quiet for the next
// 14 days — so Learnvoy can send a gentle, personal nudge *before* they drop off.
//
// The ML pipeline
//   1. Snapshot  — once a day, for every learner active in the last 14 days, compute features
//                  from their activity up to that day (ml_snapshots). Past days can be
//                  rebuilt from history (`npm run ml:backfill`), so there's data from day one.
//   2. Label     — 14 days later we know the answer: 1 = no learning activity in those 14 days.
//   3. Train     — logistic regression on standardised features, balanced classes, L2, with a
//                  time-based validation split (train on older days, test on newer ones). Runs
//                  weekly here (`trainFromDb`) — or offline in Python (ml/quit_risk/train.py)
//                  and imported. Only a model that beats chance on the newer days is used.
//   4. Predict   — the newest active model scores each snapshot; until one is trained, a
//                  simple hand-set baseline is used.
//   5. Act + measure — high-risk learners get a nudge, except a random 10% "holdout" group,
//                  so we can measure whether the nudges actually help.
const db = require('../db');

const q = () => db.promise();
const DAY = 86400000;
const HORIZON = 14; // days we look ahead (label) and back (who counts as active)
const toDay = (v) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);
const addDays = (ymd, n) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / DAY);

const FEATURES = [
  'days_since_active', 'active_days_14', 'tasks_7d', 'tasks_prev_7d', 'focus_minutes_7d',
  'reviews_7d', 'streak', 'account_age_log', 'open_tasks_log', 'overdue_tasks_log', 'progress_pct',
];
// Plain-English reasons for the admin view, when a feature pushes risk up.
const REASON = {
  days_since_active: 'hasn’t studied for a few days',
  active_days_14: 'studied on few days lately',
  tasks_7d: 'finished few tasks this week',
  tasks_prev_7d: 'was more active the week before',
  focus_minutes_7d: 'little focus time this week',
  reviews_7d: 'stopped reviewing cards',
  streak: 'no current streak',
  account_age_log: 'new member',
  open_tasks_log: 'a large pile of open tasks',
  overdue_tasks_log: 'tasks are overdue',
  progress_pct: 'early in their roadmaps',
};

/* ---------- Data ---------- */
/** Everything needed to compute features, for all members (or one). */
async function loadHistory(userId = null) {
  const by = userId ? ' WHERE user_id = ?' : '';
  const params = userId ? [userId] : [];
  const [users] = await q().query(`SELECT id, created_at FROM users${userId ? ' WHERE id = ?' : ''}`, params);
  const [tasks] = await q().query(`SELECT a.user_id, a.day, a.tasks_done AS n FROM activity_days a${by.replace('user_id', 'a.user_id')}`, params);
  const [focus] = await q().query(`SELECT user_id, day, SUM(minutes) AS n FROM study_sessions${by} GROUP BY user_id, day`, params);
  const [reviews] = await q().query(`SELECT user_id, day, reviews AS n FROM review_days${by}`, params);
  const [taskRows] = await q().query(
    `SELECT r.user_id, t.created_at, t.completed_at, t.due_date, t.status FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id${userId ? ' WHERE r.user_id = ?' : ''}`, params);
  const h = new Map(users.map((u) => [u.id, { id: u.id, joined: toDay(u.created_at), tasks: new Map(), focus: new Map(), reviews: new Map(), list: [] }]));
  const add = (rows, key) => rows.forEach((r) => { const u = h.get(r.user_id); if (u && Number(r.n) > 0) u[key].set(toDay(r.day), Number(r.n)); });
  add(tasks, 'tasks'); add(focus, 'focus'); add(reviews, 'reviews');
  for (const t of taskRows) {
    const u = h.get(t.user_id);
    if (!u) continue;
    u.list.push({ created: toDay(t.created_at || u.joined), done: t.completed_at ? toDay(t.completed_at) : (t.status === 'done' ? toDay(t.created_at || u.joined) : null), due: t.due_date ? toDay(t.due_date) : null });
  }
  for (const u of h.values()) u.active = new Set([...u.tasks.keys(), ...u.focus.keys(), ...u.reviews.keys()]);
  return h;
}

const sumRange = (map, from, to) => { let s = 0; for (const [d, n] of map) if (d >= from && d <= to) s += n; return s; };

/** Features for one member as of the end of `day`, or null if they weren't active in the last 14 days. */
function featuresAt(u, day) {
  if (u.joined > day) return null;
  let last = null;
  let activeDays = 0;
  for (let i = 0; i < HORIZON; i++) {
    const d = addDays(day, -i);
    if (u.active.has(d)) { activeDays++; if (last === null) last = i; }
  }
  if (last === null) return null; // not a current learner
  let streak = 0;
  for (let d = u.active.has(day) ? day : addDays(day, -1); u.active.has(d); d = addDays(d, -1)) streak++;
  const open = u.list.filter((t) => t.created <= day && (!t.done || t.done > day));
  const total = u.list.filter((t) => t.created <= day).length;
  const done = total - open.length;
  return {
    days_since_active: last,
    active_days_14: activeDays,
    tasks_7d: sumRange(u.tasks, addDays(day, -6), day),
    tasks_prev_7d: sumRange(u.tasks, addDays(day, -13), addDays(day, -7)),
    focus_minutes_7d: sumRange(u.focus, addDays(day, -6), day),
    reviews_7d: sumRange(u.reviews, addDays(day, -6), day),
    streak,
    account_age_log: Math.log1p(Math.max(0, daysBetween(u.joined, day))),
    open_tasks_log: Math.log1p(open.length),
    overdue_tasks_log: Math.log1p(open.filter((t) => t.due && t.due < day).length),
    progress_pct: total ? Math.round((done / total) * 100) : 0,
  };
}

/** 1 = no learning activity in the 14 days after `day`, 0 = came back; null if we can't know yet. */
function labelAt(u, day, today) {
  if (addDays(day, HORIZON) >= today) return null;
  for (let i = 1; i <= HORIZON; i++) if (u.active.has(addDays(day, i))) return 0;
  return 1;
}

/* ---------- Model ---------- */
// Until a model is trained on real data: a sensible hand-set starting point (log-odds per unit).
const BASELINE = {
  kind: 'baseline', version: 'baseline-1', features: FEATURES,
  mean: FEATURES.map(() => 0), scale: FEATURES.map(() => 1),
  coef: [0.32, -0.22, -0.08, 0.03, -0.004, -0.01, -0.12, -0.15, 0.1, 0.25, -0.006],
  intercept: -1.0, metrics: null,
};

const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
const vectorOf = (model, f) => model.features.map((k) => Number(f[k]) || 0);
function predict(model, f) {
  const x = vectorOf(model, f);
  let z = model.intercept;
  for (let i = 0; i < x.length; i++) z += model.coef[i] * ((x[i] - model.mean[i]) / (model.scale[i] || 1));
  return sigmoid(z);
}
/** The features pushing this member's risk up the most, in plain words. */
function reasons(model, f, n = 2) {
  const x = vectorOf(model, f);
  return model.features
    .map((k, i) => ({ k, c: model.coef[i] * ((x[i] - model.mean[i]) / (model.scale[i] || 1)) }))
    .filter((r) => r.c > 0.05)
    .sort((a, b) => b.c - a.c)
    .slice(0, n)
    .map((r) => REASON[r.k] || r.k);
}

/** ROC AUC: the chance a random quitter is ranked above a random stayer. */
function auc(scores, labels) {
  const pairs = scores.map((s, i) => [s, labels[i]]).sort((a, b) => a[0] - b[0]);
  let rank = 0; let pos = 0; let sumPos = 0;
  for (let i = 0; i < pairs.length;) {
    let j = i; while (j < pairs.length && pairs[j][0] === pairs[i][0]) j++;
    const avg = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (pairs[k][1] === 1) { sumPos += avg; pos++; }
    rank = j; i = j;
  }
  const neg = rank - pos;
  return pos && neg ? (sumPos - (pos * (pos + 1)) / 2) / (pos * neg) : null;
}

function evaluate(model, rows) {
  const s = rows.map((r) => predict(model, r.f));
  const y = rows.map((r) => r.y);
  const eps = 1e-6;
  const logloss = s.reduce((a, p, i) => a - (y[i] * Math.log(Math.max(eps, p)) + (1 - y[i]) * Math.log(Math.max(eps, 1 - p))), 0) / Math.max(1, s.length);
  const top = s.map((p, i) => [p, y[i]]).sort((a, b) => b[0] - a[0]).slice(0, Math.max(1, Math.round(s.length * 0.2)));
  return {
    auc: auc(s, y), logloss,
    base_rate: y.reduce((a, b) => a + b, 0) / Math.max(1, y.length),
    precision_top20: top.reduce((a, r) => a + r[1], 0) / top.length,
    n: rows.length,
  };
}

/** Logistic regression (standardised features, balanced class weights, L2), batch gradient descent. */
function fitLogReg(rows, { l2 = 0.01, iters = 800, lr = 0.3 } = {}) {
  const X = rows.map((r) => FEATURES.map((k) => Number(r.f[k]) || 0));
  const y = rows.map((r) => r.y);
  const d = FEATURES.length;
  const mean = FEATURES.map((_, j) => X.reduce((s, x) => s + x[j], 0) / X.length);
  const scale = FEATURES.map((_, j) => Math.sqrt(X.reduce((s, x) => s + (x[j] - mean[j]) ** 2, 0) / X.length) || 1);
  const Z = X.map((x) => x.map((v, j) => (v - mean[j]) / scale[j]));
  const pos = y.reduce((a, b) => a + b, 0);
  const wPos = y.length / (2 * Math.max(1, pos));
  const wNeg = y.length / (2 * Math.max(1, y.length - pos));
  const coef = new Array(d).fill(0);
  let b = 0;
  for (let it = 0; it < iters; it++) {
    const g = new Array(d).fill(0);
    let gb = 0; let W = 0;
    for (let i = 0; i < Z.length; i++) {
      let z = b; for (let j = 0; j < d; j++) z += coef[j] * Z[i][j];
      const w = y[i] ? wPos : wNeg;
      const err = (sigmoid(z) - y[i]) * w;
      for (let j = 0; j < d; j++) g[j] += err * Z[i][j];
      gb += err; W += w;
    }
    for (let j = 0; j < d; j++) coef[j] -= lr * (g[j] / W + l2 * coef[j]);
    b -= lr * (gb / W);
  }
  return { kind: 'logreg', features: FEATURES, mean, scale, coef, intercept: b };
}

/**
 * Train with a time-based split: the oldest 75% of days to train, the newest 25% to test.
 * Returns { model, metrics, accepted } — accepted only with enough data and real signal.
 */
function train(rows, { minRows = 200, minPositives = 20 } = {}) {
  const sorted = rows.slice().sort((a, b) => (a.day < b.day ? -1 : 1));
  const positives = sorted.filter((r) => r.y === 1).length;
  if (sorted.length < minRows || positives < minPositives || sorted.length - positives < minPositives) {
    return { accepted: false, reason: `needs ${minRows}+ labelled snapshots with ${minPositives}+ of each outcome (have ${sorted.length}, ${positives} quit)` };
  }
  const cut = sorted[Math.floor(sorted.length * 0.75)].day;
  const trainRows = sorted.filter((r) => r.day < cut);
  const testRows = sorted.filter((r) => r.day >= cut);
  const model = fitLogReg(trainRows);
  const metrics = { ...evaluate(model, testRows), train_n: trainRows.length, baseline_auc: evaluate(BASELINE, testRows).auc, split_day: cut };
  // Use it only if it has real signal and isn't worse than the hand-set baseline on the same days.
  const accepted = metrics.auc !== null && metrics.auc >= 0.6 && metrics.auc >= (metrics.baseline_auc || 0) - 0.01;
  model.version = `logreg-${new Date().toISOString().slice(0, 10)}`;
  model.metrics = metrics;
  return { model, metrics, accepted, reason: accepted ? null : metrics.auc < 0.6 ? `test AUC ${metrics.auc?.toFixed(2)} is too close to chance` : 'not better than the baseline yet' };
}

/* ---------- Database glue ---------- */
let cached = null;
async function activeModel() {
  if (cached && Date.now() - cached.at < 10 * 60000) return cached.model;
  let model = BASELINE;
  try {
    const [[row]] = await q().query("SELECT params, metrics, trained_at FROM ml_models WHERE name = 'quit_risk' AND active = 1 ORDER BY id DESC LIMIT 1");
    if (row) { const m = JSON.parse(row.params); if (Array.isArray(m.coef) && m.coef.length === m.features.length) model = { ...m, metrics: row.metrics ? JSON.parse(row.metrics) : m.metrics, trained_at: row.trained_at }; }
  } catch { /* table missing → baseline */ }
  cached = { at: Date.now(), model };
  return model;
}

async function saveModel(model, metrics) {
  await q().query("UPDATE ml_models SET active = 0 WHERE name = 'quit_risk'");
  await q().query("INSERT INTO ml_models (name, version, params, metrics, active) VALUES ('quit_risk', ?, ?, ?, 1)", [model.version || 'imported', JSON.stringify({ ...model, metrics: undefined }), JSON.stringify(metrics || model.metrics || null)]);
  cached = null;
}

/** Holdout: a stable random 10% of members who never get the nudge, to measure if nudges help. */
const holdout = (userId) => ((Number(userId) * 2654435761) >>> 0) % 10 === 0;

/** Write snapshots (and scores) for `day`; returns them. Skips members not active in the last 14 days. */
async function snapshot(day, history = null, model = null) {
  const h = history || await loadHistory();
  const m = model || await activeModel();
  const out = [];
  for (const u of h.values()) {
    const f = featuresAt(u, day);
    if (!f) continue;
    const risk = predict(m, f);
    const [has] = await q().query('SELECT id FROM ml_snapshots WHERE user_id = ? AND day = ?', [u.id, day]);
    if (has.length) await q().query('UPDATE ml_snapshots SET features = ?, risk = ?, model = ? WHERE id = ?', [JSON.stringify(f), risk, m.version, has[0].id]);
    else await q().query('INSERT INTO ml_snapshots (user_id, day, features, risk, model, holdout) VALUES (?, ?, ?, ?, ?, ?)', [u.id, day, JSON.stringify(f), risk, m.version, holdout(u.id) ? 1 : 0]);
    out.push({ user_id: u.id, f, risk });
  }
  return out;
}

/** Fill in labels for snapshots old enough to know the outcome. */
async function fillLabels(today, history = null) {
  const h = history || await loadHistory();
  const [rows] = await q().query('SELECT id, user_id, day FROM ml_snapshots WHERE label IS NULL AND day < ?', [addDays(today, -HORIZON)]);
  let n = 0;
  for (const r of rows) {
    const u = h.get(r.user_id);
    if (!u) continue;
    const y = labelAt(u, toDay(r.day), today);
    if (y === null) continue;
    await q().query('UPDATE ml_snapshots SET label = ? WHERE id = ?', [y, r.id]);
    n++;
  }
  return n;
}

/** Rebuild snapshots for the past `days` days from activity history (so training can start right away). */
async function backfill(days = 120, today = new Date().toISOString().slice(0, 10)) {
  const h = await loadHistory();
  const m = await activeModel();
  let n = 0;
  for (let i = days; i >= 1; i--) n += (await snapshot(addDays(today, -i), h, m)).length;
  const labelled = await fillLabels(today, h);
  return { snapshots: n, labelled };
}

async function labelledRows() {
  const [rows] = await q().query('SELECT day, features, label FROM ml_snapshots WHERE label IS NOT NULL ORDER BY day');
  return rows.map((r) => ({ day: toDay(r.day), f: JSON.parse(r.features), y: Number(r.label) }));
}

/** Train on everything labelled so far; activates the new model only if it's good enough. */
async function trainFromDb() {
  const result = train(await labelledRows());
  if (result.accepted) await saveModel(result.model, result.metrics);
  return result;
}

module.exports = {
  FEATURES, BASELINE, HORIZON, featuresAt, labelAt, predict, reasons, auc, evaluate, fitLogReg, train,
  loadHistory, snapshot, fillLabels, backfill, labelledRows, trainFromDb, activeModel, saveModel, holdout, addDays,
};
