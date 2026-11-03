// Practice exercises for a roadmap task.
//  • Code (JavaScript, Python, SQL, HTML & CSS): the AI writes instructions, starter code, a working
//    solution and tests. Code always runs in the learner's browser, in a locked-down sandbox — never
//    on this server. Before an exercise is shown, the browser checks the solution passes its own tests
//    (and the starter doesn't); a broken exercise is rewritten automatically.
//  • Other fields: a short written answer graded against a hidden checklist, or a numeric answer
//    checked here with a tolerance.
// Hints nudge without giving the answer; the solution unlocks after 3 tries (or once you pass).
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, generateText, sendAIError } = require('../lib/gemini');
const { ownTask } = require('../lib/ownership');

const q = () => db.promise();
const makeLimit = rateLimit({ max: 25, name: 'practice exercises' });
const hintLimit = rateLimit({ max: 60, name: 'hints and grading' });

const CODE = ['javascript', 'python', 'sql', 'html'];
const KINDS = [...CODE, 'written', 'numeric'];
const XP = 15;
const MAX_REWRITES = 2;
const SOLUTION_AFTER = 3;

const clip = (s, max) => String(s ?? '').slice(0, max);
const line = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const parse = (v, d) => { if (v == null || v === '') return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };

/** The task with its module and roadmap, only if it belongs to this member. */
async function taskInfo(taskId, userId) {
  const t = await ownTask(taskId, userId);
  if (!t) return null;
  const [[m]] = await q().query('SELECT m.title AS module_title, r.id AS roadmap_id, r.title AS roadmap_title FROM modules m JOIN roadmaps r ON r.id = m.roadmap_id WHERE m.id = ?', [t.module_id]);
  return { id: t.id, title: t.title, description: t.description || '', status: t.status, due_date: t.due_date, priority: t.priority, ...(m || {}) };
}

async function ownExercise(id, userId) {
  const [[e]] = await q().query('SELECT * FROM exercises WHERE id = ? AND user_id = ?', [id, userId]);
  return e || null;
}

/** What the page may see. The solution (and the hidden checklist / numeric answer) stay here,
 *  except while the browser is checking a new code exercise works, or once it's unlocked. */
function view(e, { withSolution = false } = {}) {
  const extra = parse(e.extra, {});
  const unlocked = e.status === 'passed' || e.attempts >= SOLUTION_AFTER;
  const out = {
    id: e.id, task_id: e.task_id, kind: e.kind, title: e.title, instructions: e.prompt,
    starter: e.starter || '', code: e.code ?? null, setup: e.setup || '', status: e.status,
    attempts: e.attempts, best: e.best, hints: parse(e.hints, []).slice(0, Number(e.hints_used) || 0),
    hints_left: Math.max(0, parse(e.hints, []).length - (Number(e.hints_used) || 0)),
    solution_after: SOLUTION_AFTER, solution_unlocked: unlocked,
    passed_at: e.passed_at || null, last_result: parse(e.last_result, null),
  };
  if (CODE.includes(e.kind) && e.kind !== 'sql') out.tests = parse(e.tests, []);
  if (e.kind === 'sql') { out.expected = parse(e.tests, null); out.ordered = !!extra.ordered; }
  if (e.kind === 'numeric') out.unit = extra.unit || '';
  if (withSolution) out.solution = e.solution || '';
  return out;
}

/* ---------- Writing an exercise ---------- */
function prompt(task, kind, problem) {
  return `You design ONE short hands-on practice exercise (10–20 minutes) for a learner working on this task from their learning roadmap.
Roadmap: ${task.roadmap_title || ''}
Module: ${task.module_title || ''}
Task: ${task.title}${task.description ? ` — ${task.description}` : ''}

Exercise types:
- "javascript": write a function in plain modern JavaScript (no DOM, no packages, no network).
- "python": write a function in Python 3 (standard library only; no input(), files or network).
- "sql": write one SQLite query against small tables you create.
- "html": build a small web page — one HTML document with a <style> tag (no external files).
- "written": answer a question in a short paragraph (for topics that aren't about code).
- "numeric": solve a problem whose answer is one number (maths, science, finance, engineering…).
${kind ? `Use type "${kind}".` : 'Choose the type that fits the task best. Use a code type only when the task is about programming, web pages or databases.'}

Return JSON only:
{
  "type": "<one of the types>",
  "title": "short title",
  "instructions": "Markdown: what to build or answer, with one worked example (input → output) for code types. Name the exact function the learner must write.",
  "hints": ["3 short hints, from gentle to specific — none may contain the answer or solution code"],
  For "javascript" and "python":
    "starter": "the function signature with a TODO comment and a placeholder return",
    "solution": "complete working code",
    "tests": [{ "name": "what this checks, in plain words", "code": "…" }]  — 3 to 6 tests, including one edge case.
      JavaScript test code: statements calling the learner's function with assertEqual(actual, expected) or assert(condition, "message").
      Python test code: assert statements with a message, e.g. assert add(2, 3) == 5, "add(2, 3) should be 5".
  For "html":
    "starter": "a complete small HTML document with TODO comments",
    "solution": "a complete HTML document that meets every requirement",
    "tests": [{ "name": "…", "code": "JavaScript using assert(condition, \\"message\\"), document.querySelector(…) and getComputedStyle(…)" }] — 3 to 6 tests.
  For "sql":
    "setup": "CREATE TABLE and INSERT statements (SQLite): 1–3 small tables, 5–12 rows each, realistic data",
    "starter": "-- Write your query here",
    "solution": "the query",
    "ordered": true if the instructions ask for a specific row order, otherwise false
  For "written":
    "rubric": ["3 to 5 key points a good answer covers"],
    "sample": "a model answer (4–6 sentences)"
  For "numeric":
    "answer": <number>, "tolerance": <allowed absolute difference, e.g. 0.01>, "unit": "unit or empty string",
    "explanation": "the worked solution, step by step"
}
Rules: the solution must pass every test and the starter must not; tests must only use the learner's function, standard features and the helpers named above; keep code short and beginner-friendly unless the task is advanced. Code and JSON keys stay in English.${problem ? `\n\nYour previous attempt was broken — ${problem}. Write a new exercise that works.` : ''}`;
}

/** Keep only what the page understands; never trust the AI's reply as-is. */
function sanitise(data, wanted) {
  const type = KINDS.includes(data?.type) ? data.type : null;
  if (!type || (wanted && type !== wanted)) throw new Error('The AI response was not valid JSON. Please try again.');
  const out = {
    kind: type,
    title: line(data.title, 150) || 'Practice',
    prompt: clip(data.instructions, 6000),
    hints: (Array.isArray(data.hints) ? data.hints : []).map((h) => line(h, 400)).filter(Boolean).slice(0, 4),
    starter: '', solution: '', tests: null, setup: '', extra: {},
  };
  if (!out.prompt.trim()) throw new Error('The AI response was not valid JSON. Please try again.');
  if (CODE.includes(type)) {
    out.starter = clip(data.starter, 20000);
    out.solution = clip(data.solution, 20000);
    if (!out.solution.trim()) throw new Error('The AI response was not valid JSON. Please try again.');
  }
  if (type === 'javascript' || type === 'python' || type === 'html') {
    out.tests = (Array.isArray(data.tests) ? data.tests : []).slice(0, 8)
      .map((t, i) => ({ name: line(t?.name, 160) || `Test ${i + 1}`, code: clip(t?.code, 3000) }))
      .filter((t) => t.code.trim());
    if (!out.tests.length) throw new Error('The AI response was not valid JSON. Please try again.');
  }
  if (type === 'sql') {
    out.setup = clip(data.setup, 20000);
    out.starter = out.starter || '-- Write your query here\n';
    out.extra.ordered = !!data.ordered;
    if (!out.setup.trim()) throw new Error('The AI response was not valid JSON. Please try again.');
  }
  if (type === 'written') {
    out.extra.rubric = (Array.isArray(data.rubric) ? data.rubric : []).map((r) => line(r, 300)).filter(Boolean).slice(0, 6);
    out.solution = clip(data.sample, 4000);
    if (!out.extra.rubric.length) throw new Error('The AI response was not valid JSON. Please try again.');
  }
  if (type === 'numeric') {
    const answer = Number(data.answer);
    if (!Number.isFinite(answer)) throw new Error('The AI response was not valid JSON. Please try again.');
    const tol = Math.abs(Number(data.tolerance));
    out.extra.answer = answer;
    out.extra.tolerance = Number.isFinite(tol) && tol > 0 ? Math.min(tol, Math.abs(answer) * 0.05 || 0.5) : Math.max(1e-6, Math.abs(answer) * 1e-3);
    out.extra.unit = line(data.unit, 30);
    out.solution = clip(data.explanation, 4000);
  }
  return out;
}

async function writeExercise(task, kind, problem) {
  return sanitise(await generateJSON(prompt(task, kind, problem)), kind);
}

const STATUS_NEW = (kind) => (CODE.includes(kind) ? 'pending' : 'ready');

/* ---------- Routes ---------- */

// The task, and its latest exercise (if any).
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const task = await taskInfo(req.params.taskId, req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const [[e]] = await q().query('SELECT * FROM exercises WHERE task_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1', [task.id, req.user.id]);
    // A code exercise that hasn't been checked yet still needs its solution for that check.
    res.json({ task, exercise: e ? view(e, { withSolution: e.status === 'pending' }) : null });
  } catch (err) {
    console.error('[practice] get', err.message);
    res.status(500).json({ message: 'Could not load practice.' });
  }
});

// A new exercise for a task. kind: one of KINDS, or empty to let the AI choose.
router.post('/', auth, makeLimit, async (req, res) => {
  const kind = KINDS.includes(req.body?.kind) ? req.body.kind : null;
  try {
    const task = await taskInfo(req.body?.task_id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const x = await writeExercise(task, kind);
    const [r] = await q().query(
      `INSERT INTO exercises (user_id, task_id, kind, title, prompt, starter, solution, tests, setup, hints, extra, status, wanted_kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, task.id, x.kind, x.title, x.prompt, x.starter, x.solution, x.tests ? JSON.stringify(x.tests) : null, x.setup, JSON.stringify(x.hints), JSON.stringify(x.extra), STATUS_NEW(x.kind), kind]
    );
    const e = await ownExercise(r.insertId, req.user.id);
    res.json({ exercise: view(e, { withSolution: e.status === 'pending' }) });
  } catch (err) {
    sendAIError(res, err, 'Could not make an exercise. Please try again.');
  }
});

// The browser checked a new code exercise: ok → ready; broken → rewritten (up to MAX_REWRITES times).
// For SQL, `expected` is the result of the solution query, kept to check the learner's query.
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const e = await ownExercise(req.params.id, req.user.id);
    if (!e) return res.status(404).json({ message: 'Exercise not found' });
    if (e.status !== 'pending') return res.json({ exercise: view(e) });
    if (req.body?.ok) {
      let tests = e.tests;
      if (e.kind === 'sql') {
        const exp = req.body.expected;
        if (!exp || !Array.isArray(exp.columns) || !Array.isArray(exp.values)) return res.status(400).json({ message: 'Missing the expected result.' });
        tests = JSON.stringify({ columns: exp.columns.slice(0, 30).map((c) => line(c, 80)), values: exp.values.slice(0, 500).map((r) => (Array.isArray(r) ? r.slice(0, 30) : [])) });
      }
      await q().query("UPDATE exercises SET status = 'ready', tests = ? WHERE id = ?", [tests, e.id]);
      return res.json({ exercise: view(await ownExercise(e.id, req.user.id)) });
    }
    const problem = line(req.body?.error, 600) || 'the solution did not pass its own tests';
    if ((Number(e.rewrites) || 0) >= MAX_REWRITES) {
      await q().query('DELETE FROM exercises WHERE id = ?', [e.id]);
      return res.status(502).json({ message: 'The AI couldn’t make a working exercise for this task. Try again, or pick a different language.' });
    }
    const task = await taskInfo(e.task_id, req.user.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const x = await writeExercise(task, e.wanted_kind || e.kind, problem);
    await q().query(
      `UPDATE exercises SET kind = ?, title = ?, prompt = ?, starter = ?, solution = ?, tests = ?, setup = ?, hints = ?, extra = ?, status = ?, rewrites = rewrites + 1 WHERE id = ?`,
      [x.kind, x.title, x.prompt, x.starter, x.solution, x.tests ? JSON.stringify(x.tests) : null, x.setup, JSON.stringify(x.hints), JSON.stringify(x.extra), STATUS_NEW(x.kind), e.id]
    );
    const fresh = await ownExercise(e.id, req.user.id);
    res.json({ exercise: view(fresh, { withSolution: fresh.status === 'pending' }), rewritten: true });
  } catch (err) {
    sendAIError(res, err, 'Could not fix the exercise. Please try again.');
  }
});

// Save the learner's code (draft).
router.put('/:id/code', auth, async (req, res) => {
  try {
    const e = await ownExercise(req.params.id, req.user.id);
    if (!e) return res.status(404).json({ message: 'Exercise not found' });
    await q().query('UPDATE exercises SET code = ? WHERE id = ?', [clip(req.body?.code, 50000), e.id]);
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ message: 'Could not save your code.' });
  }
});

/** First pass: mark it, add XP. Returns the XP earned (0 if it was already passed). */
async function markPassed(e, userId) {
  if (e.status === 'passed') return 0;
  await q().query("UPDATE exercises SET status = 'passed', passed_at = CURRENT_TIMESTAMP WHERE id = ?", [e.id]);
  await q().query('UPDATE user_stats SET xp_points = xp_points + ? WHERE user_id = ?', [XP, userId]).catch(() => {});
  await q().query('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [userId, 'Practice', `Solved: ${e.title}`]).catch(() => {});
  return XP;
}

// A code check finished in the browser: record the attempt (and the pass).
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const e = await ownExercise(req.params.id, req.user.id);
    if (!e) return res.status(404).json({ message: 'Exercise not found' });
    if (!CODE.includes(e.kind) || e.status === 'pending') return res.status(400).json({ message: 'This exercise isn’t ready yet.' });
    const total = Math.max(0, Math.min(50, parseInt(req.body?.total, 10) || 0));
    const passed = Math.max(0, Math.min(total, parseInt(req.body?.passed, 10) || 0));
    const pct = total ? Math.round((passed / total) * 100) : 0;
    const result = { passed, total, at: new Date().toISOString() };
    await q().query('UPDATE exercises SET attempts = attempts + 1, best = ?, code = ?, last_result = ? WHERE id = ?',
      [Math.max(Number(e.best) || 0, pct), clip(req.body?.code, 50000), JSON.stringify(result), e.id]);
    const xp = total > 0 && passed === total ? await markPassed(e, req.user.id) : 0;
    res.json({ exercise: view(await ownExercise(e.id, req.user.id)), xp, passed: total > 0 && passed === total });
  } catch (err) {
    console.error('[practice] submit', err.message);
    res.status(500).json({ message: 'Could not save your result.' });
  }
});

// Written / numeric answers are checked here.
router.post('/:id/answer', auth, hintLimit, async (req, res) => {
  try {
    const e = await ownExercise(req.params.id, req.user.id);
    if (!e) return res.status(404).json({ message: 'Exercise not found' });
    const extra = parse(e.extra, {});
    let result;
    if (e.kind === 'numeric') {
      const raw = String(req.body?.answer ?? '').replace(/,/g, '').trim();
      const n = Number(raw);
      if (!raw || !Number.isFinite(n)) return res.status(400).json({ message: 'Enter a number.' });
      const ok = Math.abs(n - extra.answer) <= extra.tolerance;
      result = { score: ok ? 100 : 0, passed: ok, feedback: ok ? 'Correct!' : `Not quite — ${n} isn’t the answer. Check your steps and units, then try again.` };
    } else if (e.kind === 'written') {
      const answer = clip(req.body?.answer, 6000).trim();
      if (answer.length < 20) return res.status(400).json({ message: 'Write a little more (a few sentences).' });
      const g = await generateJSON(`Grade a learner's short written answer fairly and kindly.
Question: ${e.prompt}
A good answer covers these points: ${(extra.rubric || []).map((r, i) => `${i + 1}. ${r}`).join(' ')}
Learner's answer: """${answer}"""
Return JSON only: { "score": 0-100, "covered": ["points they covered"], "missing": ["points they missed, phrased as what to add"], "feedback": "2–3 encouraging sentences" }`);
      const score = Math.max(0, Math.min(100, Math.round(Number(g?.score) || 0)));
      result = {
        score, passed: score >= 70, feedback: line(g?.feedback, 600),
        covered: (Array.isArray(g?.covered) ? g.covered : []).map((x) => line(x, 200)).slice(0, 6),
        missing: (Array.isArray(g?.missing) ? g.missing : []).map((x) => line(x, 200)).slice(0, 6),
      };
      await q().query('UPDATE exercises SET code = ? WHERE id = ?', [answer, e.id]);
    } else {
      return res.status(400).json({ message: 'This exercise is checked in the editor.' });
    }
    await q().query('UPDATE exercises SET attempts = attempts + 1, best = ?, last_result = ? WHERE id = ?', [Math.max(Number(e.best) || 0, result.score), JSON.stringify({ ...result, at: new Date().toISOString() }), e.id]);
    const xp = result.passed ? await markPassed(e, req.user.id) : 0;
    res.json({ result, xp, exercise: view(await ownExercise(e.id, req.user.id)) });
  } catch (err) {
    sendAIError(res, err, 'Could not check your answer. Please try again.');
  }
});

// The next hint. Starts with the exercise's own hints; after those, the AI looks at the code.
router.post('/:id/hint', auth, hintLimit, async (req, res) => {
  try {
    const e = await ownExercise(req.params.id, req.user.id);
    if (!e) return res.status(404).json({ message: 'Exercise not found' });
    const hints = parse(e.hints, []);
    const used = Number(e.hints_used) || 0;
    if (used < hints.length) {
      await q().query('UPDATE exercises SET hints_used = hints_used + 1 WHERE id = ?', [e.id]);
      return res.json({ hint: hints[used], exercise: view(await ownExercise(e.id, req.user.id)) });
    }
    const code = clip(req.body?.code, 8000);
    const failing = (Array.isArray(req.body?.failing) ? req.body.failing : []).slice(0, 6).map((f) => `- ${line(f?.name, 160)}: ${line(f?.message, 300)}`).join('\n');
    const hint = await generateText(`The learner is working on this exercise:
${e.prompt}

Their current ${e.kind === 'written' || e.kind === 'numeric' ? 'answer' : 'code'}:
"""
${code || '(nothing yet)'}
"""
${failing ? `Failing checks:\n${failing}\n` : ''}
Give ONE short hint (2–4 sentences) that helps them take the next step. Point to the line or idea that needs attention. Do NOT give the answer or write corrected code.`,
    'You are a patient, encouraging tutor. You never reveal full solutions.');
    res.json({ hint: clip(hint, 1500).trim(), exercise: view(e) });
  } catch (err) {
    sendAIError(res, err, 'Could not get a hint. Please try again.');
  }
});

// The model solution — after a few tries, or once you've passed.
router.get('/:id/solution', auth, async (req, res) => {
  try {
    const e = await ownExercise(req.params.id, req.user.id);
    if (!e) return res.status(404).json({ message: 'Exercise not found' });
    if (e.status !== 'passed' && e.attempts < SOLUTION_AFTER) return res.status(403).json({ message: `Keep going — the solution unlocks after ${SOLUTION_AFTER} tries.` });
    const extra = parse(e.extra, {});
    res.json({ solution: e.solution || '', answer: e.kind === 'numeric' ? extra.answer : undefined, unit: extra.unit || undefined, rubric: e.kind === 'written' ? extra.rubric : undefined });
  } catch (err) {
    res.status(500).json({ message: 'Could not load the solution.' });
  }
});

module.exports = router;
module.exports._test = { sanitise, view };
