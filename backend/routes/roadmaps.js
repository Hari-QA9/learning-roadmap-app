const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all roadmaps for user
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT r.*,
         (SELECT COUNT(*) FROM modules m WHERE m.roadmap_id = r.id) AS module_count,
         (SELECT COUNT(*) FROM tasks t JOIN modules m ON t.module_id = m.id WHERE m.roadmap_id = r.id) AS total_tasks,
         (SELECT COUNT(*) FROM tasks t JOIN modules m ON t.module_id = m.id WHERE m.roadmap_id = r.id AND t.status = 'done') AS completed_tasks
       FROM roadmaps r WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single roadmap
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM roadmaps WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE roadmap
router.post('/', auth, async (req, res) => {
  const { title, description, goal, duration, status } = req.body;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO roadmaps (user_id, title, description, goal, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, goal, duration, status || 'active']
    );
    // Log activity
    await db.promise().query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'Created Roadmap', `Created roadmap: ${title}`]
    );
    // Award XP
    await db.promise().query(
      'UPDATE user_stats SET xp_points = xp_points + 10 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ id: result.insertId, message: 'Roadmap created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE roadmap
router.put('/:id', auth, async (req, res) => {
  const { title, description, goal, duration, status } = req.body;
  try {
    await db.promise().query(
      'UPDATE roadmaps SET title=?, description=?, goal=?, duration=?, status=? WHERE id=? AND user_id=?',
      [title, description, goal, duration, status, req.params.id, req.user.id]
    );
    res.json({ message: 'Roadmap updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE roadmap
router.delete('/:id', auth, async (req, res) => {
  try {
    const [owned] = await db.promise().query(
      'SELECT id FROM roadmaps WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (owned.length === 0) return res.status(404).json({ message: 'Not found' });
    // Remove children first so nothing is left orphaned.
    await db.promise().query(
      'DELETE FROM tasks WHERE module_id IN (SELECT id FROM modules WHERE roadmap_id = ?)',
      [req.params.id]
    );
    await db.promise().query('DELETE FROM modules WHERE roadmap_id=?', [req.params.id]);
    await db.promise().query('DELETE FROM resources WHERE roadmap_id=?', [req.params.id]);
    await db.promise().query(
      'DELETE FROM roadmaps WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Roadmap deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
