// Cartoon lessons: the AI turns a topic into a short comic strip — Vo (the Learnvoy guide) explains
// it to Pip (a curious learner) with an everyday comparison — then a one-line summary and a quick
// check question. The app draws the panels itself (original characters, simple scenes), so a lesson
// costs one ordinary text request. Each lesson is saved per topic + language and shared: the next
// person learning the same thing gets it instantly, at no cost.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, sendAIError } = require('../lib/gemini');
const { ownTask } = require('../lib/ownership');
const { current: currentLang } = require('../lib/lang');

const q = () => db.promise();
const aiLimit = rateLimit({ max: 30, name: 'cartoon lessons' });
const remakeLimit = rateLimit({ max: 5, name: 'new cartoon versions' });

const SCENES = ['classroom', 'kitchen', 'street', 'park', 'office', 'space', 'library', 'shop', 'home', 'lab', 'stage', 'beach'];
const MOODS = ['happy', 'thinking', 'surprised', 'explaining', 'excited', 'confused'];
const WHO = ['vo', 'pip'];

const clean = (s, max) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9À-￿]+/g, ' ').trim();
const keyFor = (lang, topic, context) => crypto.createHash('sha1').update(`${lang}|${norm(topic)}|${norm(context)}`).digest('hex');
const isEmoji = (s) => /^\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*$/u.test(s);

/** Keep only what the comic viewer understands; the AI's reply is never trusted as-is. */
function sanitise(data, topic) {
  const panels = (Array.isArray(data?.panels) ? data.panels : []).slice(0, 6).map((p) => ({
    scene: SCENES.includes(p?.scene) ? p.scene : 'classroom',
    props: (Array.isArray(p?.props) ? p.props : []).map((x) => String(x).trim()).filter(isEmoji).slice(0, 3),
    caption: clean(p?.caption, 140) || null,
    lines: (Array.isArray(p?.lines) ? p.lines : []).slice(0, 3).map((l) => ({
      who: WHO.includes(l?.who) ? l.who : 'vo',
      mood: MOODS.includes(l?.mood) ? l.mood : 'happy',
      text: clean(l?.text, 220),
    })).filter((l) => l.text),
  })).filter((p) => p.lines.length);
  if (panels.length < 3) throw new Error('The AI response was not valid JSON. Please try again.');
  const quiz = data?.quiz && Array.isArray(data.quiz.options) && data.quiz.options.length >= 2 ? {
    question: clean(data.quiz.question, 200),
    options: data.quiz.options.slice(0, 4).map((o) => clean(o, 120)),
    answer: Math.min(Math.max(0, parseInt(data.quiz.answer, 10) || 0), Math.min(3, data.quiz.options.length - 1)),
    why: clean(data.quiz.why, 240),
  } : null;
  return {
    title: clean(data?.title, 120) || clean(topic, 120),
    analogy: clean(data?.analogy, 160),
    panels,
    summary: clean(data?.summary, 260),
    quiz: quiz && quiz.question && quiz.options.every(Boolean) ? quiz : null,
  };
}

async function writeComic(topic, context) {
  const data = await generateJSON(`You write a short comic-strip lesson that makes a topic easy for anyone — even a 12-year-old or someone new to the field.
Characters (always the same, original — never use or mention any famous cartoon character):
- "vo": Vo, the friendly Learnvoy guide who explains with everyday comparisons.
- "pip": Pip, a curious learner who asks the questions real beginners ask and sometimes gets it a bit wrong first.
Topic: ${topic}
${context ? `Context (the learner's course): ${context}` : ''}
Rules:
- 4 to 6 panels. Build the idea step by step around ONE everyday comparison (e.g. an API is like a waiter between you and the kitchen).
- 1 to 3 short speech lines per panel, each under 25 words. Plain words; explain any jargon right away.
- Must be factually correct. Show a tiny concrete example where it helps (numbers, a short code word, a real situation).
- scene: one of ${SCENES.join(', ')}. props: 0-3 single emoji that fit the scene. mood: one of ${MOODS.join(', ')}.
- caption: optional short narration for the panel, or null.
- End with a one-sentence summary and a 3-option check question (answer = index of the right option).
Return JSON: { "title": "...", "analogy": "X is like Y", "panels": [ { "scene": "kitchen", "props": ["🍽️"], "caption": null, "lines": [ { "who": "pip", "mood": "confused", "text": "..." }, { "who": "vo", "mood": "explaining", "text": "..." } ] } ], "summary": "...", "quiz": { "question": "...", "options": ["...", "...", "..."], "answer": 0, "why": "..." } }`);
  return sanitise(data, topic);
}

const out = (row) => ({ id: row.id, topic: row.topic, lang: row.lang, ...JSON.parse(row.content), created_at: row.created_at });

/** Find the shared lesson for this topic + language, or make it. */
async function getOrMake(userId, topic, context) {
  const lang = currentLang();
  const key = keyFor(lang, topic, context);
  let [[row]] = await q().query('SELECT * FROM cartoon_lessons WHERE cache_key = ?', [key]);
  let fresh = false;
  if (!row) {
    const comic = await writeComic(topic, context);
    try {
      await q().query('INSERT INTO cartoon_lessons (cache_key, lang, topic, context, content) VALUES (?, ?, ?, ?, ?)', [key, lang, clean(topic, 300), clean(context, 300) || null, JSON.stringify(comic)]);
    } catch { /* someone else made it at the same moment — use theirs */ }
    [[row]] = await q().query('SELECT * FROM cartoon_lessons WHERE cache_key = ?', [key]);
    fresh = true;
  }
  await q().query('UPDATE cartoon_lessons SET uses = uses + 1 WHERE id = ?', [row.id]).catch(() => {});
  await q().query('DELETE FROM cartoon_views WHERE user_id = ? AND lesson_id = ?', [userId, row.id]).catch(() => {});
  await q().query('INSERT INTO cartoon_views (user_id, lesson_id) VALUES (?, ?)', [userId, row.id]).catch(() => {});
  return { ...out(row), fresh };
}

// POST /cartoons { task_id } or { topic } → the comic (cached or newly made)
router.post('/', auth, async (req, res, next) => {
  // Cached lessons don't count against the AI limit — only new ones do.
  try {
    let topic = clean(req.body?.topic, 200);
    let context = '';
    if (req.body?.task_id) {
      const t = await ownTask(req.body.task_id, req.user.id);
      if (!t) return res.status(404).json({ message: 'Task not found.' });
      const [[m]] = await q().query('SELECT m.title AS module, r.title AS roadmap FROM modules m JOIN roadmaps r ON r.id = m.roadmap_id WHERE m.id = ?', [t.module_id]);
      topic = clean(t.title, 200);
      context = [m?.roadmap, m?.module].filter(Boolean).join(' › ');
    }
    if (topic.length < 2) return res.status(400).json({ message: 'Tell us what the cartoon should explain.' });
    const [[cached]] = await q().query('SELECT id FROM cartoon_lessons WHERE cache_key = ?', [keyFor(currentLang(), topic, context)]);
    req.cartoon = { topic, context };
    if (cached) return res.json(await getOrMake(req.user.id, topic, context));
    return next();
  } catch (err) {
    console.error('[cartoons] find', err.message);
    return res.status(500).json({ message: 'Could not load the cartoon lesson.' });
  }
}, aiLimit, async (req, res) => {
  try {
    res.json(await getOrMake(req.user.id, req.cartoon.topic, req.cartoon.context));
  } catch (err) {
    sendAIError(res, err, 'Could not draw this cartoon lesson right now. Please try again.');
  }
});

// GET /cartoons — the member's recent cartoon lessons
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await q().query(
      `SELECT c.id, c.topic, c.lang, c.content, v.viewed_at FROM cartoon_views v JOIN cartoon_lessons c ON c.id = v.lesson_id
       WHERE v.user_id = ? ORDER BY v.viewed_at DESC, v.id DESC LIMIT 30`, [req.user.id]);
    res.json(rows.map((r) => { const c = JSON.parse(r.content); return { id: r.id, topic: r.topic, lang: r.lang, title: c.title, analogy: c.analogy, panels: c.panels.length, viewed_at: r.viewed_at }; }));
  } catch (err) {
    res.status(500).json({ message: 'Could not load your cartoon lessons.' });
  }
});

// GET /cartoons/:id
router.get('/:id', auth, async (req, res) => {
  const [[row]] = await q().query('SELECT * FROM cartoon_lessons WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Cartoon not found.' });
  res.json(out(row));
});

// POST /cartoons/:id/report { reason } — "something is wrong in this cartoon"
router.post('/:id/report', auth, async (req, res) => {
  const reason = clean(req.body?.reason, 500);
  if (reason.length < 3) return res.status(400).json({ message: 'Tell us briefly what’s wrong.' });
  const [[row]] = await q().query('SELECT id FROM cartoon_lessons WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Cartoon not found.' });
  await q().query('INSERT INTO cartoon_reports (lesson_id, user_id, reason) VALUES (?, ?, ?)', [row.id, req.user.id, reason]);
  await q().query('UPDATE cartoon_lessons SET reports = reports + 1 WHERE id = ?', [row.id]);
  res.json({ message: 'Thanks — we’ll check it. You can also make a new version right away.' });
});

// POST /cartoons/:id/remake — draw a fresh version (replaces the shared one)
router.post('/:id/remake', auth, remakeLimit, async (req, res) => {
  try {
    const [[row]] = await q().query('SELECT * FROM cartoon_lessons WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ message: 'Cartoon not found.' });
    const comic = await require('../lib/lang').run(row.lang, () => writeComic(row.topic, row.context));
    await q().query('UPDATE cartoon_lessons SET content = ?, version = version + 1, reports = 0 WHERE id = ?', [JSON.stringify(comic), row.id]);
    const [[fresh]] = await q().query('SELECT * FROM cartoon_lessons WHERE id = ?', [row.id]);
    res.json(out(fresh));
  } catch (err) {
    sendAIError(res, err, 'Could not draw a new version right now. Please try again.');
  }
});

module.exports = router;
module.exports.sanitise = sanitise;
