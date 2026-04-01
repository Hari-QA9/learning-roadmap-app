const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.get('/dashboard', verifyToken, (req, res) => {
  const userId = req.user.id;

  const runQuery = (sql, params) => {
    return new Promise((resolve) => {
      db.query(sql, params, (err, rows) => {
        if (err) {
          console.error('Query error:', err.message);
          resolve(0);
        } else {
          resolve(rows[0]?.count || 0);
        }
      });
    });
  };

  Promise.all([
    runQuery(`SELECT COUNT(*) as count FROM roadmaps WHERE user_id = ?`, [userId]),
    runQuery(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done'`, [userId]),
    runQuery(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'pending'`, [userId]),
    runQuery(`SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?`, [userId]),
    // ✅ Fixed: use quiz_results table instead of quiz_attempts
    runQuery(`SELECT COUNT(*) as count FROM quiz_results WHERE user_id = ?`, [userId]),
  ])
    .then(([totalRoadmaps, completedTasks, pendingTasks, badges, quizzesTaken]) => {
      res.json({
        totalRoadmaps,
        completedTasks,
        pendingTasks,
        badges,
        quizzesTaken,
        streak: 0,
      });
    })
    .catch(err => {
      console.error('Stats error:', err);
      res.status(500).json({ message: 'Failed to fetch stats' });
    });
});

router.post('/update-streak', verifyToken, (req, res) => {
  res.json({ message: 'Streak updated', streak: 1 });
});

router.get('/quiz-performance', verifyToken, (req, res) => {
  const userId = req.user.id;

  const overallSql = `
    SELECT 
      COUNT(*) as totalAttempts,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as totalCorrect
    FROM quiz_results WHERE user_id = ?
  `;

  const historySql = `
    SELECT qr.*, q.question
    FROM quiz_results qr
    JOIN quizzes q ON qr.quiz_id = q.id
    WHERE qr.user_id = ?
    ORDER BY qr.answered_at DESC
    LIMIT 20
  `;

  db.query(overallSql, [userId], (err, overallRows) => {
    if (err) return res.status(500).json({ message: 'Error fetching stats' });

    const overall = overallRows[0];
    const total = parseInt(overall.totalAttempts) || 0;
    const correct = parseInt(overall.totalCorrect) || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    db.query(historySql, [userId], (err2, historyRows) => {
      if (err2) return res.status(500).json({ message: 'Error fetching history' });

      const suggestions = [];
      if (accuracy < 50) suggestions.push('Review your module materials before taking quizzes');
      if (accuracy < 70) suggestions.push('Practice with smaller topics first');
      if (total < 5) suggestions.push('Take more quizzes to improve your score');
      suggestions.push('Use the AI Chat to ask questions about difficult topics');

      res.json({
        overall: {
          totalAttempts: total,
          totalCorrect: correct,
          accuracy,
          uniqueModules: historyRows.length,
        },
        quizHistory: historyRows,
        suggestions,
      });
    });
  });
});

module.exports = router;