const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/:roadmapId', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM modules WHERE roadmap_id = ? ORDER BY order_index',
      [req.params.roadmapId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  const { roadmap_id, title, description, order_index } = req.body;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO modules (roadmap_id, title, description, order_index) VALUES (?, ?, ?, ?)',
      [roadmap_id, title, description, order_index || 0]
    );
    await db.promise().query(
      'UPDATE user_stats SET xp_points = xp_points + 5 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ id: result.insertId, message: 'Module created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { title, description } = req.body;
  try {
    await db.promise().query(
      'UPDATE modules SET title=?, description=? WHERE id=?',
      [title, description, req.params.id]
    );
    res.json({ message: 'Module updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.promise().query('DELETE FROM modules WHERE id=?', [req.params.id]);
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
