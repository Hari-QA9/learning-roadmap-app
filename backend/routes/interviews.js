// AI mock interviews: realistic questions for a job (or role), feedback on every answer, and a final report.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, sendAIError } = require('../lib/gemini');
const { resumeForPrompt } = require('../lib/resumeText');

const q = () => db.promise();
const aiLimit = rateLimit({ max: 60, name: 'interview requests' });
const parse = (v, d) => { if (!v) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };
const TYPES = { behavioral: 'behavioral (STAR-style) questions', technical: 'technical / role-specific knowledge questions', mixed: 'a realistic mix of behavioral and role-specific questions' };

function shape(row) {
  return {
    id: row.id, role: row.role, company: row.company, job_id: row.job_id, type: row.type, created_at: row.created_at,
    questions: parse(row.questions, []), answers: parse(row.answers, []), feedback: parse(row.feedback, []), report: parse(row.report, null),
  };
}

async function own(id, userId) {
  const [rows] = await q().query('SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?', [id, userId]);
  return rows[0] || null;
}

async function resumeText(userId) {
  const [r] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ?', [userId]).catch(() => [[]]);
  return r[0] ? resumeForPrompt(r[0].resume_data) : 'No resume saved.';
}

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await q().query('SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id]);
    res.json(rows.map(shape).map((s) => ({ id: s.id, role: s.role, company: s.company, type: s.type, created_at: s.created_at, total: s.questions.length, answered: s.feedback.filter(Boolean).length, score: s.report ? s.report.score : null })));
  } catch (err) {
    console.error('[interviews] list', err.message);
    res.status(500).json({ message: 'Could not load your interviews.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const row = await own(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ message: 'Interview not found.' });
    res.json(shape(row));
  } catch (err) {
    res.status(500).json({ message: 'Could not load this interview.' });
  }
});

// Start: questions tailored to the job description (if any) and the member's resume.
router.post('/', auth, aiLimit, async (req, res) => {
  const b = req.body || {};
  const type = TYPES[b.type] ? b.type : 'mixed';
  const count = Math.min(8, Math.max(3, parseInt(b.count, 10) || 5));
  try {
    let role = String(b.role || '').trim();
    let company = String(b.company || '').trim();
    let description = '';
    if (b.job_id) {
      const [jobs] = await q().query('SELECT title, company, description FROM jobs WHERE id = ? AND (user_id IS NULL OR user_id = ?)', [b.job_id, req.user.id]);
      if (!jobs.length) return res.status(404).json({ message: 'Job not found.' });
      role = jobs[0].title; company = jobs[0].company || ''; description = jobs[0].description || '';
    }
    if (!role) return res.status(400).json({ message: 'Pick a job or type the role you’re interviewing for.' });

    const data = await generateJSON(`You are an experienced hiring manager for this role. Write ${count} interview questions — ${TYPES[type]} — exactly like a real interviewer at this company would ask, for this field (it may be healthcare, science, business, engineering, teaching, tech or anything else).

ROLE: ${role}${company ? ` at ${company}` : ''}
${description ? `JOB DESCRIPTION:\n${String(description).slice(0, 5000)}` : ''}

CANDIDATE RESUME:
${await resumeText(req.user.id)}

Rules:
- Start with an easy opener, then get more specific. Reference the job's real requirements and the candidate's actual background where natural.
- For role-specific questions, ask about concepts, situations or decisions from this field (e.g. patient safety for nursing, lab technique troubleshooting for research, reconciliations for accounting).
- No yes/no questions. One question per item.

Return JSON: { "questions": [ { "question": "string", "kind": "behavioral|technical|situational|motivation", "what_they_look_for": "one sentence", "tip": "one short coaching tip" } ] }`);
    const questions = (data.questions || []).filter((x) => x && x.question).slice(0, count).map((x) => ({
      question: String(x.question), kind: String(x.kind || 'behavioral'), looking_for: String(x.what_they_look_for || ''), tip: String(x.tip || ''),
    }));
    if (!questions.length) throw new Error('The AI response was not valid JSON. Please try again.');
    const [r] = await q().query(
      'INSERT INTO interview_sessions (user_id, job_id, role, company, type, questions, answers, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, b.job_id || null, role.slice(0, 255), company.slice(0, 255) || null, type, JSON.stringify(questions), '[]', '[]']
    );
    res.json(shape({ id: r.insertId, role, company, job_id: b.job_id || null, type, questions, answers: [], feedback: [], report: null }));
  } catch (err) {
    sendAIError(res, err, 'Could not start the interview. Please try again.');
  }
});

// Feedback on one answer.
router.post('/:id/answer', auth, aiLimit, async (req, res) => {
  const index = parseInt((req.body || {}).index, 10);
  const answer = String((req.body || {}).answer || '').trim();
  if (answer.length < 15) return res.status(400).json({ message: 'Give a fuller answer (a few sentences) to get useful feedback.' });
  try {
    const row = await own(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ message: 'Interview not found.' });
    const s = shape(row);
    const qn = s.questions[index];
    if (!qn) return res.status(400).json({ message: 'Unknown question.' });

    const fb = await generateJSON(`You are a supportive but honest interview coach. Evaluate this answer for a ${s.role}${s.company ? ` role at ${s.company}` : ''} interview.

QUESTION (${qn.kind}): ${qn.question}
WHAT INTERVIEWERS LOOK FOR: ${qn.looking_for}
CANDIDATE'S ANSWER:
"""${answer.slice(0, 4000)}"""

Judge structure (situation → action → result for behavioral), specificity, relevance to the role, and evidence of impact. Don't invent facts about the candidate; in the improved answer, keep their real story and mark missing details like [number] or [result].
Return JSON:
{
  "score": 1-5,
  "verdict": "one short line, e.g. 'Solid — add a measurable result'",
  "strengths": ["specific thing they did well", "..."],
  "improve": ["specific, actionable improvement", "..."],
  "better_answer": "a stronger version of THEIR answer in 4-6 sentences"
}`);
    const feedback = { score: Math.min(5, Math.max(1, Math.round(Number(fb.score) || 3))), verdict: String(fb.verdict || ''), strengths: (fb.strengths || []).slice(0, 4), improve: (fb.improve || []).slice(0, 4), better_answer: String(fb.better_answer || '') };
    s.answers[index] = answer;
    s.feedback[index] = feedback;
    await q().query('UPDATE interview_sessions SET answers = ?, feedback = ? WHERE id = ?', [JSON.stringify(s.answers), JSON.stringify(s.feedback), s.id]);
    res.json({ feedback });
  } catch (err) {
    sendAIError(res, err, 'Could not review your answer. Please try again.');
  }
});

// Final report across all answers.
router.post('/:id/finish', auth, aiLimit, async (req, res) => {
  try {
    const row = await own(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ message: 'Interview not found.' });
    const s = shape(row);
    const done = s.questions.map((qn, i) => ({ qn, a: s.answers[i], f: s.feedback[i] })).filter((x) => x.f);
    if (!done.length) return res.status(400).json({ message: 'Answer at least one question first.' });
    const avg = done.reduce((n, x) => n + x.f.score, 0) / done.length;
    const data = await generateJSON(`You are an interview coach writing a short debrief after a mock interview for a ${s.role}${s.company ? ` role at ${s.company}` : ''}.

${done.map((x, i) => `Q${i + 1}: ${x.qn.question}\nScore: ${x.f.score}/5 — ${x.f.verdict}\nImprove: ${x.f.improve.join('; ')}`).join('\n\n')}

Return JSON: { "summary": "2-3 sentences, honest and encouraging", "top_strengths": ["...", "..."], "focus_areas": ["the 2-3 most important things to practice"], "next_steps": ["concrete action before the real interview", "..."] }`);
    const report = { score: Math.round((avg / 5) * 100), answered: done.length, total: s.questions.length, summary: String(data.summary || ''), top_strengths: (data.top_strengths || []).slice(0, 4), focus_areas: (data.focus_areas || []).slice(0, 4), next_steps: (data.next_steps || []).slice(0, 4) };
    await q().query('UPDATE interview_sessions SET report = ? WHERE id = ?', [JSON.stringify(report), s.id]);
    res.json({ report });
  } catch (err) {
    sendAIError(res, err, 'Could not write your report. Please try again.');
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await q().query('DELETE FROM interview_sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete.' });
  }
});

module.exports = router;
