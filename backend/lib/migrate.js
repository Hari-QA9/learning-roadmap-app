// Adds the tables/columns newer features need. Safe to run on every start:
// each column is only added if it doesn't exist yet. Nothing is ever removed.
const fs = require('fs');
const path = require('path');
const db = require('../db');

/** Creates the base tables from backend/database/schema.sql (for a brand-new, empty database). */
async function baseSchema() {
  const file = path.join(__dirname, '..', 'database', 'schema.sql');
  if (!fs.existsSync(file)) return;
  const statements = fs.readFileSync(file, 'utf8')
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  // One connection, so turning foreign-key checks off applies to every statement.
  const conn = await db.promise().getConnection();
  try {
    for (const sql of statements) {
      try { await conn.query(sql); } catch (err) { console.warn(`[migrate] ${err.message}`); }
    }
  } finally {
    conn.release();
  }
}

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
  ['tasks', 'completed_at', 'TIMESTAMP NULL'],
  ['tasks', 'reminded_at', 'TIMESTAMP NULL'],
  ['notifications', 'link', 'VARCHAR(500) NULL'],
  ['notifications', 'type', 'VARCHAR(30) NULL'],
  ['job_applications', 'followup_sent_at', 'TIMESTAMP NULL'],
  // Interview time is stored as an ISO string with time zone (e.g. 2026-10-25T18:00:00.000Z)
  ['users', 'email_verified', 'TINYINT DEFAULT 1'],
  ['job_applications', 'interview_at', 'VARCHAR(40) NULL'],
  ['job_applications', 'interview_reminded_at', 'TIMESTAMP NULL'],
  ['job_applications', 'contact_name', 'VARCHAR(120) NULL'],
  ['job_applications', 'contact_email', 'VARCHAR(200) NULL'],
  ['job_applications', 'next_step', 'VARCHAR(255) NULL'],
  // Growth pack: shareable roadmaps and invite links
  ['roadmaps', 'share_slug', 'VARCHAR(24) NULL'],
  ['roadmaps', 'copies', 'INT DEFAULT 0'],
  ['roadmaps', 'copied_from', 'INT NULL'],
  ['user_settings', 'invite_code', 'VARCHAR(16) NULL'],
  // Community pack: opt in to the public weekly leaderboard
  ['user_settings', 'leaderboard_public', 'TINYINT DEFAULT 0'],
];

const TABLES = [
  // Community pack: study groups, chat, buddies, weekly challenges
  `CREATE TABLE IF NOT EXISTS study_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    goal VARCHAR(160) NULL,
    description TEXT NULL,
    owner_id INT NOT NULL,
    invite_code VARCHAR(16) NOT NULL,
    is_public TINYINT DEFAULT 0,
    weekly_goal INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (invite_code)
  )`,
  `CREATE TABLE IF NOT EXISTS group_members (
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(10) DEFAULT 'member',
    last_read_id INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS group_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY group_id (group_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS buddies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    addressee_id INT NOT NULL,
    status VARCHAR(10) DEFAULT 'pending',
    requester_nudged_at DATETIME NULL,
    addressee_nudged_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME NULL,
    UNIQUE (requester_id, addressee_id)
  )`,
  `CREATE TABLE IF NOT EXISTS challenge_claims (
    user_id INT NOT NULL,
    week DATE NOT NULL,
    challenge VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, week, challenge)
  )`,
  // Learning pack: flashcards with spaced repetition
  `CREATE TABLE IF NOT EXISTS flashcards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    roadmap_id INT NULL,
    task_id INT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    ease DOUBLE DEFAULT 2.5,
    interval_days DOUBLE DEFAULT 0,
    reps INT DEFAULT 0,
    lapses INT DEFAULT 0,
    due_at DATETIME NULL,
    last_reviewed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY user_due (user_id, due_at)
  )`,
  // One row per finished focus (Pomodoro) session
  `CREATE TABLE IF NOT EXISTS study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    roadmap_id INT NULL,
    task_id INT NULL,
    minutes INT NOT NULL,
    day DATE NOT NULL,
    label VARCHAR(160) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY user_day (user_id, day)
  )`,
  // Reviews per day (for "reviewed today" and the review streak)
  `CREATE TABLE IF NOT EXISTS review_days (
    user_id INT NOT NULL,
    day DATE NOT NULL,
    reviews INT DEFAULT 0,
    PRIMARY KEY (user_id, day)
  )`,
  // Public profile / portfolio page (off until the member turns it on)
  `CREATE TABLE IF NOT EXISTS public_profiles (
    user_id INT PRIMARY KEY,
    username VARCHAR(40) NOT NULL,
    is_public TINYINT DEFAULT 0,
    headline VARCHAR(160) NULL,
    links TEXT NULL,
    show_roadmaps TINYINT DEFAULT 1,
    show_certificates TINYINT DEFAULT 1,
    show_resume TINYINT DEFAULT 1,
    show_stats TINYINT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (username)
  )`,
  // Who invited whom (one row per new member who joined through an invite link)
  `CREATE TABLE IF NOT EXISTS referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inviter_id INT NOT NULL,
    invitee_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (invitee_id)
  )`,
  `CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // One row per AI request (for the admin dashboard and cost tracking)
  `CREATE TABLE IF NOT EXISTS ai_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    kind VARCHAR(40) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS interview_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_id INT NULL,
    role VARCHAR(255) NOT NULL,
    company VARCHAR(255) NULL,
    type VARCHAR(20) DEFAULT 'mixed',
    questions MEDIUMTEXT NULL,
    answers MEDIUMTEXT NULL,
    feedback MEDIUMTEXT NULL,
    report MEDIUMTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // Email preferences, daily goal, time zone, onboarding
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT PRIMARY KEY,
    email_weekly TINYINT DEFAULT 1,
    email_reminders TINYINT DEFAULT 1,
    email_job_alerts TINYINT DEFAULT 1,
    email_followups TINYINT DEFAULT 1,
    daily_goal INT DEFAULT 1,
    timezone VARCHAR(64) DEFAULT 'America/New_York',
    onboarded TINYINT DEFAULT 0,
    field VARCHAR(60) NULL,
    calendar_token VARCHAR(64) NULL,
    last_digest_at TIMESTAMP NULL,
    last_nudge_at TIMESTAMP NULL,
    last_job_alert_at TIMESTAMP NULL
  )`,
  // Tasks finished per day — powers the learning streak and daily goal
  `CREATE TABLE IF NOT EXISTS activity_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    day DATE NOT NULL,
    tasks_done INT DEFAULT 0,
    UNIQUE (user_id, day)
  )`,
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
  try { await baseSchema(); } catch (err) { console.warn(`[migrate] base schema skipped: ${err.message}`); }
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
