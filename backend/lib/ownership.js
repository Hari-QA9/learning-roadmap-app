// "Does this item belong to the logged-in member?" helpers.
// Every route that takes a roadmap/module/task id from the request should check one of these,
// so a member can never read or change someone else's data by guessing an id.
const db = require('../db');

const q = () => db.promise();

/** The roadmap row only if it belongs to this member. */
async function ownRoadmap(roadmapId, userId) {
  const [rows] = await q().query('SELECT * FROM roadmaps WHERE id = ? AND user_id = ?', [roadmapId, userId]);
  return rows[0] || null;
}

/** The module (with its roadmap id) only if it belongs to this member. */
async function ownModule(moduleId, userId) {
  const [rows] = await q().query(
    'SELECT m.* FROM modules m JOIN roadmaps r ON r.id = m.roadmap_id WHERE m.id = ? AND r.user_id = ?',
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

module.exports = { ownRoadmap, ownModule, ownTask };
