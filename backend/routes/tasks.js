const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET tasks by module
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

// POST create task
router.post('/', auth, async (req, res) => {
  const { module_id, roadmap_id, title, description, due_date, priority } = req.body;
  const userId = req.user.id;

  try {
    const [result] = await db.promise().query(
      'INSERT INTO tasks (user_id, roadmap_id, module_id, title, description, status, due_date, priority) VALUES (?, ?, ?, ?, ?, "pending", ?, ?)',
      [
        userId,
        roadmap_id || null,
        module_id,
        title,
        description || '',
        due_date || null,
        priority || 'medium',
      ]
    );
    res.json({ id: result.insertId, message: 'Task created', taskId: result.insertId });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update task
router.put('/:id', auth, async (req, res) => {
  const { title, description, status, due_date, priority } = req.body;

  try {
    await db.promise().query(
      'UPDATE tasks SET title=?, description=?, status=?, due_date=?, priority=? WHERE id=?',
      [
        title,
        description || '',
        status,
        due_date || null,
        priority || 'medium',
        req.params.id,
      ]
    );

    if (status === 'done') {
      try {
        await db.promise().query(
          'UPDATE user_stats SET xp_points = xp_points + 20 WHERE user_id = ?',
          [req.user.id]
        );
      } catch (e) { console.log('user_stats update skipped:', e.message); }

      try {
        await db.promise().query(
          'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
          [req.user.id, 'Completed Task', 'Completed task: ' + title]
        );
      } catch (e) { console.log('activity_logs insert skipped:', e.message); }
    }

    res.json({ message: 'Task updated' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE task
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
