const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, sendAIError } = require('../lib/gemini');
const { extractSkills, normaliseSkills, matchJob } = require('../lib/skills');
const { refreshJobs, stripHtml } = require('../lib/jobSources');
const { generateRoadmap } = require('../lib/roadmapAI');
const { insertTask } = require('../lib/tasks');
const { resumeToText } = require('../lib/resumeText');

const q = () => db.promise();
const aiLimit = rateLimit({ max: 30, name: 'job requests' });
const parse = (v, d) => { if (!v) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };

/* ---------- Member profile used for matching ---------- */
async function loadProfile(userId) {
  const [rows] = await q().query('SELECT * FROM career_profiles WHERE user_id = ?', [userId]);
  const p = rows[0] || {};
  let skills = parse(p.skills, []);
  let fromResume = false;
  if (!skills.length) {
    // Fall back to the skills in the member's saved resume.
    const [r] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ? LIMIT 1', [userId]).catch(() => [[]]);
    const resume = r[0] ? resumeToText(r[0].resume_data) : {};
    skills = normaliseSkills(resume.skills || '');
    fromResume = skills.length > 0;
  }
  return {
    target_roles: parse(p.target_roles, []),
    skills,
    level: p.level || '',
    locations: parse(p.locations, []),
    remote_only: !!Number(p.remote_only || 0),
    exists: !!rows[0],
    fromResume,
  };
}

function shapeJob(row, profile, extra = {}) {
  const skills = parse(row.skills, []);
  const m = matchJob({ title: row.title, skills }, profile);
  return {
    id: row.id, source: row.source, title: row.title, company: row.company, location: row.location,
    remote: !!Number(row.remote), url: row.url, publisher: row.publisher || null, salary: row.salary, job_type: row.job_type, posted_at: row.posted_at,
    custom: !!row.user_id, skills, match: m.score, have: m.have, missing: m.missing,
    status: row.app_status || null, application_id: row.app_id || null,
    ...extra,
  };
}

// GET /jobs/profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json(await loadProfile(req.user.id));
  } catch (err) {
    console.error('[jobs] profile', err.message);
    res.status(500).json({ message: 'Could not load your job preferences.' });
  }
});

// PUT /jobs/profile
router.put('/profile', auth, async (req, res) => {
  const b = req.body || {};
  const roles = (Array.isArray(b.target_roles) ? b.target_roles : String(b.target_roles || '').split(/[,;\n]/)).map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  const skills = normaliseSkills(b.skills).slice(0, 60);
  const locations = (Array.isArray(b.locations) ? b.locations : String(b.locations || '').split(/[,;\n]/)).map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  try {
    const vals = [JSON.stringify(roles), JSON.stringify(skills), String(b.level || '').slice(0, 30), JSON.stringify(locations), b.remote_only ? 1 : 0];
    const [has] = await q().query('SELECT user_id FROM career_profiles WHERE user_id = ?', [req.user.id]);
    if (has.length) {
      await q().query('UPDATE career_profiles SET target_roles = ?, skills = ?, level = ?, locations = ?, remote_only = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [...vals, req.user.id]);
    } else {
      await q().query('INSERT INTO career_profiles (target_roles, skills, level, locations, remote_only, user_id) VALUES (?, ?, ?, ?, ?, ?)', [...vals, req.user.id]);
    }
    res.json(await loadProfile(req.user.id));
  } catch (err) {
    console.error('[jobs] save profile', err.message);
    res.status(500).json({ message: 'Could not save your job preferences.' });
  }
});

// GET /jobs?q=&remote=1&source=&sort=match|recent&saved=1&page=1
router.get('/', auth, async (req, res) => {
  try {
    const profile = await loadProfile(req.user.id);
    const where = ['(j.user_id IS NULL OR j.user_id = ?)'];
    const params = [req.user.id, req.user.id];
    const text = String(req.query.q || '').trim();
    if (text) {
      where.push('(LOWER(j.title) LIKE ? OR LOWER(j.company) LIKE ? OR LOWER(j.skills) LIKE ?)');
      const like = `%${text.toLowerCase()}%`;
      params.push(like, like, like);
    }
    const loc = String(req.query.location || '').trim();
    if (loc) { where.push('LOWER(j.location) LIKE ?'); params.push(`%${loc.toLowerCase()}%`); }
    if (req.query.remote === '1') where.push('j.remote = 1');
    if (req.query.source) { where.push('j.source = ?'); params.push(String(req.query.source)); }
    if (req.query.saved === '1') where.push('a.id IS NOT NULL');

    const [rows] = await q().query(
      `SELECT j.id, j.source, j.user_id, j.title, j.company, j.location, j.remote, j.url, j.salary, j.job_type, j.skills, j.posted_at, j.publisher,
              a.status AS app_status, a.id AS app_id
       FROM jobs j
       LEFT JOIN job_applications a ON a.job_id = j.id AND a.user_id = ?
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(j.posted_at, j.fetched_at) DESC
       LIMIT 1500`,
      params
    );

    let jobs = rows.map((r) => shapeJob(r, profile));
    const sort = req.query.sort === 'recent' || !profile.skills.length ? 'recent' : 'match';
    if (sort === 'match') jobs.sort((a, b) => (b.match || 0) - (a.match || 0));

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = 25;
    const [[counts]] = await q().query('SELECT COUNT(*) AS total, MAX(fetched_at) AS last FROM jobs WHERE user_id IS NULL');
    res.json({
      jobs: jobs.slice((page - 1) * size, page * size),
      total: jobs.length,
      page,
      pages: Math.max(1, Math.ceil(jobs.length / size)),
      sort,
      board: { total: Number(counts.total) || 0, last_refreshed: counts.last },
      profile: { hasSkills: profile.skills.length > 0, exists: profile.exists, fromResume: profile.fromResume },
    });
  } catch (err) {
    console.error('[jobs] list', err.message);
    res.status(500).json({ message: 'Could not load jobs.' });
  }
});

// GET /jobs/recommended — best matches posted in the last 30 days
router.get('/recommended', auth, async (req, res) => {
  try {
    const profile = await loadProfile(req.user.id);
    if (!profile.skills.length && !profile.target_roles.length) return res.json({ jobs: [], needsProfile: true });
    const [rows] = await q().query(
      `SELECT j.*, a.status AS app_status, a.id AS app_id FROM jobs j
       LEFT JOIN job_applications a ON a.job_id = j.id AND a.user_id = ?
       WHERE (j.user_id IS NULL OR j.user_id = ?) AND COALESCE(j.posted_at, j.fetched_at) >= ?
       ORDER BY COALESCE(j.posted_at, j.fetched_at) DESC LIMIT 1500`,
      [req.user.id, req.user.id, new Date(Date.now() - 30 * 86400000)]
    );
    let jobs = rows.map((r) => shapeJob(r, profile)).filter((j) => !j.status);
    if (profile.remote_only) jobs = jobs.filter((j) => j.remote);
    if (profile.locations.length && !profile.remote_only) {
      const locs = profile.locations.map((l) => l.toLowerCase());
      jobs = jobs.filter((j) => j.remote || locs.some((l) => (j.location || '').toLowerCase().includes(l)));
    }
    jobs.sort((a, b) => (b.match || 0) - (a.match || 0));
    res.json({ jobs: jobs.slice(0, Number(req.query.limit) || 8) });
  } catch (err) {
    console.error('[jobs] recommended', err.message);
    res.status(500).json({ message: 'Could not load recommendations.' });
  }
});

// POST /jobs/refresh — pull the latest jobs now (at most every 10 minutes)
let lastManual = 0;
router.post('/refresh', auth, async (req, res) => {
  if (Date.now() - lastManual < 10 * 60 * 1000) {
    return res.status(429).json({ message: 'Jobs were refreshed a few minutes ago. Please try again shortly.' });
  }
  lastManual = Date.now();
  try {
    const r = await refreshJobs();
    res.json({ message: `Found ${r.saved} jobs.`, ...r });
  } catch (err) {
    res.status(500).json({ message: 'Could not refresh jobs right now.' });
  }
});

// POST /jobs/custom — a member pastes a job they found anywhere
router.post('/custom', auth, async (req, res) => {
  const b = req.body || {};
  const title = String(b.title || '').trim();
  const description = stripHtml(String(b.description || '')).trim();
  if (!title) return res.status(400).json({ message: 'Add the job title.' });
  if (description.length < 40) return res.status(400).json({ message: 'Paste the job description so we can match your skills.' });
  try {
    const skills = extractSkills(`${title}\n${description}`);
    const [r] = await q().query(
      `INSERT INTO jobs (source, external_id, user_id, title, company, location, remote, url, description, skills, posted_at)
       VALUES ('custom', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`u${req.user.id}-${Date.now()}`, req.user.id, title.slice(0, 300), String(b.company || '').slice(0, 200) || null,
        String(b.location || '').slice(0, 255) || null, /remote/i.test(`${b.location} ${description.slice(0, 400)}`) ? 1 : 0,
        String(b.url || '').slice(0, 1000) || null, description, JSON.stringify(skills), new Date()]
    );
    res.json({ id: r.insertId, message: 'Job added.' });
  } catch (err) {
    console.error('[jobs] custom', err.message);
    res.status(500).json({ message: 'Could not add the job.' });
  }
});

async function loadJob(id, userId) {
  const [rows] = await q().query(
    `SELECT j.*, a.status AS app_status, a.id AS app_id FROM jobs j
     LEFT JOIN job_applications a ON a.job_id = j.id AND a.user_id = ?
     WHERE j.id = ? AND (j.user_id IS NULL OR j.user_id = ?)`,
    [userId, id, userId]
  );
  return rows[0] || null;
}

async function loadInsight(userId, jobId) {
  const [rows] = await q().query('SELECT * FROM job_insights WHERE user_id = ? AND job_id = ?', [userId, jobId]);
  return rows[0] || null;
}

async function saveInsight(userId, jobId, field, value) {
  const existing = await loadInsight(userId, jobId);
  if (existing) await q().query(`UPDATE job_insights SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [value, existing.id]);
  else await q().query(`INSERT INTO job_insights (user_id, job_id, ${field}) VALUES (?, ?, ?)`, [userId, jobId, value]);
}

// GET /jobs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await loadJob(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ message: 'Job not found.' });
    const profile = await loadProfile(req.user.id);
    const insight = await loadInsight(req.user.id, row.id);
    res.json({
      job: shapeJob(row, profile, { description: row.description }),
      analysis: insight ? parse(insight.analysis, null) : null,
      kit: insight ? parse(insight.kit, null) : null,
      roadmap_id: insight ? insight.roadmap_id : null,
      profile: { skills: profile.skills, target_roles: profile.target_roles },
    });
  } catch (err) {
    console.error('[jobs] detail', err.message);
    res.status(500).json({ message: 'Could not load this job.' });
  }
});

async function memberContext(userId) {
  const profile = await loadProfile(userId);
  const [r] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ? LIMIT 1', [userId]).catch(() => [[]]);
  const resume = r[0] ? resumeToText(r[0].resume_data) : {};
  const [u] = await q().query('SELECT name FROM users WHERE id = ?', [userId]);
  return { profile, resume, name: (u[0] && u[0].name) || resume.name || '' };
}

const jobText = (job) => `Title: ${job.title}\nCompany: ${job.company || 'Unknown'}\nLocation: ${job.location || 'Not stated'}\n\n${String(job.description || '').slice(0, 7000)}`;
const memberText = ({ profile, resume, name }) => `Name: ${name}
Target roles: ${profile.target_roles.join(', ') || 'not set'}
Level: ${profile.level || 'not set'}
Skills: ${profile.skills.join(', ') || resume.skills || 'not set'}
Resume headline: ${resume.headline || 'not provided'}
Resume summary: ${resume.summary || 'not provided'}
Experience: ${String(resume.experience || 'not provided').slice(0, 2500)}
Projects: ${String(resume.projects || 'none').slice(0, 1500)}
Education: ${String(resume.education || 'not provided').slice(0, 800)}
Certifications: ${String(resume.certifications || 'none').slice(0, 400)}`;

// POST /jobs/:id/analyze — AI fit analysis (agent 1)
router.post('/:id/analyze', auth, aiLimit, async (req, res) => {
  try {
    const job = await loadJob(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    const member = await memberContext(req.user.id);
    const data = await generateJSON(`You are a candid, practical career coach. Assess how well this candidate fits this job.

JOB
${jobText(job)}

CANDIDATE
${memberText(member)}

Be honest but encouraging. Distinguish must-have requirements from nice-to-haves.
Return JSON:
{
  "fit_score": 0-100,
  "verdict": "apply now | apply after quick prep | build skills first",
  "summary": "2-3 sentences",
  "strengths": ["specific matching strength", "..."],
  "gaps": [ { "skill": "string", "importance": "must-have|nice-to-have", "how_to_close": "one concrete sentence", "time": "e.g. 1-2 weeks" } ],
  "talking_points": ["how to position existing experience for this role", "..."],
  "red_flags": ["anything in the posting the candidate should check, e.g. years required, location, clearance"]
}`);
    await saveInsight(req.user.id, job.id, 'analysis', JSON.stringify(data));
    res.json({ analysis: data });
  } catch (err) {
    sendAIError(res, err, 'Could not analyse your fit right now.');
  }
});

// POST /jobs/:id/prepare — AI application kit (agent 2). Saves the job to the tracker.
router.post('/:id/prepare', auth, aiLimit, async (req, res) => {
  try {
    const job = await loadJob(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    const member = await memberContext(req.user.id);
    const data = await generateJSON(`You are an expert recruiter helping a candidate apply. Write tailored application materials.

JOB
${jobText(job)}

CANDIDATE
${memberText(member)}

Rules:
- Never invent employers, degrees, metrics or experience the candidate didn't list. Where a metric would help, use a placeholder like [X%] for them to fill in.
- Mirror the job's language and keywords where they truthfully apply.
- Cover letter: 3 short paragraphs, under 220 words, specific to this company and role, no clichés.

Return JSON:
{
  "headline": "one-line resume headline for this role",
  "summary": "tailored 3-sentence resume summary",
  "bullets": [ { "original_hint": "which experience it rewrites", "improved": "achievement-style bullet using job keywords" } ],
  "keywords": ["ATS keyword from the posting the resume should include", "..."],
  "cover_letter": "full text with \\n between paragraphs",
  "answers": [ { "question": "likely application question, e.g. Why this company?", "answer": "short tailored answer" } ],
  "checklist": ["step to complete before submitting", "..."]
}`);
    await saveInsight(req.user.id, job.id, 'kit', JSON.stringify(data));
    // Put it on the tracker as "saved" if it isn't there yet.
    const [has] = await q().query('SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?', [req.user.id, job.id]);
    if (!has.length) {
      await q().query(
        `INSERT INTO job_applications (user_id, job_id, job_title, company, status, url, location, updated_at) VALUES (?, ?, ?, ?, 'saved', ?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, job.id, job.title, job.company, job.url, job.location]
      );
    }
    res.json({ kit: data });
  } catch (err) {
    sendAIError(res, err, 'Could not prepare your application right now.');
  }
});

// POST /jobs/:id/gap-roadmap — build a roadmap for exactly the missing skills (agent 3)
router.post('/:id/gap-roadmap', auth, aiLimit, async (req, res) => {
  try {
    const job = await loadJob(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    const member = await memberContext(req.user.id);
    const m = matchJob({ title: job.title, skills: parse(job.skills, []) }, member.profile);
    const insight = await loadInsight(req.user.id, job.id);
    const analysis = insight ? parse(insight.analysis, null) : null;
    const gaps = (analysis && analysis.gaps && analysis.gaps.length ? analysis.gaps.map((g) => g.skill) : m.missing).slice(0, 8);
    if (!gaps.length) return res.status(400).json({ message: 'You already have every skill this job lists — go ahead and apply!' });

    const profile = {
      topic: `${gaps.join(', ')} for the ${job.title} role${job.company ? ` at ${job.company}` : ''}`,
      goal: `Become a strong candidate for "${job.title}"${job.company ? ` at ${job.company}` : ''} by closing these gaps: ${gaps.join(', ')}`,
      level: member.profile.level || 'intermediate',
      background: `Already knows: ${member.profile.skills.join(', ') || 'not specified'}`,
      hoursPerWeek: Math.min(40, Math.max(2, parseInt(req.body.hoursPerWeek, 10) || 8)),
      duration: req.body.duration || '4 weeks',
      style: 'hands-on practice and building portfolio projects that match the job',
    };
    const { plan, details } = await generateRoadmap(profile);

    const totalHours = plan.modules.reduce((n, x) => n + (x.est_hours || 0), 0);
    const [r] = await q().query(
      'INSERT INTO roadmaps (user_id, title, description, goal, duration, status, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, plan.title, plan.description, plan.goal, profile.duration, 'active',
        JSON.stringify({ version: 2, profile, outcomes: plan.outcomes, prerequisites: plan.prerequisites, capstone: plan.capstone, total_hours: totalHours, hours_per_week: profile.hoursPerWeek, job: { id: job.id, title: job.title, company: job.company } })]
    );
    const roadmapId = r.insertId;
    for (let i = 0; i < plan.modules.length; i++) {
      const mod = plan.modules[i];
      const d = details[i] || { tasks: [] };
      const [mr] = await q().query(
        'INSERT INTO modules (roadmap_id, title, description, order_index, position, details) VALUES (?, ?, ?, ?, ?, ?)',
        [roadmapId, mod.title, mod.summary, i, i, JSON.stringify({ outcome: mod.outcome, est_hours: mod.est_hours, week: mod.week, objectives: d.objectives, key_concepts: d.key_concepts, project: d.project, interview_questions: d.interview_questions, common_mistakes: d.common_mistakes })]
      );
      for (let k = 0; k < d.tasks.length; k++) {
        const t = d.tasks[k];
        await insertTask({ userId: req.user.id, roadmapId, moduleId: mr.insertId, title: t.title, description: t.instructions, position: k, taskType: t.type, estMinutes: t.est_minutes, details: { steps: t.steps, done_when: t.done_when, resources: t.resources } });
      }
    }
    for (const res0 of plan.resources) {
      await q().query('INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, 1)', [roadmapId, res0.title, res0.url, res0.type]).catch(() => {});
    }
    await saveInsight(req.user.id, job.id, 'roadmap_id', roadmapId);
    await q().query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [req.user.id, 'Gap roadmap ready', `Your plan to close the gaps for “${job.title}” is ready.`]).catch(() => {});
    res.json({ roadmapId, gaps });
  } catch (err) {
    sendAIError(res, err, 'Could not build the roadmap right now.');
  }
});

module.exports = router;
