const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// SUBMIT feedback
router.post('/', auth, async (req, res) => {
  const { subject, message } = req.body;
  try {
    await db.promise().query(
      'INSERT INTO feedback (user_id, subject, message) VALUES (?, ?, ?)',
      [req.user.id, subject, message]
    );
    // Give XP for feedback
    await db.promise().query(
      'UPDATE user_stats SET xp_points = xp_points + 5 WHERE user_id = ?',
      [req.user.id]
    );
    // Send notification
    await db.promise().query(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [req.user.id, 'Feedback Received!', 'Thank you for your feedback!']
    );
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user feedback history
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
