// Insert a task. Some databases have a tasks.roadmap_id column and some don't,
// so try with it first and fall back without it.
const db = require('../db');

let hasRoadmapId = null; // learned on first insert

async function insertTask({ userId, roadmapId, moduleId, title, description = '', status = 'pending', dueDate = null, priority = 'medium', position = 0 }) {
  const q = db.promise();
  if (hasRoadmapId !== false && roadmapId) {
    try {
      const [r] = await q.query(
        'INSERT INTO tasks (user_id, roadmap_id, module_id, title, description, status, due_date, priority, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, roadmapId, moduleId, title, description, status, dueDate, priority, position]
      );
      hasRoadmapId = true;
      return r;
    } catch (err) {
      if (!/roadmap_id/i.test(err.message)) throw err;
      hasRoadmapId = false;
    }
  }
  const [r] = await q.query(
    'INSERT INTO tasks (user_id, module_id, title, description, status, due_date, priority, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, moduleId, title, description, status, dueDate, priority, position]
  );
  return r;
}

module.exports = { insertTask };
