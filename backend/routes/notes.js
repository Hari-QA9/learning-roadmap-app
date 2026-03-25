const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET notes for a task
router.get('/:taskId', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM notes WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC',
      [req.params.taskId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE note
router.post('/', auth, async (req, res) => {
  const { task_id, content } = req.body;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO notes (task_id, user_id, content) VALUES (?, ?, ?)',
      [task_id, req.user.id, content]
    );
    res.json({ id: result.insertId, message: 'Note added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE note
router.put('/:id', auth, async (req, res) => {
  const { content } = req.body;
  try {
    await db.promise().query(
      'UPDATE notes SET content = ? WHERE id = ? AND user_id = ?',
      [content, req.params.id, req.user.id]
    );
    res.json({ message: 'Note updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE note
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.promise().query(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
