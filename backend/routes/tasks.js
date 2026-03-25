const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/:moduleId', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM tasks WHERE module_id = ? ORDER BY created_at',
      [req.params.moduleId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  const { module_id, title, description, due_date } = req.body;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO tasks (module_id, title, description, due_date) VALUES (?, ?, ?, ?)',
      [module_id, title, description, due_date || null]
    );
    res.json({ id: result.insertId, message: 'Task created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { title, description, status, due_date } = req.body;
  try {
    await db.promise().query(
      'UPDATE tasks SET title=?, description=?, status=?, due_date=? WHERE id=?',
      [title, description, status, due_date, req.params.id]
    );
    if (status === 'done') {
      await db.promise().query(
        'UPDATE user_stats SET xp_points = xp_points + 20 WHERE user_id = ?',
        [req.user.id]
      );
      await db.promise().query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'Completed Task', `Completed task: ${title}`]
      );
    }
    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.promise().query(
      'DELETE FROM tasks WHERE id=?',
      [req.params.id]
    );
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
