const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all available badges
router.get('/', auth, async (req, res) => {
  try {
    const [badges] = await db.promise().query('SELECT * FROM badges');
    const [userBadges] = await db.promise().query(
      'SELECT badge_id FROM user_badges WHERE user_id = ?',
      [req.user.id]
    );
    const earnedIds = userBadges.map(b => b.badge_id);
    const result = badges.map(b => ({
      ...b,
      earned: earnedIds.includes(b.id)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user badges only
router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT b.*, ub.earned_at FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CHECK and award badges automatically
router.post('/check', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const awarded = [];

    // Get user stats
    const [stats] = await db.promise().query(
      'SELECT * FROM user_stats WHERE user_id = ?', [userId]
    );
    const [roadmaps] = await db.promise().query(
      'SELECT COUNT(*) as total FROM roadmaps WHERE user_id = ?', [userId]
    );
    const [doneTasks] = await db.promise().query(
      `SELECT COUNT(*) as total FROM tasks t
       JOIN modules m ON t.module_id = m.id
       JOIN roadmaps r ON m.roadmap_id = r.id
       WHERE r.user_id = ? AND t.status = 'done'`, [userId]
    );

    const totalRoadmaps = roadmaps[0].total;
    const completedTasks = doneTasks[0].total;
    const streakDays = stats[0]?.streak_days || 0;

    // Check already earned badges
    const [earnedBadges] = await db.promise().query(
      'SELECT badge_id FROM user_badges WHERE user_id = ?', [userId]
    );
    const earnedIds = earnedBadges.map(b => b.badge_id);

    // Badge 1 - First Roadmap (id:1)
    if (totalRoadmaps >= 1 && !earnedIds.includes(1)) {
      await db.promise().query(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, 1]
      );
      awarded.push('First Roadmap');
    }

    // Badge 2 - Task Master (id:2)
    if (completedTasks >= 10 && !earnedIds.includes(2)) {
      await db.promise().query(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, 2]
      );
      awarded.push('Task Master');
    }

    // Badge 4 - Streak Starter (id:4)
    if (streakDays >= 3 && !earnedIds.includes(4)) {
      await db.promise().query(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, 4]
      );
      awarded.push('Streak Starter');
    }

    // Update level based on XP
    const xp = stats[0]?.xp_points || 0;
    const newLevel = Math.floor(xp / 100) + 1;
    await db.promise().query(
      'UPDATE user_stats SET level = ? WHERE user_id = ?',
      [newLevel, userId]
    );

    res.json({ message: 'Badges checked', awarded });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
