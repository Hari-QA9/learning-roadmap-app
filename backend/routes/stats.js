const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const verifyToken = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [roadmaps] = await db.promise().query(
      'SELECT COUNT(*) as total FROM roadmaps WHERE user_id = ?', [userId]
    );

    const [tasks] = await db.promise().query(
      `SELECT COUNT(*) as total FROM tasks t
       JOIN modules m ON t.module_id = m.id
       JOIN roadmaps r ON m.roadmap_id = r.id
       WHERE r.user_id = ?`, [userId]
    );

    const [completedTasks] = await db.promise().query(
      `SELECT COUNT(*) as total FROM tasks t
       JOIN modules m ON t.module_id = m.id
       JOIN roadmaps r ON m.roadmap_id = r.id
       WHERE r.user_id = ? AND t.status = 'done'`, [userId]
    );

    const [modules] = await db.promise().query(
      `SELECT COUNT(*) as total FROM modules m
       JOIN roadmaps r ON m.roadmap_id = r.id
       WHERE r.user_id = ?`, [userId]
    );

    const [existingStats] = await db.promise().query(
      'SELECT * FROM user_stats WHERE user_id = ?', [userId]
    );
    if (existingStats.length === 0) {
      await db.promise().query(
        'INSERT INTO user_stats (user_id, xp_points, level, streak_days) VALUES (?, 0, 1, 0)',
        [userId]
      );
    }

    const [stats] = await db.promise().query(
      'SELECT * FROM user_stats WHERE user_id = ?', [userId]
    );

    const [roadmapProgress] = await db.promise().query(
      `SELECT r.id, r.title,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks
       FROM roadmaps r
       LEFT JOIN modules m ON m.roadmap_id = r.id
       LEFT JOIN tasks t ON t.module_id = m.id
       WHERE r.user_id = ?
       GROUP BY r.id, r.title`, [userId]
    );

    const [badges] = await db.promise().query(
      `SELECT b.name, b.icon, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ?`, [userId]
    );

    const [logs] = await db.promise().query(
      'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId]
    );

    // Quiz results
    const [quizResults] = await db.promise().query(
      `SELECT
        COUNT(*) as total_attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct,
        COUNT(DISTINCT quiz_id) as unique_quizzes
       FROM quiz_results
       WHERE user_id = ?`, [userId]
    );

    // Recent quiz attempts
    const [recentQuizzes] = await db.promise().query(
      `SELECT qr.answered_at, qr.is_correct, q.question
       FROM quiz_results qr
       JOIN quizzes q ON qr.quiz_id = q.id
       WHERE qr.user_id = ?
       ORDER BY qr.answered_at DESC
       LIMIT 5`, [userId]
    );

    res.json({
      totalRoadmaps: roadmaps[0].total,
      totalTasks: tasks[0].total,
      completedTasks: completedTasks[0].total,
      totalModules: modules[0].total,
      xpPoints: stats[0] ? stats[0].xp_points : 0,
      level: stats[0] ? stats[0].level : 1,
      streakDays: stats[0] ? stats[0].streak_days : 0,
      roadmapProgress: roadmapProgress,
      badges: badges,
      recentActivity: logs,
      quizStats: {
        totalAttempts: quizResults[0].total_attempts || 0,
        totalCorrect: quizResults[0].total_correct || 0,
        uniqueQuizzes: quizResults[0].unique_quizzes || 0,
        accuracy: quizResults[0].total_attempts > 0
          ? Math.round((quizResults[0].total_correct / quizResults[0].total_attempts) * 100)
          : 0
      },
      recentQuizzes: recentQuizzes
    });

  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.get('/quiz-performance', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [overall] = await db.promise().query(
      `SELECT
        COUNT(*) as total_attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct,
        COUNT(DISTINCT quiz_id) as unique_questions
       FROM quiz_results WHERE user_id = ?`, [userId]
    );

    const [quizHistory] = await db.promise().query(
      `SELECT
        qr.id,
        qr.quiz_id,
        qr.selected_answer,
        qr.is_correct,
        qr.answered_at,
        q.question,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer
       FROM quiz_results qr
       JOIN quizzes q ON qr.quiz_id = q.id
       WHERE qr.user_id = ?
       ORDER BY qr.answered_at DESC`, [userId]
    );

    const total = parseInt(overall[0].total_attempts) || 0;
    const correct = parseInt(overall[0].total_correct) || 0;
    const accuracyVal = total > 0 ? Math.round((correct / total) * 100) : 0;

    let suggestions = [];
    if (total === 0) {
      suggestions = ['Take your first quiz to get personalized suggestions!'];
    } else if (accuracyVal < 50) {
      suggestions = [
        'Review the basic concepts of the topics you are studying',
        'Try reading documentation before taking quizzes',
        'Practice with smaller topics first',
        'Use the AI Chat to ask questions about topics you find difficult'
      ];
    } else if (accuracyVal < 80) {
      suggestions = [
        'You are doing well! Focus on the questions you got wrong',
        'Try generating roadmaps for topics where you score below 70%',
        'Review your incorrect answers and study those areas more',
        'Take quizzes more frequently to improve retention'
      ];
    } else {
      suggestions = [
        'Excellent performance! Try more advanced topics',
        'Challenge yourself with harder subjects',
        'Share your knowledge by creating roadmaps for others',
        'You are ready to move to the next level!'
      ];
    }

    res.json({
      overall: {
        totalAttempts: total,
        totalCorrect: correct,
        accuracy: accuracyVal,
        uniqueQuestions: parseInt(overall[0].unique_questions) || 0
      },
      quizHistory: quizHistory,
      suggestions: suggestions
    });

  } catch (err) {
    console.error('Quiz performance error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/stats/update-streak
router.post('/update-streak', verifyToken, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  db.query(
    'SELECT * FROM streaks WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      if (rows.length === 0) {
        db.query(
          'INSERT INTO streaks (user_id, streak_count, last_active) VALUES (?, 1, ?)',
          [userId, today],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ streak: 1 });
          }
        );
      } else {
        const last = rows[0];
        const lastDate = new Date(last.last_active);
        const todayDate = new Date(today);
        const diffDays = Math.floor(
          (todayDate - lastDate) / (1000 * 60 * 60 * 24)
        );

        let newStreak = last.streak_count;
        if (diffDays === 1) {
          newStreak = last.streak_count + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }

        db.query(
          'UPDATE streaks SET streak_count = ?, last_active = ? WHERE user_id = ?',
          [newStreak, today, userId],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ streak: newStreak });
          }
        );
      }
    }
  );
});

router.get('/progress', verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    'SELECT * FROM roadmaps WHERE user_id = ?',
    [userId],
    (err, roadmaps) => {
      if (err) return res.status(500).json({ error: err.message });

      if (roadmaps.length === 0) return res.json({ progress: [] });

      const results = [];
      let done = 0;

      roadmaps.forEach((roadmap) => {
        db.query(
          'SELECT COUNT(*) as total FROM tasks WHERE roadmap_id = ? AND user_id = ?',
          [roadmap.id, userId],
          (err2, totalRes) => {
            db.query(
              'SELECT COUNT(*) as completed FROM tasks WHERE roadmap_id = ? AND user_id = ? AND status = "completed"',
              [roadmap.id, userId],
              (err3, completedRes) => {
                const total = totalRes[0].total;
                const completed = completedRes[0].completed;
                const percent = total > 0
                  ? Math.round((completed / total) * 100)
                  : 0;

                results.push({
                  id: roadmap.id,
                  title: roadmap.title,
                  total,
                  completed,
                  percent,
                });

                done++;
                if (done === roadmaps.length) {
                  res.json({ progress: results });
                }
              }
            );
          }
        );
      });
    }
  );
});




module.exports = router;
