// Learning pack: placement check, AI flashcards with spaced repetition, and focus sessions.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, sendAIError } = require('../lib/gemini');
const { ownRoadmap, ownTask } = require('../lib/ownership');
const { getSettings, dayIn, addDays } = require('../lib/engagement');

const q = () => db.promise();
const aiLimit = rateLimit({ max: 40, name: 'study tools' });
const pad = (n) => String(n).padStart(2, '0');
const sqlTime = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const parse = (s, fb) => { try { return s ? (typeof s === 'string' ? JSON.parse(s) : s) : fb; } catch { return fb; } };
const toDay = (v) => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);

async function userDay(userId) {
  const s = await getSettings(userId).catch(() => ({ timezone: 'America/New_York' }));
  return dayIn(s.timezone);
}

/* =====================================================================
   Placement check — a short quiz before making a roadmap, so the AI can
   skip what the learner already knows.
   ===================================================================== */
router.post('/placement', auth, aiLimit, async (req, res) => {
  const topic = clean(req.body.topic, 120);
  if (!topic) return res.status(400).json({ message: 'Tell us the topic first.' });
  try {
    const data = await generateJSON(`You are writing a short placement check for someone about to learn "${topic}".
Write exactly 8 multiple-choice questions that move from basic to advanced (2 basic, 3 intermediate, 3 advanced).
Each question tests ONE core concept of ${topic} that a learning roadmap would teach. Questions must be answerable in under 30 seconds.
Each has 4 short options and exactly one correct answer.
Return JSON: { "questions": [ { "concept": "short concept name (2-4 words)", "level": "basic|intermediate|advanced", "question": "string", "options": ["a","b","c","d"], "correct": 0 } ] }`);
    const questions = (Array.isArray(data) ? data : data.questions || [])
      .map((x) => ({
        concept: clean(x.concept, 60) || 'General',
        level: ['basic', 'intermediate', 'advanced'].includes(x.level) ? x.level : 'intermediate',
        question: clean(x.question, 300),
        options: (Array.isArray(x.options) ? x.options : []).map((o) => clean(o, 160)).slice(0, 4),
        correct: Number.isInteger(x.correct) ? x.correct : parseInt(x.correct, 10),
      }))
      .filter((x) => x.question && x.options.length >= 2 && x.correct >= 0 && x.correct < x.options.length)
      .slice(0, 8);
    if (questions.length < 4) throw new Error('The AI response was not valid JSON. Please try again.');
    res.json({ topic, questions });
  } catch (err) {
    sendAIError(res, err, 'Could not create the placement check. Please try again.');
  }
});

/* =====================================================================
   Flashcards with spaced repetition — the FSRS memory model (lib/fsrs.js),
   personalised to each member once they have enough reviews (lib/memoryModel.js)
   ===================================================================== */
const FSRS = require('../lib/fsrs');
const GRADES = { again: 0, hard: 1, good: 2, easy: 3 }; // FSRS grade = this + 1
const RETENTIONS = [0.8, 0.85, 0.9, 0.95];

/** The member's memory model: personal weights (or the defaults) and their retention target. */
async function memoryFor(userId) {
  const s = await getSettings(userId).catch(() => ({}));
  const r = Number(s.review_retention);
  return { w: FSRS.weightsFrom(s.fsrs_w), retention: RETENTIONS.includes(r) ? r : 0.9, personal: !!s.fsrs_w, meta: parse(s.fsrs_meta, null) };
}

/** Next schedule for a card after a review. Returns { stability, difficulty, interval_days, reps, lapses, dueMs, R }. */
function schedule(card, grade, mem, now = Date.now()) {
  const state = FSRS.cardState(card);
  const o = FSRS.outcomes(mem.w, state, now, mem.retention)[grade + 1];
  const R = state ? FSRS.retrievability((now - state.last) / FSRS.DAY, state.S) : null;
  return {
    stability: o.S, difficulty: o.D, interval_days: o.days,
    reps: grade === 0 ? 0 : (Number(card.reps) || 0) + 1,
    lapses: (Number(card.lapses) || 0) + (grade === 0 && state ? 1 : 0),
    dueMs: o.dueMs, R, elapsed: state ? (now - state.last) / FSRS.DAY : null,
  };
}

/** What each button would schedule next — shown under the buttons ("10 min", "3 d"). */
function previews(card, mem) {
  const fmt = (ms) => {
    const m = Math.round((ms - Date.now()) / 60000);
    if (m < 60) return `${m} min`;
    const d = Math.round(m / 1440);
    return d < 30 ? `${d} d` : d < 365 ? `${Math.round(d / 30)} mo` : `${Math.round(d / 365)} y`;
  };
  return Object.fromEntries(Object.entries(GRADES).map(([k, g]) => [k, fmt(schedule(card, g, mem).dueMs)]));
}

/** Chance (0–1) the member still remembers this card right now, or null for new cards. */
function recallNow(card) {
  const st = FSRS.cardState(card);
  return st ? FSRS.retrievability((Date.now() - st.last) / FSRS.DAY, st.S) : null;
}

const cardOut = (c, mem) => ({
  id: c.id, front: c.front, back: c.back, roadmap_id: c.roadmap_id, task_id: c.task_id, reps: c.reps,
  interval_days: Number(c.interval_days) || 0, due_at: c.due_at, next: previews(c, mem),
  recall: recallNow(c) === null ? null : Math.round(recallNow(c) * 100),
});

async function insertCards(userId, cards, { roadmapId = null, taskId = null } = {}) {
  const now = sqlTime(new Date());
  let added = 0;
  for (const c of cards.slice(0, 30)) {
    const front = String(c.front || '').trim().slice(0, 600);
    const back = String(c.back || '').trim().slice(0, 1500);
    if (!front || !back) continue;
    await q().query('INSERT INTO flashcards (user_id, roadmap_id, task_id, front, back, due_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, roadmapId, taskId, front, back, now]);
    added++;
  }
  return added;
}

// Overview: totals, due now, reviewed today, decks per roadmap
router.get('/flashcards/summary', auth, async (req, res) => {
  try {
    const now = sqlTime(new Date());
    const today = await userDay(req.user.id);
    const [[t]] = await q().query(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN due_at IS NULL OR due_at <= ? THEN 1 ELSE 0 END) AS due,
              SUM(CASE WHEN interval_days >= 21 THEN 1 ELSE 0 END) AS mastered
       FROM flashcards WHERE user_id = ?`, [now, req.user.id]);
    const [decks] = await q().query(
      `SELECT f.roadmap_id, r.title, COUNT(*) AS total, SUM(CASE WHEN f.due_at IS NULL OR f.due_at <= ? THEN 1 ELSE 0 END) AS due
       FROM flashcards f LEFT JOIN roadmaps r ON r.id = f.roadmap_id WHERE f.user_id = ? GROUP BY f.roadmap_id, r.title ORDER BY due DESC`, [now, req.user.id]);
    const [days] = await q().query('SELECT day, reviews FROM review_days WHERE user_id = ? ORDER BY day DESC LIMIT 60', [req.user.id]);
    const set = new Set(days.filter((d) => d.reviews > 0).map((d) => toDay(d.day)));
    let cursor = set.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (set.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
    const todayRow = days.find((d) => toDay(d.day) === today);
    res.json({
      total: Number(t.total) || 0, due: Number(t.due) || 0, mastered: Number(t.mastered) || 0,
      reviewed_today: Number(todayRow?.reviews) || 0, streak,
      decks: decks.map((d) => ({ roadmap_id: d.roadmap_id, title: d.title || 'My own cards', total: Number(d.total), due: Number(d.due) || 0 })),
    });
  } catch (err) {
    console.error('[learning] summary', err.message);
    res.status(500).json({ message: 'Could not load your flashcards.' });
  }
});

// Cards due now (optionally for one roadmap; "none" = cards not tied to a roadmap)
router.get('/flashcards/due', auth, async (req, res) => {
  try {
    const now = sqlTime(new Date());
    const params = [req.user.id, now];
    let where = 'user_id = ? AND (due_at IS NULL OR due_at <= ?)';
    if (req.query.roadmap_id === 'none') where += ' AND roadmap_id IS NULL';
    else if (req.query.roadmap_id) { where += ' AND roadmap_id = ?'; params.push(parseInt(req.query.roadmap_id, 10) || 0); }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const [rows] = await q().query(`SELECT * FROM flashcards WHERE ${where} ORDER BY due_at, id LIMIT ${limit}`, params);
    const mem = await memoryFor(req.user.id);
    res.json({ cards: rows.map((c) => cardOut(c, mem)) });
  } catch (err) {
    console.error('[learning] due', err.message);
    res.status(500).json({ message: 'Could not load cards to review.' });
  }
});

// All cards in a deck (for browsing and editing)
router.get('/flashcards', auth, async (req, res) => {
  try {
    const params = [req.user.id];
    let where = 'user_id = ?';
    if (req.query.roadmap_id === 'none') where += ' AND roadmap_id IS NULL';
    else if (req.query.roadmap_id) { where += ' AND roadmap_id = ?'; params.push(parseInt(req.query.roadmap_id, 10) || 0); }
    const [rows] = await q().query(`SELECT * FROM flashcards WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT 500`, params);
    const mem = await memoryFor(req.user.id);
    res.json({ cards: rows.map((c) => cardOut(c, mem)) });
  } catch (err) {
    res.status(500).json({ message: 'Could not load cards.' });
  }
});

router.post('/flashcards', auth, async (req, res) => {
  const { front, back } = req.body || {};
  const roadmapId = req.body.roadmap_id ? parseInt(req.body.roadmap_id, 10) : null;
  if (!String(front || '').trim() || !String(back || '').trim()) return res.status(400).json({ message: 'Fill in both sides of the card.' });
  try {
    if (roadmapId && !(await ownRoadmap(roadmapId, req.user.id))) return res.status(404).json({ message: 'Roadmap not found.' });
    await insertCards(req.user.id, [{ front, back }], { roadmapId });
    res.json({ message: 'Card added' });
  } catch (err) {
    res.status(500).json({ message: 'Could not add the card.' });
  }
});

// AI: make cards from a task, a whole roadmap, or pasted notes
router.post('/flashcards/generate', auth, aiLimit, async (req, res) => {
  const b = req.body || {};
  try {
    let source = '';
    let roadmapId = null;
    let taskId = null;
    let count = 8;
    if (b.task_id) {
      const t = await ownTask(b.task_id, req.user.id);
      if (!t) return res.status(404).json({ message: 'Task not found.' });
      const [[m]] = await q().query('SELECT m.title AS module, r.id AS roadmap_id, r.title AS roadmap FROM modules m JOIN roadmaps r ON r.id = m.roadmap_id WHERE m.id = ?', [t.module_id]);
      const d = parse(t.details, {});
      const [notes] = await q().query('SELECT content FROM notes WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10', [t.id, req.user.id]);
      roadmapId = m?.roadmap_id || null; taskId = t.id; count = 6;
      source = `Roadmap: ${m?.roadmap}\nModule: ${m?.module}\nTask: ${t.title}\n${t.description || ''}\n${(d.steps || []).join('\n')}\n${d.lesson ? JSON.stringify(d.lesson).slice(0, 3000) : ''}\nLearner's notes:\n${notes.map((n) => n.content).join('\n')}`;
    } else if (b.roadmap_id) {
      const r = await ownRoadmap(b.roadmap_id, req.user.id);
      if (!r) return res.status(404).json({ message: 'Roadmap not found.' });
      const [mods] = await q().query('SELECT id, title, description FROM modules WHERE roadmap_id = ? ORDER BY order_index LIMIT 20', [r.id]);
      const ids = mods.map((m) => m.id);
      const [tasks] = ids.length ? await q().query('SELECT module_id, title FROM tasks WHERE module_id IN (?)', [ids]) : [[]];
      roadmapId = r.id; count = 12;
      source = `Roadmap: ${r.title}\n${r.description || ''}\n` + mods.map((m) => `Module: ${m.title} — ${m.description || ''}\n  Tasks: ${tasks.filter((t) => t.module_id === m.id).map((t) => t.title).join('; ')}`).join('\n');
    } else if (String(b.text || '').trim()) {
      source = `Topic: ${clean(b.topic, 120) || 'my notes'}\nNotes:\n${String(b.text).slice(0, 6000)}`;
      count = 10;
    } else {
      return res.status(400).json({ message: 'Pick a task or roadmap, or paste some notes.' });
    }
    const data = await generateJSON(`Create ${count} high-quality flashcards for spaced-repetition study from the material below.
Rules: one fact or idea per card; the front is a clear question (not yes/no); the back is a short, exact answer (1-3 sentences, may include a tiny example).
Cover the most important concepts a learner must remember. Don't repeat cards. No trivia about the course itself.
Material:
${source.slice(0, 7000)}
Return JSON: { "cards": [ { "front": "question", "back": "answer" } ] }`);
    const cards = (Array.isArray(data) ? data : data.cards || []).filter((c) => c && c.front && c.back);
    if (!cards.length) throw new Error('The AI response was not valid JSON. Please try again.');
    const added = await insertCards(req.user.id, cards, { roadmapId, taskId });
    res.json({ message: `${added} flashcards added`, added, roadmap_id: roadmapId });
  } catch (err) {
    sendAIError(res, err, 'Could not make flashcards. Please try again.');
  }
});

router.post('/flashcards/:id/review', auth, async (req, res) => {
  const grade = GRADES[String(req.body.grade || '').toLowerCase()];
  if (grade === undefined) return res.status(400).json({ message: 'Grade must be again, hard, good or easy.' });
  try {
    const [[card]] = await q().query('SELECT * FROM flashcards WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!card) return res.status(404).json({ message: 'Card not found.' });
    // Reviewed offline and synced later → schedule from when it really happened.
    const now = require('../lib/offline').queuedAt(req) || new Date();
    const mem = await memoryFor(req.user.id);
    const next = schedule(card, grade, mem, now.getTime());
    await q().query('UPDATE flashcards SET stability = ?, difficulty = ?, interval_days = ?, reps = ?, lapses = ?, due_at = ?, last_reviewed_at = ? WHERE id = ?',
      [next.stability, next.difficulty, next.interval_days, next.reps, next.lapses, sqlTime(new Date(next.dueMs)), sqlTime(now), card.id]);
    // Every review is kept: it's the training data for this member's personal memory model.
    await q().query('INSERT INTO flashcard_reviews (user_id, card_id, grade, reviewed_at, elapsed_days, predicted_r) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, card.id, grade + 1, sqlTime(now), next.elapsed, next.R]).catch((e) => console.warn('[learning] review log', e.message));
    const day = await userDay(req.user.id);
    const [upd] = await q().query('UPDATE review_days SET reviews = reviews + 1 WHERE user_id = ? AND day = ?', [req.user.id, day]);
    if (!upd.affectedRows) await q().query('INSERT INTO review_days (user_id, day, reviews) VALUES (?, ?, 1)', [req.user.id, day]).catch(() => {});
    await q().query('UPDATE user_stats SET xp_points = xp_points + 1 WHERE user_id = ?', [req.user.id]).catch(() => {});
    res.json({ again: grade === 0, interval_days: next.interval_days, due_at: sqlTime(new Date(next.dueMs)) });
  } catch (err) {
    console.error('[learning] review', err.message);
    res.status(500).json({ message: 'Could not save the review.' });
  }
});

/* ---------- Your memory model (personal FSRS) ---------- */
const MM = require('../lib/memoryModel');
const fitLimit = rateLimit({ max: 3, windowMs: 3600000, name: 'memory model updates' });

async function reviewHistory(userId) {
  const [rows] = await q().query('SELECT card_id, grade, reviewed_at FROM flashcard_reviews WHERE user_id = ? ORDER BY reviewed_at DESC LIMIT 6000', [userId]);
  return rows.map((r) => ({ card_id: r.card_id, grade: Number(r.grade), at: new Date(r.reviewed_at).getTime() }));
}

/** Fit and save a member's personal memory model. Used by the button below and the weekly scheduler job. */
async function personalise(userId) {
  const result = MM.fit(await reviewHistory(userId));
  const meta = { n: result.n, fitted_at: new Date().toISOString(), loss_default: result.loss_default ?? null, loss_fitted: result.loss_fitted ?? null, accepted: !!result.ok, reason: result.reason || null };
  await require('../lib/engagement').saveSettings(userId, { fsrs_meta: JSON.stringify(meta), ...(result.ok ? { fsrs_w: JSON.stringify(result.w.map((x) => +x.toFixed(5))) } : {}) });
  return { ...meta, personal: result.ok };
}

router.get('/memory-model', auth, async (req, res) => {
  try {
    const mem = await memoryFor(req.user.id);
    const [cards] = await q().query('SELECT stability, difficulty, reps, interval_days, ease, last_reviewed_at FROM flashcards WHERE user_id = ?', [req.user.id]);
    const rs = cards.map(recallNow).filter((x) => x !== null);
    const longTerm = MM.countLongTerm(await reviewHistory(req.user.id));
    const m = mem.meta;
    res.json({
      personal: mem.personal, retention: mem.retention, options: RETENTIONS,
      reviews: longTerm, needed: MM.MIN_REVIEWS,
      fitted_at: m?.fitted_at || null, last_result: m ? { accepted: m.accepted, reason: m.reason } : null,
      improvement: mem.personal && m?.loss_default ? Math.max(0, Math.round((1 - m.loss_fitted / m.loss_default) * 100)) : null,
      avg_recall: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 100) : null,
      fading: rs.filter((r) => r < mem.retention).length,
    });
  } catch (err) {
    console.error('[learning] memory model', err.message);
    res.status(500).json({ message: 'Could not load your memory model.' });
  }
});

router.put('/memory-model', auth, async (req, res) => {
  const r = Number(req.body?.retention);
  if (!RETENTIONS.includes(r)) return res.status(400).json({ message: 'Pick 80%, 85%, 90% or 95%.' });
  await require('../lib/engagement').saveSettings(req.user.id, { review_retention: r });
  res.json({ retention: r, message: `Cards will come back when your recall drops to ${Math.round(r * 100)}%` });
});

router.post('/memory-model/fit', auth, fitLimit, async (req, res) => {
  try {
    const out = await personalise(req.user.id);
    if (out.n < MM.MIN_REVIEWS) return res.status(400).json({ message: `Your memory model needs ${MM.MIN_REVIEWS} reviews spaced a day or more apart — you have ${out.n} so far.` });
    res.json({ ...out, message: out.personal ? 'Your memory model is now personalised to you.' : 'Checked — the standard model already predicts your memory well, so we kept it.' });
  } catch (err) {
    console.error('[learning] fit', err.message);
    res.status(500).json({ message: 'Could not update your memory model.' });
  }
});

router.put('/flashcards/:id', auth, async (req, res) => {
  const front = String(req.body.front || '').trim().slice(0, 600);
  const back = String(req.body.back || '').trim().slice(0, 1500);
  if (!front || !back) return res.status(400).json({ message: 'Fill in both sides of the card.' });
  const [r] = await q().query('UPDATE flashcards SET front = ?, back = ? WHERE id = ? AND user_id = ?', [front, back, req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Card not found.' });
  res.json({ message: 'Card updated' });
});

router.delete('/flashcards/:id', auth, async (req, res) => {
  const [r] = await q().query('DELETE FROM flashcards WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Card not found.' });
  res.json({ message: 'Card deleted' });
});

/* =====================================================================
   Focus sessions (Pomodoro timer) — study time per day and per roadmap
   ===================================================================== */
router.post('/focus/sessions', auth, async (req, res) => {
  const minutes = parseInt(req.body.minutes, 10);
  if (!(minutes >= 1 && minutes <= 240)) return res.status(400).json({ message: 'Sessions are 1–240 minutes.' });
  try {
    let roadmapId = req.body.roadmap_id ? parseInt(req.body.roadmap_id, 10) : null;
    let taskId = req.body.task_id ? parseInt(req.body.task_id, 10) : null;
    if (taskId) {
      const t = await ownTask(taskId, req.user.id);
      if (!t) taskId = null;
      else if (!roadmapId) {
        const [[m]] = await q().query('SELECT roadmap_id FROM modules WHERE id = ?', [t.module_id]);
        roadmapId = m?.roadmap_id || null;
      }
    }
    if (roadmapId && !(await ownRoadmap(roadmapId, req.user.id))) roadmapId = null;
    const at = require('../lib/offline').queuedAt(req); // logged offline → the day it happened
    const day = at ? dayIn((await getSettings(req.user.id).catch(() => ({}))).timezone, at) : await userDay(req.user.id);
    await q().query('INSERT INTO study_sessions (user_id, roadmap_id, task_id, minutes, day, label) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, roadmapId, taskId, minutes, day, clean(req.body.label, 160) || null]);
    await q().query('UPDATE user_stats SET xp_points = xp_points + ? WHERE user_id = ?', [Math.floor(minutes / 5), req.user.id]).catch(() => {});
    res.json({ message: `${minutes} minutes logged` });
  } catch (err) {
    console.error('[learning] session', err.message);
    res.status(500).json({ message: 'Could not save the session.' });
  }
});

router.get('/focus/summary', auth, async (req, res) => {
  try {
    const today = await userDay(req.user.id);
    const from = addDays(today, -29);
    const [rows] = await q().query('SELECT day, roadmap_id, minutes FROM study_sessions WHERE user_id = ? AND day >= ?', [req.user.id, from]);
    const byDay = new Map();
    const byRoadmap = new Map();
    for (const r of rows) {
      const d = toDay(r.day);
      byDay.set(d, (byDay.get(d) || 0) + r.minutes);
      if (d >= addDays(today, -6)) byRoadmap.set(r.roadmap_id || 0, (byRoadmap.get(r.roadmap_id || 0) || 0) + r.minutes);
    }
    const ids = [...byRoadmap.keys()].filter(Boolean);
    const [titles] = ids.length ? await q().query('SELECT id, title FROM roadmaps WHERE id IN (?) AND user_id = ?', [ids, req.user.id]) : [[]];
    const title = new Map(titles.map((t) => [t.id, t.title]));
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { day: d, minutes: byDay.get(d) || 0 }; });
    const [recent] = await q().query(
      `SELECT s.minutes, s.day, s.label, s.created_at, r.title AS roadmap, t.title AS task FROM study_sessions s
       LEFT JOIN roadmaps r ON r.id = s.roadmap_id LEFT JOIN tasks t ON t.id = s.task_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC, s.id DESC LIMIT 8`, [req.user.id]);
    res.json({
      today: byDay.get(today) || 0,
      week: last7.reduce((n, d) => n + d.minutes, 0),
      month: [...byDay.values()].reduce((n, m) => n + m, 0),
      sessions_today: rows.filter((r) => toDay(r.day) === today).length,
      last7,
      by_roadmap: [...byRoadmap.entries()].map(([id, minutes]) => ({ roadmap_id: id || null, title: id ? title.get(id) || 'Deleted roadmap' : 'General study', minutes })).sort((a, b) => b.minutes - a.minutes),
      recent,
    });
  } catch (err) {
    console.error('[learning] focus summary', err.message);
    res.status(500).json({ message: 'Could not load your study time.' });
  }
});

module.exports = router;
module.exports.personalise = personalise;
module.exports.schedule = schedule;
