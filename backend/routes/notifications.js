const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all notifications
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /notifications/summary — unread count + newest, for the live bell (polled every 30s)
router.get('/summary', auth, async (req, res) => {
  try {
    const [[{ unread }]] = await db.promise().query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    const [latest] = await db.promise().query('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
    res.json({ unread: Number(unread) || 0, latest: latest[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// MARK as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.promise().query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// MARK ALL as read
router.put('/read/all', auth, async (req, res) => {
  try {
    await db.promise().query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.promise().query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
