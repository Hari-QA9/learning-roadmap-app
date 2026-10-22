const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { relevantResources } = require('../lib/resourceLibrary');

const q = () => db.promise();
const TYPES = ['video', 'docs', 'article', 'course', 'practice', 'book', 'tool'];

/** The roadmap, only if it belongs to this member. */
async function ownRoadmap(roadmapId, userId) {
  const [rows] = await q().query('SELECT id, title, description, goal, details FROM roadmaps WHERE id = ? AND user_id = ?', [roadmapId, userId]);
  return rows[0] || null;
}

// GET /resources/suggest/:roadmapId — free, verified resources from the library that fit this roadmap
router.get('/suggest/:roadmapId', auth, async (req, res) => {
  try {
    const rm = await ownRoadmap(req.params.roadmapId, req.user.id);
    if (!rm) return res.status(404).json({ message: 'Roadmap not found.' });
    const [mods] = await q().query('SELECT title FROM modules WHERE roadmap_id = ?', [rm.id]);
    const [saved] = await q().query('SELECT url FROM resources WHERE roadmap_id = ?', [rm.id]);
    const have = new Set(saved.map((r) => r.url));
    const text = [rm.title, rm.description, rm.goal, ...mods.map((m) => m.title)].filter(Boolean).join('. ');
    const picks = relevantResources(text, 14).filter((r) => !have.has(r.url)).slice(0, 8);
    res.json(picks.map(({ id, title, url, type, source }) => ({ id, title, url, type, source })));
  } catch (err) {
    console.error('[resources] suggest', err.message);
    res.status(500).json({ message: 'Could not load suggestions.' });
  }
});

// GET resources for a roadmap
router.get('/:roadmapId', auth, async (req, res) => {
  try {
    if (!(await ownRoadmap(req.params.roadmapId, req.user.id))) return res.status(404).json({ message: 'Roadmap not found.' });
    const [rows] = await q().query('SELECT * FROM resources WHERE roadmap_id = ?', [req.params.roadmapId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Could not load resources.' });
  }
});

// CREATE resource
router.post('/', auth, async (req, res) => {
  const { roadmap_id: roadmapId, title, url, type, is_free: isFree } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ message: 'Add a title.' });
  if (url && !/^https?:\/\//i.test(String(url))) return res.status(400).json({ message: 'Links must start with http:// or https://' });
  try {
    if (!(await ownRoadmap(roadmapId, req.user.id))) return res.status(404).json({ message: 'Roadmap not found.' });
    const [result] = await q().query(
      'INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)',
      [roadmapId, String(title).trim().slice(0, 255), url ? String(url).slice(0, 1000) : null, TYPES.includes(type) ? type : 'article', isFree !== false ? 1 : 0]
    );
    res.json({ id: result.insertId, message: 'Resource added' });
  } catch (err) {
    res.status(500).json({ message: 'Could not add the resource.' });
  }
});

// DELETE resource
router.delete('/:id', auth, async (req, res) => {
  try {
    const [r] = await q().query(
      'DELETE FROM resources WHERE id = ? AND roadmap_id IN (SELECT id FROM roadmaps WHERE user_id = ?)',
      [req.params.id, req.user.id]
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Resource not found.' });
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete the resource.' });
  }
});

module.exports = router;
