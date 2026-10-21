// Adds the tables/columns newer features need. Safe to run on every start:
// each column is only added if it doesn't exist yet. Nothing is ever removed.
const db = require('../db');

const COLUMNS = [
  ['roadmaps', 'details', 'MEDIUMTEXT NULL'],
  ['modules', 'details', 'MEDIUMTEXT NULL'],
  ['tasks', 'task_type', "VARCHAR(20) NULL"],
  ['tasks', 'est_minutes', 'INT NULL'],
  ['tasks', 'details', 'TEXT NULL'],
];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function migrate() {
  const q = db.promise();
  for (const sql of TABLES) {
    try { await q.query(sql); } catch (err) { console.warn(`[migrate] ${err.message}`); }
  }
  for (const [table, column, def] of COLUMNS) {
    try {
      await q.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
      console.log(`[migrate] added ${table}.${column}`);
    } catch (err) {
      // Already there — that's the normal case after the first run.
      if (!/duplicate column/i.test(err.message)) console.warn(`[migrate] ${table}.${column}: ${err.message}`);
    }
  }
}

module.exports = migrate;
