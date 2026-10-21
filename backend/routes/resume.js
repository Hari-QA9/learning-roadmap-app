const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, generateText, sendAIError } = require('../lib/gemini');
const { resumeForPrompt } = require('../lib/resumeText');

const q = () => db.promise();
const aiLimit = rateLimit({ max: 60, name: 'resume requests' });
const parse = (v, d = null) => { if (!v) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };
const MAX_RESUME = 200000; // characters of JSON

const RULES = `Rules:
- Never invent employers, job titles, degrees, dates, tools or results the candidate didn't give.
- Where a number would help but isn't known, use a placeholder like [X%] or [N] for the candidate to fill in.
- US resume style: no "I"/"my", start bullets with a strong past-tense action verb (present tense for current roles), one line or two at most.`;

/* ---------- Profile + saved resume ---------- */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await q().query('SELECT id, name, email, bio FROM users WHERE id = ?', [userId]);
    const [allRoadmaps] = await q().query('SELECT * FROM roadmaps WHERE user_id = ?', [userId]);
    const [stats] = await q().query('SELECT * FROM user_stats WHERE user_id = ?', [userId]).catch(() => [[]]);
    const [badges] = await q().query(
      'SELECT b.name, b.icon FROM user_badges ub JOIN badges b ON ub.badge_id = b.id WHERE ub.user_id = ?', [userId]
    ).catch(() => [[]]);
    res.json({
      user: user[0],
      completedRoadmaps: allRoadmaps.filter((r) => r.status === 'completed'),
      allRoadmaps,
      stats: stats[0] || {},
      badges,
    });
  } catch (err) {
    console.error('[resume] profile', err.message);
    res.status(500).json({ message: 'Could not load your profile.' });
  }
});

router.get('/saved', auth, async (req, res) => {
  try {
    const [rows] = await q().query('SELECT resume_data, updated_at FROM user_resumes WHERE user_id = ?', [req.user.id]);
    res.json({ resume: rows.length ? parse(rows[0].resume_data) : null, updated_at: rows[0]?.updated_at || null });
  } catch (err) {
    console.error('[resume] saved', err.message);
    res.status(500).json({ message: 'Could not load your resume.' });
  }
});

router.post('/save', auth, async (req, res) => {
  const json = JSON.stringify(req.body.resume_data || {});
  if (json.length > MAX_RESUME) return res.status(413).json({ message: 'Your resume is too long to save. Please shorten it.' });
  try {
    const [has] = await q().query('SELECT id FROM user_resumes WHERE user_id = ?', [req.user.id]);
    if (has.length) await q().query('UPDATE user_resumes SET resume_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [json, req.user.id]);
    else await q().query('INSERT INTO user_resumes (user_id, resume_data) VALUES (?, ?)', [req.user.id, json]);
    res.json({ message: 'Resume saved' });
  } catch (err) {
    console.error('[resume] save', err.message);
    res.status(500).json({ message: 'Could not save your resume.' });
  }
});

/* ---------- Tailored versions (one per job or purpose) ---------- */
router.get('/versions', auth, async (req, res) => {
  try {
    const [rows] = await q().query(
      `SELECT v.id, v.name, v.job_id, v.updated_at, j.title AS job_title, j.company AS job_company
       FROM resume_versions v LEFT JOIN jobs j ON j.id = v.job_id
       WHERE v.user_id = ? ORDER BY v.updated_at DESC`, [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[resume] versions', err.message);
    res.status(500).json({ message: 'Could not load your resume versions.' });
  }
});

router.get('/versions/:id', auth, async (req, res) => {
  try {
    const [rows] = await q().query('SELECT * FROM resume_versions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Version not found.' });
    res.json({ ...rows[0], data: parse(rows[0].data) });
  } catch (err) {
    res.status(500).json({ message: 'Could not load this version.' });
  }
});

router.post('/versions', auth, async (req, res) => {
  const { name, job_id: jobId, data } = req.body || {};
  const json = JSON.stringify(data || {});
  if (!String(name || '').trim()) return res.status(400).json({ message: 'Give this version a name.' });
  if (json.length > MAX_RESUME) return res.status(413).json({ message: 'This version is too long to save.' });
  try {
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM resume_versions WHERE user_id = ?', [req.user.id]);
    if (Number(n) >= 30) return res.status(400).json({ message: 'You can keep up to 30 versions. Delete an old one first.' });
    if (jobId) {
      const [jobs] = await q().query('SELECT id FROM jobs WHERE id = ? AND (user_id IS NULL OR user_id = ?)', [jobId, req.user.id]);
      if (!jobs.length) return res.status(404).json({ message: 'Job not found.' });
    }
    const [r] = await q().query(
      'INSERT INTO resume_versions (user_id, name, job_id, data, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [req.user.id, String(name).trim().slice(0, 120), jobId || null, json]
    );
    res.json({ id: r.insertId });
  } catch (err) {
    console.error('[resume] add version', err.message);
    res.status(500).json({ message: 'Could not save this version.' });
  }
});

router.put('/versions/:id', auth, async (req, res) => {
  const sets = [];
  const vals = [];
  if (req.body.name !== undefined) { sets.push('name = ?'); vals.push(String(req.body.name).trim().slice(0, 120) || 'Untitled'); }
  if (req.body.data !== undefined) {
    const json = JSON.stringify(req.body.data);
    if (json.length > MAX_RESUME) return res.status(413).json({ message: 'This version is too long to save.' });
    sets.push('data = ?'); vals.push(json);
  }
  if (!sets.length) return res.status(400).json({ message: 'Nothing to update.' });
  try {
    const [r] = await q().query(`UPDATE resume_versions SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [...vals, req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Version not found.' });
    res.json({ message: 'Saved' });
  } catch (err) {
    res.status(500).json({ message: 'Could not save this version.' });
  }
});

router.delete('/versions/:id', auth, async (req, res) => {
  try {
    await q().query('DELETE FROM resume_versions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete this version.' });
  }
});

/* ---------- AI helpers ---------- */

// Summary: accepts the new structured resume, or the old { skills, experience, goal } fields.
router.post('/generate-summary', auth, aiLimit, async (req, res) => {
  const { resume, skills, experience, goal, jobTitle } = req.body || {};
  const context = resume ? resumeForPrompt(resume) : `Target role: ${goal}\nSkills: ${skills}\nExperience: ${experience}`;
  try {
    const summary = (await generateText(`Write a professional resume summary for this candidate${jobTitle ? ` applying for "${jobTitle}"` : ''}.

${context}

${RULES}
Write 2-3 sentences, 40-70 words, no bullet points, no first person. Lead with their target title and strongest real skills. Return only the paragraph.`)).trim().replace(/^"|"$/g, '');
    res.json({ summary });
  } catch (err) {
    sendAIError(res, err, 'Could not write a summary. Please try again.');
  }
});

// Rewrite one bullet three ways.
router.post('/improve-bullet', auth, aiLimit, async (req, res) => {
  const { bullet, role, company, targetRole, keywords, current } = req.body || {};
  if (!String(bullet || '').trim()) return res.status(400).json({ message: 'Write the bullet first, then ask AI to improve it.' });
  try {
    const data = await generateJSON(`You are an expert resume writer. Improve this resume bullet.

Bullet: "${String(bullet).slice(0, 600)}"
Role: ${role || 'not given'}${company ? ` at ${company}` : ''} (${current ? 'current role — use present tense' : 'past role — use past tense'})
Target job: ${targetRole || 'not given'}
${keywords ? `Keywords worth using if truthful: ${keywords}` : ''}

${RULES}
Use the formula: action verb + what you did + tool/method + measurable result.
Return JSON: { "options": ["three different improved versions, each under 30 words"], "tip": "one short sentence on what made it stronger" }`);
    res.json({ options: (data.options || []).slice(0, 3), tip: data.tip || '' });
  } catch (err) {
    sendAIError(res, err, 'Could not improve this bullet. Please try again.');
  }
});

// Turn pasted resume text (e.g. copied from a PDF or LinkedIn) into structured fields.
router.post('/import', auth, aiLimit, async (req, res) => {
  const text = String((req.body || {}).text || '').trim();
  if (text.length < 80) return res.status(400).json({ message: 'Paste your full resume text (at least a few lines).' });
  try {
    const data = await generateJSON(`Convert this resume text into structured JSON. Copy the candidate's own words — do not rewrite, improve or invent anything. Leave a field empty ("") if it isn't in the text.

RESUME TEXT
${text.slice(0, 12000)}

Return JSON:
{
  "contact": { "name": "", "headline": "target or current job title", "email": "", "phone": "", "location": "City, ST", "linkedin": "", "website": "" },
  "summary": "",
  "skills": [ { "group": "e.g. Languages, Testing, Tools (or empty)", "items": "comma separated" } ],
  "experience": [ { "title": "", "company": "", "location": "", "start": "Mon YYYY", "end": "Mon YYYY or empty", "current": false, "bullets": [""] } ],
  "projects": [ { "name": "", "tech": "comma separated", "link": "", "start": "", "end": "", "bullets": [""] } ],
  "education": [ { "degree": "", "school": "", "location": "", "start": "", "end": "", "details": "GPA, coursework, honors" } ],
  "certifications": [ { "name": "", "issuer": "", "date": "", "link": "" } ]
}`);
    res.json({ resume: data });
  } catch (err) {
    sendAIError(res, err, 'Could not read that resume. Please try again.');
  }
});

// Tailor the resume to one job: keyword gaps + concrete edits the member can apply one by one.
router.post('/tailor', auth, aiLimit, async (req, res) => {
  const { resume, jobId } = req.body || {};
  let { jobDescription, jobTitle, company } = req.body || {};
  try {
    if (jobId) {
      const [jobs] = await q().query('SELECT title, company, description FROM jobs WHERE id = ? AND (user_id IS NULL OR user_id = ?)', [jobId, req.user.id]);
      if (!jobs.length) return res.status(404).json({ message: 'Job not found.' });
      ({ title: jobTitle, company } = jobs[0]);
      jobDescription = jobs[0].description;
    }
    if (!String(jobDescription || '').trim()) return res.status(400).json({ message: 'Pick a job or paste a job description.' });
    if (!resume) return res.status(400).json({ message: 'Your resume is empty.' });

    // Give the model stable ids so its edits can be applied to the right bullet.
    const exp = (resume.experience || []).map((e, i) => `E${i} ${e.title} at ${e.company}${e.current ? ' (current)' : ''}\n${(e.bullets || []).map((b, k) => `  E${i}.${k}: ${b}`).join('\n')}`).join('\n');
    const prj = (resume.projects || []).map((p, i) => `P${i} ${p.name} (${p.tech})\n${(p.bullets || []).map((b, k) => `  P${i}.${k}: ${b}`).join('\n')}`).join('\n');
    const skills = (resume.skills || []).map((g) => `${g.group ? `${g.group}: ` : ''}${g.items}`).join('\n');

    const data = await generateJSON(`You are a senior technical recruiter and ATS expert. Tailor this candidate's resume to the job, honestly.

JOB: ${jobTitle || 'Not given'}${company ? ` at ${company}` : ''}
${String(jobDescription).slice(0, 7000)}

CANDIDATE
Target role: ${(resume.contact || {}).headline || ''}
Summary: ${resume.summary || ''}
Skills:
${skills}
Experience (ids in front):
${exp || 'none'}
Projects (ids in front):
${prj || 'none'}

${RULES}
- Only suggest adding a keyword to skills if the resume already shows the candidate used it (or a direct equivalent). Otherwise list it under "gaps".
- Rewrite at most 6 bullets, the ones that matter most for this job. Keep the facts; use the job's wording where it truthfully applies.

Return JSON:
{
  "match_score": 0-100,
  "summary": "a rewritten 2-3 sentence summary aimed at this job",
  "keywords_present": ["important job keywords the resume already has"],
  "skills_to_add": [ { "skill": "keyword", "why": "where the resume shows it" } ],
  "gaps": [ { "skill": "required keyword the candidate doesn't show", "advice": "one sentence: learn it, or mention related experience" } ],
  "bullet_edits": [ { "id": "E0.1 or P1.0", "improved": "rewritten bullet", "why": "short reason" } ],
  "headline": "best target title for this job, based on the candidate's real experience"
}`);
    res.json({ ...data, job: { title: jobTitle || '', company: company || '' } });
  } catch (err) {
    sendAIError(res, err, 'Could not tailor your resume right now.');
  }
});

// Recruiter-style review (kept for older clients; the new page uses live checks + tailor).
router.post('/score', auth, aiLimit, async (req, res) => {
  const body = req.body || {};
  const context = body.resume ? resumeForPrompt(body.resume)
    : `Name: ${body.name}\nTarget role: ${body.goal}\nSummary: ${body.summary}\nSkills: ${body.skills}\nExperience: ${body.experience}\nEducation: ${body.education}`;
  try {
    const data = await generateJSON(`You are a senior US tech recruiter giving a frank 6-second-scan review of this resume.

${context}

Return JSON: { "score": 0-100, "first_impression": "one sentence on what stands out in 6 seconds", "strengths": ["specific", "..."], "tips": ["specific improvement referencing their actual content", "...3-5 items"] }`);
    res.json(data);
  } catch (err) {
    sendAIError(res, err, 'Could not review the resume. Please try again.');
  }
});

router.post('/ats-check', auth, aiLimit, async (req, res) => {
  const body = req.body || {};
  const context = body.resume ? resumeForPrompt(body.resume)
    : `Name: ${body.name}\nGoal: ${body.goal}\nSummary: ${body.summary}\nSkills: ${body.skills}\nExperience: ${body.experience}\nEducation: ${body.education}`;
  const target = body.jobDescription
    ? `Compare the resume against this job description:\n---\n${String(body.jobDescription).slice(0, 6000)}\n---`
    : `Compare the resume against typical job postings for: ${body.goal || 'the candidate’s target role'}.`;
  try {
    const data = await generateJSON(`You are an ATS (applicant tracking system) expert.
${target}

Resume:
${context}

Return JSON: { "atsScore": 0-100, "keywordsFound": ["string"], "keywordsMissing": ["string"], "suggestions": ["specific, actionable suggestion", "..."] }`);
    res.json(data);
  } catch (err) {
    sendAIError(res, err, 'Could not run the ATS check. Please try again.');
  }
});

module.exports = router;
