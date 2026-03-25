const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET resources for a roadmap
router.get('/:roadmapId', auth, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM resources WHERE roadmap_id = ?',
      [req.params.roadmapId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE resource
router.post('/', auth, async (req, res) => {
  const { roadmap_id, title, url, type, is_free } = req.body;
  try {
    const [result] = await db.promise().query(
      'INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)',
      [roadmap_id, title, url, type, is_free !== false]
    );
    res.json({ id: result.insertId, message: 'Resource added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE resource
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.promise().query(
      'DELETE FROM resources WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
