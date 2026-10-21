// Adds the tables/columns newer features need. Safe to run on every start:
// each column is only added if it doesn't exist yet. Nothing is ever removed.
const db = require('../db');

const COLUMNS = [
  ['roadmaps', 'details', 'MEDIUMTEXT NULL'],
  ['modules', 'details', 'MEDIUMTEXT NULL'],
  ['tasks', 'task_type', "VARCHAR(20) NULL"],
  ['tasks', 'est_minutes', 'INT NULL'],
  ['tasks', 'details', 'TEXT NULL'],
  ['job_applications', 'job_id', 'INT NULL'],
  ['job_applications', 'url', 'VARCHAR(1000) NULL'],
  ['job_applications', 'location', 'VARCHAR(255) NULL'],
  ['job_applications', 'notes', 'TEXT NULL'],
  ['job_applications', 'materials', 'MEDIUMTEXT NULL'],
  ['job_applications', 'updated_at', 'TIMESTAMP NULL'],
  ['jobs', 'publisher', 'VARCHAR(80) NULL'],
];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS user_resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resume_data MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
  )`,
  // Tailored copies of a member's resume (e.g. one per job they apply to)
  `CREATE TABLE IF NOT EXISTS resume_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    job_id INT NULL,
    data MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Exists in older databases; created here for fresh (e.g. production) databases.
  `CREATE TABLE IF NOT EXISTS job_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_title VARCHAR(255) DEFAULT NULL,
    company VARCHAR(255) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'applied',
    applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    KEY user_id (user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Jobs pulled from public job boards (user_id NULL) or pasted by a member (user_id set)
  `CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(40) NOT NULL,
    external_id VARCHAR(191) NOT NULL,
    user_id INT NULL,
    title VARCHAR(300) NOT NULL,
    company VARCHAR(200) NULL,
    location VARCHAR(255) NULL,
    remote TINYINT DEFAULT 0,
    url VARCHAR(1000) NULL,
    description MEDIUMTEXT NULL,
    salary VARCHAR(120) NULL,
    job_type VARCHAR(60) NULL,
    skills TEXT NULL,
    posted_at DATETIME NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source, external_id)
  )`,
  `CREATE TABLE IF NOT EXISTS career_profiles (
    user_id INT PRIMARY KEY,
    target_roles TEXT NULL,
    skills TEXT NULL,
    level VARCHAR(30) NULL,
    locations TEXT NULL,
    remote_only TINYINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // AI results per member + job (fit analysis, application kit, gap roadmap link)
  `CREATE TABLE IF NOT EXISTS job_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_id INT NOT NULL,
    analysis MEDIUMTEXT NULL,
    kit MEDIUMTEXT NULL,
    roadmap_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, job_id)
  )`,
];

// Safe, repeatable changes to existing columns (MySQL). Errors are ignored.
const CHANGES = [
  // Structured resumes can be larger than TEXT's 64 KB.
  'ALTER TABLE user_resumes MODIFY resume_data MEDIUMTEXT NOT NULL',
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
  for (const sql of CHANGES) {
    try { await q.query(sql); } catch { /* not supported or already done */ }
  }
}

module.exports = migrate;
