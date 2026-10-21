const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const verifyToken = require('../middleware/auth');
const { generateJSON, generateText, sendAIError } = require('../lib/gemini');

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.promise().query(
      'SELECT id, name, email, bio FROM users WHERE id = ?', [userId]
    );
    const [roadmaps] = await db.promise().query(
      'SELECT * FROM roadmaps WHERE user_id = ? AND status = ?',
      [userId, 'completed']
    );
    const [allRoadmaps] = await db.promise().query(
      'SELECT * FROM roadmaps WHERE user_id = ?', [userId]
    );
    const [stats] = await db.promise().query(
      'SELECT * FROM user_stats WHERE user_id = ?', [userId]
    );
    const [badges] = await db.promise().query(
      `SELECT b.name, b.icon FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ?`, [userId]
    );
    res.json({
      user: user[0],
      completedRoadmaps: roadmaps,
      allRoadmaps: allRoadmaps,
      stats: stats[0] || {},
      badges: badges
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/generate-summary', auth, async (req, res) => {
  const { skills, experience, goal } = req.body;
  try {
    const prompt = `Write a professional resume summary for someone with these skills: ${skills}.
Experience: ${experience}.
Career goal: ${goal}.
Write 3-4 sentences. Professional tone. No bullet points. Just paragraph text. Do not invent employers or numbers.`;
    const summary = (await generateText(prompt)).trim();
    res.json({ summary });
  } catch (err) {
    sendAIError(res, err, 'Could not write a summary. Please try again.');
  }
});

router.post('/save', auth, async (req, res) => {
  const { resume_data } = req.body;
  try {
    await db.promise().query(
      `INSERT INTO user_resumes (user_id, resume_data)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE resume_data = ?, updated_at = NOW()`,
      [req.user.id, JSON.stringify(resume_data), JSON.stringify(resume_data)]
    );
    res.json({ message: 'Resume saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/saved', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM user_resumes WHERE user_id = ?', [req.user.id]
    );
    if (rows.length > 0) {
      res.json({ resume: JSON.parse(rows[0].resume_data) });
    } else {
      res.json({ resume: null });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/score', verifyToken, async (req, res) => {
  const { name, summary, skills, experience, education, goal } = req.body;
  try {
    const data = await generateJSON(`You are a senior recruiter reviewing a resume. Be specific and honest.
Resume:
Name: ${name}
Target role / goal: ${goal}
Summary: ${summary}
Skills: ${skills}
Experience: ${experience}
Education: ${education}

Return JSON: { "score": 0-100, "strengths": ["string", "string"], "tips": ["specific improvement", "...3-5 items"] }`);
    res.json(data);
  } catch (err) {
    sendAIError(res, err, 'Could not score the resume. Please try again.');
  }
});

router.post('/ats-check', verifyToken, async (req, res) => {
  const { name, summary, skills, experience, education, goal, jobDescription } = req.body;
  const target = jobDescription
    ? `Compare the resume against this job description:\n---\n${String(jobDescription).slice(0, 6000)}\n---`
    : `Compare the resume against typical job postings for: ${goal || 'the candidate’s target role'}.`;
  try {
    const data = await generateJSON(`You are an ATS (applicant tracking system) expert.
${target}

Resume:
Name: ${name}
Goal: ${goal}
Summary: ${summary}
Skills: ${skills}
Experience: ${experience}
Education: ${education}

Return JSON: {
  "atsScore": 0-100,
  "keywordsFound": ["string"],
  "keywordsMissing": ["string"],
  "suggestions": ["specific, actionable suggestion", "..."]
}`);
    res.json(data);
  } catch (err) {
    sendAIError(res, err, 'Could not run the ATS check. Please try again.');
  }
});

module.exports = router;
