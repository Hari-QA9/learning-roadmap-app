const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET comments for a module
router.get('/:moduleId', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT c.*, u.name as user_name 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.module_id = ?
       ORDER BY c.created_at DESC`,
      [req.params.moduleId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD comment
router.post('/', auth, async (req, res) => {
  const { module_id, content } = req.body;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO comments (user_id, module_id, content) VALUES (?, ?, ?)',
      [req.user.id, module_id, content]
    );
    res.json({ id: result.insertId, message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE comment
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.promise().query(
      'DELETE FROM comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
