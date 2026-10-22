const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { insertTask } = require('../lib/tasks');
const { recordTaskDone } = require('../lib/engagement');

const q = () => db.promise();

/** The module (with its roadmap id) only if it belongs to this member. */
async function ownModule(moduleId, userId) {
  const [rows] = await q().query(
    'SELECT m.id, m.roadmap_id FROM modules m JOIN roadmaps r ON r.id = m.roadmap_id WHERE m.id = ? AND r.user_id = ?',
    [moduleId, userId]
  );
  return rows[0] || null;
}

/** The task only if it belongs to this member. */
async function ownTask(taskId, userId) {
  const [rows] = await q().query(
    `SELECT t.* FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
     WHERE t.id = ? AND r.user_id = ?`,
    [taskId, userId]
  );
  return rows[0] || null;
}

// GET tasks by module
router.get('/:moduleId', auth, async (req, res) => {
  try {
    if (!(await ownModule(req.params.moduleId, req.user.id))) return res.status(404).json({ message: 'Module not found' });
    const [rows] = await q().query('SELECT * FROM tasks WHERE module_id = ? ORDER BY created_at', [req.params.moduleId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create task
router.post('/', auth, async (req, res) => {
  const { module_id: moduleId, title, description, due_date: dueDate, priority } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ message: 'Add a task title' });
  try {
    const mod = await ownModule(moduleId, req.user.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    const result = await insertTask({
      userId: req.user.id, roadmapId: mod.roadmap_id, moduleId, title: String(title).trim(),
      description: description || '', dueDate: dueDate || null, priority: priority || 'medium',
    });
    res.json({ id: result.insertId, message: 'Task created', taskId: result.insertId });
  } catch (err) {
    console.error('[tasks] create', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update task
router.put('/:id', auth, async (req, res) => {
  const { title, description, status, due_date: dueDate, priority } = req.body || {};
  try {
    const before = await ownTask(req.params.id, req.user.id);
    if (!before) return res.status(404).json({ message: 'Task not found' });
    const nextDue = dueDate || null;
    const prevDue = before.due_date ? String(before.due_date instanceof Date ? before.due_date.toISOString() : before.due_date).slice(0, 10) : null;
    const becameDone = status === 'done' && before.status !== 'done';

    await q().query('UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, priority = ? WHERE id = ?', [
      title ?? before.title, description ?? before.description ?? '', status ?? before.status, nextDue, priority || before.priority || 'medium', req.params.id,
    ]);
    // A new due date gets a fresh reminder.
    if (nextDue !== prevDue) await q().query('UPDATE tasks SET reminded_at = NULL WHERE id = ?', [req.params.id]).catch(() => {});
    if (status && status !== 'done' && before.status === 'done') await q().query('UPDATE tasks SET completed_at = NULL WHERE id = ?', [req.params.id]).catch(() => {});

    if (becameDone) {
      await q().query('UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]).catch(() => {});
      await q().query('UPDATE user_stats SET xp_points = xp_points + 20 WHERE user_id = ?', [req.user.id]).catch(() => {});
      await q().query('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [req.user.id, 'Completed Task', `Completed task: ${title || before.title}`]).catch(() => {});
      await recordTaskDone(req.user.id).catch((e) => console.warn('[tasks] activity', e.message));
    }
    res.json({ message: 'Task updated' });
  } catch (err) {
    console.error('[tasks] update', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE task
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!(await ownTask(req.params.id, req.user.id))) return res.status(404).json({ message: 'Task not found' });
    await q().query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
