// Application tracker: Saved → Applied → Interviewing → Offer / Rejected
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const q = () => db.promise();
const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await q().query(
      `SELECT a.id, a.job_id, a.job_title, a.company, a.status, a.url, a.location, a.notes, a.applied_at, a.updated_at,
              a.interview_at, a.contact_name, a.contact_email, a.next_step, j.skills
       FROM job_applications a LEFT JOIN jobs j ON j.id = a.job_id
       WHERE a.user_id = ? ORDER BY COALESCE(a.updated_at, a.applied_at) DESC`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...r, status: STATUSES.includes(r.status) ? r.status : 'applied' })));
  } catch (err) {
    console.error('[applications] list', err.message);
    res.status(500).json({ message: 'Could not load your applications.' });
  }
});

// Save a board job, or add one manually.
router.post('/', auth, async (req, res) => {
  const b = req.body || {};
  const status = STATUSES.includes(b.status) ? b.status : 'saved';
  try {
    if (b.job_id) {
      const [jobs] = await q().query('SELECT * FROM jobs WHERE id = ? AND (user_id IS NULL OR user_id = ?)', [b.job_id, req.user.id]);
      if (!jobs.length) return res.status(404).json({ message: 'Job not found.' });
      const j = jobs[0];
      const [has] = await q().query('SELECT id FROM job_applications WHERE user_id = ? AND job_id = ?', [req.user.id, j.id]);
      if (has.length) {
        await q().query('UPDATE job_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, has[0].id]);
        return res.json({ id: has[0].id, status });
      }
      const [r] = await q().query(
        'INSERT INTO job_applications (user_id, job_id, job_title, company, status, url, location, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [req.user.id, j.id, j.title, j.company, status, j.url, j.location]
      );
      return res.json({ id: r.insertId, status });
    }
    const title = String(b.job_title || '').trim();
    if (!title) return res.status(400).json({ message: 'Add the job title.' });
    const [r] = await q().query(
      'INSERT INTO job_applications (user_id, job_title, company, status, url, location, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [req.user.id, title.slice(0, 255), String(b.company || '').slice(0, 255) || null, status, String(b.url || '').slice(0, 1000) || null, String(b.location || '').slice(0, 255) || null, b.notes || null]
    );
    res.json({ id: r.insertId, status });
  } catch (err) {
    console.error('[applications] add', err.message);
    res.status(500).json({ message: 'Could not save the application.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const b = req.body || {};
  const sets = [];
  const vals = [];
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ message: 'Unknown status.' });
    sets.push('status = ?'); vals.push(b.status);
    if (b.status === 'applied') { sets.push('applied_at = CURRENT_TIMESTAMP'); }
  }
  if (b.notes !== undefined) { sets.push('notes = ?'); vals.push(String(b.notes).slice(0, 5000)); }
  if (b.interview_at !== undefined) {
    const d = b.interview_at ? new Date(b.interview_at) : null;
    if (d && isNaN(d)) return res.status(400).json({ message: 'That interview date isn’t valid.' });
    sets.push('interview_at = ?', 'interview_reminded_at = NULL'); vals.push(d ? d.toISOString() : null);
    if (d && !b.status) { sets.push("status = CASE WHEN status IN ('saved', 'applied') THEN 'interviewing' ELSE status END"); }
  }
  if (b.contact_name !== undefined) { sets.push('contact_name = ?'); vals.push(String(b.contact_name).slice(0, 120) || null); }
  if (b.contact_email !== undefined) {
    const em = String(b.contact_email || '').trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return res.status(400).json({ message: 'That contact email doesn’t look right.' });
    sets.push('contact_email = ?'); vals.push(em.slice(0, 200) || null);
  }
  if (b.next_step !== undefined) { sets.push('next_step = ?'); vals.push(String(b.next_step).slice(0, 255) || null); }
  if (!sets.length) return res.status(400).json({ message: 'Nothing to update.' });
  sets.push('updated_at = CURRENT_TIMESTAMP');
  try {
    const [r] = await q().query(`UPDATE job_applications SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, [...vals, req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Application not found.' });
    res.json({ message: 'Updated.' });
  } catch (err) {
    console.error('[applications] update', err.message);
    res.status(500).json({ message: 'Could not update the application.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await q().query('DELETE FROM job_applications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not remove the application.' });
  }
});

module.exports = router;
