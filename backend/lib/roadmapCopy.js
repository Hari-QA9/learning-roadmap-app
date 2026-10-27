// Copies a roadmap (modules, tasks, resources — not progress or notes) into a member's account.
// Used by "Use this roadmap" on shared roadmaps and by classroom assignments.
const db = require('../db');
const { insertTask } = require('./tasks');

const q = () => db.promise();

async function copyRoadmap(src, userId, { titlePrefix = '' } = {}) {
  const [mods] = await q().query('SELECT * FROM modules WHERE roadmap_id = ? ORDER BY order_index, id LIMIT 40', [src.id]);
  const [ins] = await q().query(
    'INSERT INTO roadmaps (user_id, title, description, goal, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, `${titlePrefix}${src.title || ''}`.slice(0, 500), src.description, src.goal, src.duration, 'active']
  );
  const newId = ins.insertId;
  // Optional columns may be missing in very old databases — never fail the copy over them.
  await q().query('UPDATE roadmaps SET details = ?, copied_from = ? WHERE id = ?', [src.details || null, src.id, newId]).catch(() => {});
  let taskCount = 0;
  for (const m of mods) {
    const [mi] = await q().query(
      'INSERT INTO modules (roadmap_id, title, description, position, order_index) VALUES (?, ?, ?, ?, ?)',
      [newId, m.title, m.description, m.position || 0, m.order_index || 0]
    );
    if (m.details) await q().query('UPDATE modules SET details = ? WHERE id = ?', [m.details, mi.insertId]).catch(() => {});
    const [tasks] = await q().query('SELECT * FROM tasks WHERE module_id = ? ORDER BY position, id LIMIT 60', [m.id]);
    for (const t of tasks) {
      if (taskCount++ >= 500) break;
      await insertTask({
        userId, roadmapId: newId, moduleId: mi.insertId, title: t.title, description: t.description || '',
        priority: t.priority || 'medium', position: t.position || 0, taskType: t.task_type || null, estMinutes: t.est_minutes || null, details: t.details || null,
      });
    }
  }
  const [resources] = await q().query('SELECT title, url, type, is_free FROM resources WHERE roadmap_id = ? LIMIT 100', [src.id]);
  for (const r of resources) {
    await q().query('INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)', [newId, r.title, r.url, r.type, r.is_free]).catch(() => {});
  }
  return newId;
}

module.exports = { copyRoadmap };
