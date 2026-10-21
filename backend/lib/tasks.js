// Insert a task. Optional columns (roadmap_id, task_type, est_minutes, details)
// may not exist in every database, so any that are missing are dropped and the
// insert is retried. What's learned is remembered for later inserts.
const db = require('../db');

const missing = new Set();

async function insertTask({
  userId, roadmapId, moduleId, title, description = '', status = 'pending', dueDate = null,
  priority = 'medium', position = 0, taskType = null, estMinutes = null, details = null,
}) {
  const optional = {
    roadmap_id: roadmapId || null,
    task_type: taskType,
    est_minutes: estMinutes,
    details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const cols = ['user_id', 'module_id', 'title', 'description', 'status', 'due_date', 'priority', 'position'];
    const vals = [userId, moduleId, title, description, status, dueDate, priority, position];
    for (const [c, v] of Object.entries(optional)) {
      if (v !== null && v !== undefined && !missing.has(c)) { cols.push(c); vals.push(v); }
    }
    try {
      const [r] = await db.promise().query(
        `INSERT INTO tasks (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        vals
      );
      return r;
    } catch (err) {
      const col = Object.keys(optional).find((c) => new RegExp(`\\b${c}\\b`, 'i').test(err.message));
      if (!col || missing.has(col)) throw err;
      missing.add(col);
    }
  }
  throw new Error('Could not insert task');
}

module.exports = { insertTask };
