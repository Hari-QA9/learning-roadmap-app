const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET profile
router.get('/', auth, async (req, res) => {
  try {
    const [users] = await db.promise().query(
      'SELECT id, name, email, profile_picture, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    const [stats] = await db.promise().query(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [req.user.id]
    );
    const [badges] = await db.promise().query(
      `SELECT b.name, b.description, b.icon, ub.earned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ?`,
      [req.user.id]
    );
    const [logs] = await db.promise().query(
      'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    res.json({
      user: users[0],
      stats: stats[0] || {},
      badges,
      recentActivity: logs
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE profile
router.put('/', auth, async (req, res) => {
  const { name, bio, profile_picture } = req.body;
  try {
    await db.promise().query(
      'UPDATE users SET name = ?, bio = ?, profile_picture = ? WHERE id = ?',
      [name, bio, profile_picture, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
