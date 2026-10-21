const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { generateJSON, sendAIError } = require('../lib/gemini');

// GENERATE QUIZ
router.post('/generate', auth, async (req, res) => {
  const topic = String(req.body.topic || '').trim();
  const difficulty = req.body.difficulty || 'medium';
  const count = Math.min(10, Math.max(3, parseInt(req.body.count, 10) || 5));
  if (!topic) return res.status(400).json({ message: 'Please enter a topic.' });

  let questions;
  try {
    const data = await generateJSON(`Create exactly ${count} ${difficulty} multiple-choice questions about "${topic}".
Each question has 4 plausible options and exactly one correct answer. Add a one-sentence explanation.
Return JSON: { "questions": [ { "question": "string", "option_a": "string", "option_b": "string", "option_c": "string", "option_d": "string", "correct_answer": "A|B|C|D", "explanation": "string" } ] }`);
    questions = (Array.isArray(data) ? data : data.questions || [])
      .filter((q) => q && q.question && q.option_a && q.option_b)
      .map((q) => ({ ...q, correct_answer: String(q.correct_answer || 'A').trim().charAt(0).toUpperCase() }));
    if (!questions.length) throw new Error('The AI response was not valid JSON. Please try again.');
  } catch (err) {
    return sendAIError(res, err, 'Could not generate a quiz. Please try again.');
  }

  try {
    const saved = [];
    for (const q of questions) {
      try {
        const [ins] = await db.promise().query(
          `INSERT INTO quizzes (roadmap_id, question, option_a, option_b, option_c, option_d, correct_answer)
           VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
          [q.question, q.option_a, q.option_b, q.option_c || '', q.option_d || '', q.correct_answer]
        );
        saved.push({ id: ins.insertId, ...q });
      } catch (e) {
        console.log('Quiz save error:', e.message);
        saved.push({ id: null, ...q });
      }
    }
    await db.promise().query('UPDATE user_stats SET xp_points = xp_points + 15 WHERE user_id = ?', [req.user.id]).catch(() => {});
    res.json({ message: 'Quiz generated', topic, questions: saved });
  } catch (err) {
    console.error('Quiz error:', err);
    res.status(500).json({ message: 'Could not save the quiz.' });
  }
});

// SUBMIT ANSWER
router.post('/submit', auth, async (req, res) => {
  const { quiz_id, selected_answer, correct_answer } = req.body;
  try {
    const is_correct = selected_answer === correct_answer ? 1 : 0;
    if (!quiz_id) return res.json({ message: 'Not recorded', is_correct: is_correct === 1 });
    await db.promise().query(
      'INSERT INTO quiz_results (user_id, quiz_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)',
      [req.user.id, quiz_id, selected_answer, is_correct]
    );
    if (is_correct) {
      await db.promise().query(
        'UPDATE user_stats SET xp_points = xp_points + 10 WHERE user_id = ?',
        [req.user.id]
      );
    }
    res.json({ message: 'Submitted', is_correct: is_correct === 1 });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET ALL QUIZ PERFORMANCE FOR USER
router.get('/my-performance', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [overallRows] = await db.promise().query(
      `
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct,
        COUNT(DISTINCT quiz_id) as unique_questions
      FROM quiz_results
      WHERE user_id = ?
      `,
      [userId]
    );

    const overall = overallRows[0] || {
      total_attempts: 0,
      total_correct: 0,
      unique_questions: 0,
    };

    const [quizSessions] = await db.promise().query(
      `
      SELECT 
        qr.quiz_id,
        q.question,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        qr.selected_answer,
        qr.is_correct,
        qr.answered_at
      FROM quiz_results qr
      JOIN quizzes q ON qr.quiz_id = q.id
      WHERE qr.user_id = ?
      ORDER BY qr.answered_at DESC
      `,
      [userId]
    );

    const total = parseInt(overall.total_attempts) || 0;
    const correct = parseInt(overall.total_correct) || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    let suggestions = [];
    if (accuracy < 50) {
      suggestions = [
        'Review the basic concepts of the topics you are studying',
        'Try reading documentation before taking quizzes',
        'Practice with smaller topics first',
        'Use the AI Chat to ask questions about topics you find difficult',
      ];
    } else if (accuracy < 80) {
      suggestions = [
        'You are doing well! Focus on the questions you got wrong',
        'Try generating roadmaps for topics where you score below 70%',
        'Review your incorrect answers and study those areas more',
        'Take quizzes more frequently to improve retention',
      ];
    } else {
      suggestions = [
        'Excellent performance! Try more advanced topics',
        'Challenge yourself with harder subjects',
        'Share your knowledge by creating roadmaps for others',
        'You are ready to move to the next level!',
      ];
    }

    res.json({
      overall: {
        totalAttempts: total,
        totalCorrect: correct,
        accuracy: accuracy,
        uniqueQuestions: parseInt(overall.unique_questions) || 0,
      },
      quizHistory: quizSessions,
      suggestions: suggestions,
    });
  } catch (err) {
    console.error('Performance error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// GET quiz by roadmap
router.get('/:roadmapId', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM quizzes WHERE roadmap_id = ?',
      [req.params.roadmapId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
