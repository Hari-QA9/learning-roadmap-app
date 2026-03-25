const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate module evaluation quiz
router.post('/module-quiz', verifyToken, async (req, res) => {
  const { moduleTitle, tasks } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
Generate a 5-question multiple choice quiz to evaluate understanding of: "${moduleTitle}"
Topics covered: ${tasks.join(', ')}

Respond ONLY in this exact JSON format:
{
  "questions": [
    {
      "question": "What is...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}
"correct" is the index (0-3) of the correct option.
Generate exactly 5 questions. Only respond with valid JSON.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error('Module quiz error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generate final roadmap evaluation quiz
router.post('/roadmap-quiz', verifyToken, async (req, res) => {
  const { roadmapTitle, modules } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
Generate a 10-question multiple choice final evaluation quiz for the course: "${roadmapTitle}"
Modules covered: ${modules.join(', ')}

Respond ONLY in this exact JSON format:
{
  "questions": [
    {
      "question": "What is...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}
"correct" is the index (0-3) of the correct option.
Generate exactly 10 questions covering all modules. Only respond with valid JSON.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error('Roadmap quiz error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Save module evaluation result
router.post('/module-result', verifyToken, async (req, res) => {
  const { module_id, roadmap_id, score, total } = req.body;
  const userId = req.user.id;
  const passed = score / total >= 0.7 ? 1 : 0;

  try {
    await db.promise().query(
      'INSERT INTO module_evaluations (user_id, module_id, roadmap_id, score, total, passed) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, module_id, roadmap_id, score, total, passed]
    );
    res.json({ passed, score, total, message: passed ? 'Module passed!' : 'Try again' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if module evaluation passed
router.get('/module-status/:moduleId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM module_evaluations WHERE user_id = ? AND module_id = ? AND passed = 1 ORDER BY id DESC LIMIT 1',
      [userId, req.params.moduleId]
    );
    res.json({ passed: rows.length > 0, result: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save roadmap evaluation and issue certificate
router.post('/roadmap-result', verifyToken, async (req, res) => {
  const { roadmap_id, roadmap_title, score, total } = req.body;
  const userId = req.user.id;
  const passed = score / total >= 0.7 ? 1 : 0;

  try {
    await db.promise().query(
      'INSERT INTO roadmap_evaluations (user_id, roadmap_id, score, total, passed) VALUES (?, ?, ?, ?, ?)',
      [userId, roadmap_id, score, total, passed]
    );

    let certificate = null;

    if (passed) {
      const [userRows] = await db.promise().query(
        'SELECT name FROM users WHERE id = ?', [userId]
      );
      const userName = userRows[0]?.name || 'Student';
      const certId = 'CERT-' + Date.now() + '-' + userId;

      await db.promise().query(
        'INSERT INTO certificates (user_id, roadmap_id, roadmap_title, user_name, certificate_id) VALUES (?, ?, ?, ?, ?)',
        [userId, roadmap_id, roadmap_title, userName, certId]
      );

      certificate = {
        certificate_id: certId,
        user_name: userName,
        roadmap_title,
        issued_at: new Date().toISOString(),
      };
    }

    res.json({ passed, score, total, certificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all certificates for user
router.get('/certificates', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC',
      [userId]
    );
    res.json({ certificates: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check roadmap evaluation status
router.get('/roadmap-status/:roadmapId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [certRows] = await db.promise().query(
      'SELECT * FROM certificates WHERE user_id = ? AND roadmap_id = ?',
      [userId, req.params.roadmapId]
    );
    const [evalRows] = await db.promise().query(
      'SELECT * FROM roadmap_evaluations WHERE user_id = ? AND roadmap_id = ? ORDER BY id DESC LIMIT 1',
      [userId, req.params.roadmapId]
    );
    res.json({
      hasCertificate: certRows.length > 0,
      certificate: certRows[0] || null,
      lastEvaluation: evalRows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
