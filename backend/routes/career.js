// Career pack: cover-letter builder, LinkedIn profile helper, interview prep sheets, skill demand insights.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, sendAIError } = require('../lib/gemini');
const { resumeForPrompt, resumeToText } = require('../lib/resumeText');
const { loadProfile } = require('../lib/careerProfile');

const q = () => db.promise();
const aiLimit = rateLimit({ max: 40, name: 'career tools' });
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const parse = (s, fb) => { try { return s ? (typeof s === 'string' ? JSON.parse(s) : s) : fb; } catch { return fb; } };
const list = (v, n = 12, max = 400) => (Array.isArray(v) ? v : []).map((x) => String(x || '').trim().slice(0, max)).filter(Boolean).slice(0, n);
const pad = (n) => String(n).padStart(2, '0');
const sqlTime = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

async function resumeFor(userId) {
  const [r] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ?', [userId]).catch(() => [[]]);
  return { prompt: r[0] ? resumeForPrompt(r[0].resume_data) : '', text: r[0] ? resumeToText(r[0].resume_data) : null, raw: parse(r[0]?.resume_data, null) };
}

/** Role, company and description from a saved/board job, or from what the member typed. */
async function jobFrom(userId, b) {
  if (b.job_id) {
    const [[j]] = await q().query('SELECT id, title, company, description FROM jobs WHERE id = ? AND (user_id IS NULL OR user_id = ?)', [b.job_id, userId]);
    if (!j) return null;
    return { job_id: j.id, role: j.title, company: j.company || '', description: String(j.description || '').replace(/<[^>]+>/g, ' ').slice(0, 6000) };
  }
  return { job_id: null, role: clean(b.role, 200), company: clean(b.company, 200), description: String(b.description || '').slice(0, 6000) };
}

async function saveDoc(userId, { kind, title, jobId = null, data }) {
  const [ins] = await q().query('INSERT INTO career_docs (user_id, kind, title, job_id, data) VALUES (?, ?, ?, ?, ?)', [userId, kind, String(title).slice(0, 200), jobId, JSON.stringify(data)]);
  return ins.insertId;
}
const docOut = (d) => ({ id: d.id, kind: d.kind, title: d.title, job_id: d.job_id, data: parse(d.data, {}), created_at: d.created_at, updated_at: d.updated_at });

/* ---------- Saved documents ---------- */

router.get('/docs', auth, async (req, res) => {
  const kind = String(req.query.kind || '');
  const [rows] = await q().query(
    `SELECT id, kind, title, job_id, created_at, updated_at FROM career_docs WHERE user_id = ?${kind ? ' AND kind = ?' : ''} ORDER BY updated_at DESC, id DESC LIMIT 100`,
    kind ? [req.user.id, kind] : [req.user.id]
  );
  res.json(rows);
});

router.get('/docs/:id', auth, async (req, res) => {
  const [[d]] = await q().query('SELECT * FROM career_docs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!d) return res.status(404).json({ message: 'Not found.' });
  res.json(docOut(d));
});

// Edit a cover letter's text or a document's title
router.put('/docs/:id', auth, async (req, res) => {
  try {
    const [[d]] = await q().query('SELECT * FROM career_docs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!d) return res.status(404).json({ message: 'Not found.' });
    const data = parse(d.data, {});
    if (typeof req.body.content === 'string') data.content = req.body.content.slice(0, 12000);
    const title = clean(req.body.title, 200) || d.title;
    await q().query('UPDATE career_docs SET title = ?, data = ?, updated_at = ? WHERE id = ?', [title, JSON.stringify(data), sqlTime(new Date()), d.id]);
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ message: 'Could not save.' });
  }
});

router.delete('/docs/:id', auth, async (req, res) => {
  const [r] = await q().query('DELETE FROM career_docs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Not found.' });
  res.json({ message: 'Deleted' });
});

/* ---------- Cover letters ---------- */

const TONES = {
  professional: 'professional and confident',
  enthusiastic: 'warm and enthusiastic, but not over the top',
  concise: 'direct and concise',
  formal: 'formal (suits government, law, academia, healthcare administration)',
};
const LENGTHS = { short: '150–200 words', medium: '250–320 words', long: '350–420 words' };

router.post('/cover-letter', auth, aiLimit, async (req, res) => {
  const b = req.body || {};
  try {
    const job = await jobFrom(req.user.id, b);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (!job.role) return res.status(400).json({ message: 'Pick a job or type the role.' });
    const resume = await resumeFor(req.user.id);
    const [[u]] = await q().query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const tone = TONES[b.tone] ? b.tone : 'professional';
    const length = LENGTHS[b.length] ? b.length : 'medium';
    const data = await generateJSON(`Write a tailored cover letter for this job application.
ROLE: ${job.role}${job.company ? ` at ${job.company}` : ''}
${job.description ? `JOB DESCRIPTION:\n${job.description}` : ''}
CANDIDATE: ${u?.name || 'the candidate'}
CANDIDATE RESUME:
${resume.prompt || 'No resume saved — keep claims general and honest.'}
${clean(b.highlights, 800) ? `THINGS THE CANDIDATE WANTS TO MENTION: ${clean(b.highlights, 800)}` : ''}

Rules:
- Tone: ${TONES[tone]}. Length: ${LENGTHS[length]}.
- Open with why this role/company, not "I am writing to apply". Connect 2–3 specific requirements from the job to concrete evidence from the resume (numbers where the resume has them).
- Never invent experience, employers, degrees or numbers that aren't in the resume or highlights.
- Works for any field (healthcare, science, business, teaching, engineering, tech…). Plain text with paragraphs, a greeting ("Dear Hiring Manager," unless a name is known) and a sign-off with the candidate's name.
Return JSON: { "content": "the full letter", "talking_points": ["3 short bullets: the strongest matches you used"] }`);
    const content = String(data.content || '').trim();
    if (content.length < 100) throw new Error('The AI response was not valid JSON. Please try again.');
    const title = `${job.role}${job.company ? ` — ${job.company}` : ''}`;
    const id = await saveDoc(req.user.id, { kind: 'cover_letter', title, jobId: job.job_id, data: { content, role: job.role, company: job.company, tone, length, talking_points: list(data.talking_points, 4, 200), has_resume: !!resume.prompt } });
    res.json({ id, title, content, talking_points: list(data.talking_points, 4, 200) });
  } catch (err) {
    sendAIError(res, err, 'Could not write the cover letter. Please try again.');
  }
});

const REWRITES = {
  shorter: 'Make it about 30% shorter while keeping the strongest evidence.',
  specific: 'Make it more specific: replace generic claims with concrete evidence from the resume and requirements from the job.',
  warmer: 'Make it warmer and more personal, while staying professional.',
  formal: 'Make it more formal.',
  stronger_opening: 'Rewrite only the opening paragraph so it grabs attention in the first sentence; keep the rest.',
};

router.post('/cover-letter/:id/rewrite', auth, aiLimit, async (req, res) => {
  try {
    const [[d]] = await q().query('SELECT * FROM career_docs WHERE id = ? AND user_id = ? AND kind = ?', [req.params.id, req.user.id, 'cover_letter']);
    if (!d) return res.status(404).json({ message: 'Cover letter not found.' });
    const instruction = REWRITES[req.body.how] || clean(req.body.custom, 300);
    if (!instruction) return res.status(400).json({ message: 'Choose how to change it.' });
    const data = parse(d.data, {});
    const resume = await resumeFor(req.user.id);
    const out = await generateJSON(`Revise this cover letter. ${instruction}
Keep it truthful to the resume — never add experience that isn't there. Keep the greeting and sign-off.
RESUME:
${resume.prompt || 'not provided'}
COVER LETTER:
${String(data.content || '').slice(0, 6000)}
Return JSON: { "content": "the revised letter" }`);
    const content = String(out.content || '').trim();
    if (content.length < 80) throw new Error('The AI response was not valid JSON. Please try again.');
    data.previous = data.content;
    data.content = content;
    await q().query('UPDATE career_docs SET data = ?, updated_at = ? WHERE id = ?', [JSON.stringify(data), sqlTime(new Date()), d.id]);
    res.json({ content });
  } catch (err) {
    sendAIError(res, err, 'Could not revise the letter. Please try again.');
  }
});

/* ---------- LinkedIn profile helper ---------- */

router.get('/linkedin', auth, async (req, res) => {
  try {
    const [[d]] = await q().query('SELECT * FROM career_docs WHERE user_id = ? AND kind = ? ORDER BY id DESC LIMIT 1', [req.user.id, 'linkedin']);
    const resume = await resumeFor(req.user.id);
    const profile = await loadProfile(req.user.id).catch(() => ({ target_roles: [] }));
    const c = resume.raw?.contact || {};
    res.json({
      saved: d ? docOut(d) : null,
      prefill: {
        target_role: profile.target_roles?.[0] || c.headline || '',
        headline: c.headline || '',
        about: resume.raw?.summary || '',
        has_resume: !!resume.prompt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not load.' });
  }
});

router.post('/linkedin', auth, aiLimit, async (req, res) => {
  const b = req.body || {};
  const target = clean(b.target_role, 160);
  if (!target) return res.status(400).json({ message: 'Tell us the role you’re aiming for.' });
  try {
    const resume = await resumeFor(req.user.id);
    const data = await generateJSON(`You are a LinkedIn profile coach and recruiter. Improve this person's LinkedIn profile so recruiters searching for "${target}" find and contact them.
CURRENT HEADLINE: ${clean(b.headline, 300) || '(empty)'}
CURRENT ABOUT SECTION: ${String(b.about || '').slice(0, 2500) || '(empty)'}
RESUME:
${resume.prompt || 'No resume saved.'}

Rules: truthful to the resume (never invent experience); use keywords recruiters search for this role; works for any field.
Return JSON:
{
  "score": 0-100 (how strong the current profile is for this target),
  "headlines": ["3 headline options, each under 220 characters, keyword-rich, e.g. 'Role | Specialty | Proof point'"],
  "about": "a new About section, 120–220 words, first person, hook in the first line, ends with what they're looking for",
  "experience_bullets": [ { "role": "job title from the resume", "bullets": ["2–3 rewritten, quantified bullets"] } ],
  "skills": ["10 skills to list, most searched first"],
  "checklist": [ { "item": "short action e.g. 'Add a professional photo'", "why": "one sentence" } ],
  "open_to_work": "one line for the Open to Work note"
}`);
    const result = {
      score: Math.max(0, Math.min(100, parseInt(data.score, 10) || 0)),
      headlines: list(data.headlines, 3, 240),
      about: String(data.about || '').trim().slice(0, 3000),
      experience_bullets: (Array.isArray(data.experience_bullets) ? data.experience_bullets : []).slice(0, 5).map((e) => ({ role: clean(e.role, 160), bullets: list(e.bullets, 4, 300) })).filter((e) => e.bullets.length),
      skills: list(data.skills, 12, 60),
      checklist: (Array.isArray(data.checklist) ? data.checklist : []).slice(0, 8).map((x) => ({ item: clean(x.item, 120), why: clean(x.why, 240) })).filter((x) => x.item),
      open_to_work: clean(data.open_to_work, 300),
    };
    if (!result.headlines.length || !result.about) throw new Error('The AI response was not valid JSON. Please try again.');
    const inputs = { target_role: target, headline: clean(b.headline, 300), about: String(b.about || '').slice(0, 2500) };
    const [[existing]] = await q().query('SELECT id FROM career_docs WHERE user_id = ? AND kind = ? ORDER BY id DESC LIMIT 1', [req.user.id, 'linkedin']);
    if (existing) await q().query('UPDATE career_docs SET title = ?, data = ?, updated_at = ? WHERE id = ?', [`LinkedIn for ${target}`, JSON.stringify({ inputs, result }), sqlTime(new Date()), existing.id]);
    else await saveDoc(req.user.id, { kind: 'linkedin', title: `LinkedIn for ${target}`, data: { inputs, result } });
    res.json({ inputs, result });
  } catch (err) {
    sendAIError(res, err, 'Could not review your profile. Please try again.');
  }
});

/* ---------- Interview prep sheet ---------- */

router.post('/prep', auth, aiLimit, async (req, res) => {
  const b = req.body || {};
  try {
    const job = await jobFrom(req.user.id, b);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (!job.role) return res.status(400).json({ message: 'Pick a job or type the role.' });
    const resume = await resumeFor(req.user.id);
    const data = await generateJSON(`Create a one-page interview prep sheet for this candidate.
ROLE: ${job.role}${job.company ? ` at ${job.company}` : ''}
${job.description ? `JOB DESCRIPTION:\n${job.description}` : ''}
RESUME:
${resume.prompt || 'No resume saved.'}
Rules: specific to this role and field; use the candidate's real experience for answer outlines (never invent); practical and concise.
Return JSON:
{
  "pitch": "a 60-second 'tell me about yourself' answer in first person, built from the resume and aimed at this role",
  "research": ["5 things to research about the company/role before the interview"],
  "likely_questions": [ { "question": "string", "why": "what they're testing", "outline": "a STAR-style answer outline using the candidate's real experience (2–3 sentences)" } ],
  "strengths": ["3 strengths to emphasise, each tied to a job requirement"],
  "gaps": [ { "gap": "a requirement the resume doesn't clearly show", "how_to_address": "honest one-sentence way to handle it" } ],
  "questions_to_ask": ["5 smart questions to ask the interviewer"],
  "first_90_days": ["3 bullets: what they'd focus on in the first 90 days"]
}`);
    const sheet = {
      role: job.role, company: job.company,
      pitch: String(data.pitch || '').trim().slice(0, 2000),
      research: list(data.research, 6, 300),
      likely_questions: (Array.isArray(data.likely_questions) ? data.likely_questions : []).slice(0, 8).map((x) => ({ question: clean(x.question, 300), why: clean(x.why, 300), outline: String(x.outline || '').trim().slice(0, 800) })).filter((x) => x.question),
      strengths: list(data.strengths, 4, 300),
      gaps: (Array.isArray(data.gaps) ? data.gaps : []).slice(0, 4).map((x) => ({ gap: clean(x.gap, 200), how_to_address: clean(x.how_to_address, 300) })).filter((x) => x.gap),
      questions_to_ask: list(data.questions_to_ask, 6, 300),
      first_90_days: list(data.first_90_days, 4, 300),
    };
    if (!sheet.pitch || !sheet.likely_questions.length) throw new Error('The AI response was not valid JSON. Please try again.');
    const id = await saveDoc(req.user.id, { kind: 'prep', title: `${job.role}${job.company ? ` — ${job.company}` : ''}`, jobId: job.job_id, data: sheet });
    res.json({ id });
  } catch (err) {
    sendAIError(res, err, 'Could not make the prep sheet. Please try again.');
  }
});

/* ---------- Skill demand insights (from the job board) ---------- */

const STOP = new Set(['senior', 'junior', 'lead', 'staff', 'principal', 'remote', 'intern', 'internship', 'entry', 'level', 'associate', 'specialist', 'manager', 'the', 'and', 'for', 'with']);
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 2 && !STOP.has(w));

router.get('/insights', auth, async (req, res) => {
  try {
    const profile = await loadProfile(req.user.id).catch(() => ({ target_roles: [], skills: [] }));
    const role = clean(req.query.role, 120) || profile.target_roles?.[0] || '';
    const mine = new Set((profile.skills || []).map((s) => s.toLowerCase()));
    const since = sqlTime(new Date(Date.now() - 45 * 86400000));
    const [all] = await q().query('SELECT title, company, location, remote, salary, skills, posted_at, fetched_at FROM jobs WHERE user_id IS NULL AND fetched_at >= ? LIMIT 5000', [since]);
    const terms = words(role);
    let jobs = terms.length ? all.filter((j) => { const t = words(j.title); return terms.some((w) => t.includes(w)); }) : all;
    const broad = jobs.length < 8;
    if (broad) jobs = all;

    const now = Date.now();
    const when = (j) => new Date(j.posted_at || j.fetched_at || now).getTime();
    const recent = jobs.filter((j) => now - when(j) <= 14 * 86400000);
    const older = jobs.filter((j) => now - when(j) > 14 * 86400000);
    const count = (arr) => {
      const m = new Map();
      for (const j of arr) for (const s of new Set(parse(j.skills, []))) m.set(s, (m.get(s) || 0) + 1);
      return m;
    };
    const total = count(jobs);
    const rc = count(recent);
    const oc = count(older);
    const top = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([skill, n]) => {
      const share = Math.round((n / Math.max(1, jobs.length)) * 100);
      const rShare = recent.length ? (rc.get(skill) || 0) / recent.length : 0;
      const oShare = older.length ? (oc.get(skill) || 0) / older.length : 0;
      return { skill, jobs: n, share, have: mine.has(skill.toLowerCase()), trend: recent.length >= 5 && older.length >= 5 ? Math.round((rShare - oShare) * 100) : 0 };
    });
    const companies = new Map();
    for (const j of jobs) if (j.company) companies.set(j.company, (companies.get(j.company) || 0) + 1);
    const top10 = top.slice(0, 10);
    const missing = top.filter((s) => !s.have);
    res.json({
      role,
      broad,
      jobs: jobs.length,
      remote_share: jobs.length ? Math.round((jobs.filter((j) => Number(j.remote)).length / jobs.length) * 100) : 0,
      with_salary: jobs.filter((j) => j.salary).length,
      salary_examples: [...new Set(jobs.map((j) => j.salary).filter(Boolean))].slice(0, 5),
      coverage: top10.length ? Math.round((top10.filter((s) => s.have).length / top10.length) * 100) : 0,
      your_skills: (profile.skills || []).length,
      skills: top,
      next_skill: missing[0] || null,
      rising: top.filter((s) => s.trend >= 3).sort((a, b) => b.trend - a.trend).slice(0, 6),
      companies: [...companies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, jobs: n })),
    });
  } catch (err) {
    console.error('[career] insights', err.message);
    res.status(500).json({ message: 'Could not analyse the job market right now.' });
  }
});

module.exports = router;
