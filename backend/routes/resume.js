const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
Write 3-4 sentences. Professional tone. No bullet points. Just paragraph text.`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate summary', error: err.message });
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
You are a professional resume reviewer.
Review this resume and give:
1. A score out of 100
2. 3 specific tips to improve it

Resume details:
Name: ${name}
Goal: ${goal}
Summary: ${summary}
Skills: ${skills}
Experience: ${experience}
Education: ${education}

Respond in this exact JSON format:
{"score": 75, "tips": "tip1. tip2. tip3."}
Only respond with JSON, nothing else.
    `;
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ats-check', verifyToken, async (req, res) => {
  const { name, summary, skills, experience, education, goal } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
You are an ATS (Applicant Tracking System) expert.
Analyze this resume and return a JSON response.

Resume:
Name: ${name}
Goal: ${goal}
Summary: ${summary}
Skills: ${skills}
Experience: ${experience}
Education: ${education}

Respond in this EXACT JSON format only, no extra text:
{
  "atsScore": 75,
  "keywordsFound": ["React", "Node.js", "MySQL"],
  "keywordsMissing": ["Docker", "AWS", "TypeScript"],
  "suggestions": "Add more action verbs. Include measurable achievements. Add relevant certifications."
}
    `;
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
