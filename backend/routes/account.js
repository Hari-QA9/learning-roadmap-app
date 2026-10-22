// "Download my data" and "Delete my account" (Profile → Your data).
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const q = () => db.promise();

// Everything a member owns that's keyed by user_id. Secrets (password hashes, reset/verification
// tokens) are deleted with the account but never included in the export.
const USER_TABLES = [
  'user_settings', 'career_profiles', 'user_stats', 'user_badges', 'activity_days', 'activity_logs',
  'notifications', 'user_resumes', 'resume_versions', 'job_applications', 'job_insights', 'interview_sessions',
  'notes', 'comments', 'bookmarks', 'resource_ratings', 'quiz_attempts', 'quiz_results',
  'module_evaluations', 'roadmap_evaluations', 'certificates', 'feedback', 'ai_usage',
];
const SECRET_TABLES = ['password_resets', 'email_verifications'];
const HIDE = new Set(['password', 'calendar_token', 'token_hash']);

const clean = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !HIDE.has(k))));

async function rowsOf(sql, params) {
  try { const [rows] = await q().query(sql, params); return clean(rows); } catch { return []; }
}

// GET a JSON file with all of the member's data
router.get('/export', auth, async (req, res) => {
  try {
    const id = req.user.id;
    const [[user]] = await q().query('SELECT id, name, email, bio, profile_picture, created_at FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    const data = {
      exported_at: new Date().toISOString(),
      account: user,
      roadmaps: await rowsOf('SELECT * FROM roadmaps WHERE user_id = ?', [id]),
      modules: await rowsOf('SELECT m.* FROM modules m JOIN roadmaps r ON r.id = m.roadmap_id WHERE r.user_id = ?', [id]),
      tasks: await rowsOf('SELECT t.* FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id WHERE r.user_id = ?', [id]),
      resources: await rowsOf('SELECT s.* FROM resources s JOIN roadmaps r ON r.id = s.roadmap_id WHERE r.user_id = ?', [id]),
      jobs_added: await rowsOf('SELECT * FROM jobs WHERE user_id = ?', [id]),
    };
    for (const t of USER_TABLES) data[t] = await rowsOf(`SELECT * FROM ${t} WHERE user_id = ?`, [id]);
    res.setHeader('Content-Disposition', 'attachment; filename="learnmap-data.json"');
    res.json(data);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ message: 'Could not prepare your data. Please try again.' });
  }
});

// DELETE the account and everything in it. The member confirms by typing their email.
router.delete('/', auth, async (req, res) => {
  const id = req.user.id;
  let conn;
  try {
    const [[user]] = await q().query('SELECT email FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (String(req.body?.confirm || '').trim().toLowerCase() !== String(user.email).toLowerCase()) {
      return res.status(400).json({ message: 'Type your email address exactly to confirm.' });
    }
    conn = await q().getConnection();
    const run = async (sql, params) => { try { await conn.query(sql, params); } catch (e) { if (!/doesn't exist|no such table/i.test(e.message)) throw e; } };
    const myRoadmaps = 'SELECT id FROM roadmaps WHERE user_id = ?';
    const myModules = `SELECT id FROM modules WHERE roadmap_id IN (${myRoadmaps})`;
    const myTasks = `SELECT id FROM tasks WHERE module_id IN (${myModules})`;

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const t of [...USER_TABLES, ...SECRET_TABLES]) await run(`DELETE FROM ${t} WHERE user_id = ?`, [id]);
      await run('DELETE FROM followers WHERE follower_id = ? OR following_id = ?', [id, id]);
      await run('DELETE FROM shared_roadmaps WHERE shared_by = ? OR shared_with = ?', [id, id]);
      await run('DELETE FROM jobs WHERE user_id = ?', [id]);
      // Roadmaps and everything inside them
      await run(`DELETE FROM resources WHERE roadmap_id IN (${myRoadmaps}) OR task_id IN (SELECT id FROM (${myTasks}) x)`, [id, id]);
      await run(`DELETE FROM notes WHERE task_id IN (SELECT id FROM (${myTasks}) x)`, [id]);
      await run(`DELETE FROM comments WHERE module_id IN (SELECT id FROM (${myModules}) x)`, [id]);
      await run(`DELETE FROM tasks WHERE module_id IN (SELECT id FROM (${myModules}) x)`, [id]);
      await run('DELETE FROM tasks WHERE user_id = ?', [id]);
      await run(`DELETE FROM quizzes WHERE roadmap_id IN (${myRoadmaps})`, [id]);
      await run(`DELETE FROM roadmap_tags WHERE roadmap_id IN (${myRoadmaps})`, [id]);
      await run(`DELETE FROM modules WHERE roadmap_id IN (SELECT id FROM (${myRoadmaps}) x)`, [id]);
      await run('DELETE FROM roadmaps WHERE user_id = ?', [id]);
      await conn.query('DELETE FROM users WHERE id = ?', [id]);
    } finally {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    }
    res.json({ message: 'Your account and all of its data have been deleted.' });
  } catch (err) {
    console.error('Account delete error:', err.message);
    res.status(500).json({ message: 'Could not delete the account. Please try again.' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
