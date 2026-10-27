// Classrooms & mentoring: teachers/mentors assign roadmaps, students get their own copy,
// teachers see progress. Students join with a code or link.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { notify, learningSummary } = require('../lib/engagement');
const { randomCode } = require('../lib/growth');
const { copyRoadmap } = require('../lib/roadmapCopy');
const { ownRoadmap } = require('../lib/ownership');
const { weekOf, weekStats } = require('../lib/weekly');

const q = () => db.promise();
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const firstName = (n) => String(n || 'Your teacher').split(' ')[0];
const MAX_STUDENTS = 200;
const MAX_CLASSES = 30;

async function member(classId, userId) {
  const [[m]] = await q().query('SELECT role FROM classroom_members WHERE classroom_id = ? AND user_id = ?', [classId, userId]);
  return m ? m.role : null;
}
async function classById(id) {
  const [[c]] = await q().query('SELECT * FROM classrooms WHERE id = ?', [id]);
  return c || null;
}

/** Progress of a member's own roadmaps: Map(roadmapId → { total, done, pct }) */
async function progress(roadmapIds) {
  const ids = roadmapIds.filter(Boolean);
  if (!ids.length) return new Map();
  const [rows] = await q().query(
    `SELECT m.roadmap_id, COUNT(t.id) AS total, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done
     FROM modules m LEFT JOIN tasks t ON t.module_id = m.id WHERE m.roadmap_id IN (?) GROUP BY m.roadmap_id`, [ids]);
  return new Map(rows.map((r) => {
    const total = Number(r.total) || 0; const done = Number(r.done) || 0;
    return [r.roadmap_id, { total, done, pct: total ? Math.round((done / total) * 100) : 0 }];
  }));
}

/** Give a student their own copy of an assignment (skips if they already have one). */
async function giveCopy(assignment, userId) {
  const [[has]] = await q().query('SELECT roadmap_id FROM assignment_copies WHERE assignment_id = ? AND user_id = ?', [assignment.id, userId]);
  if (has) return has.roadmap_id;
  const [[src]] = await q().query('SELECT * FROM roadmaps WHERE id = ?', [assignment.source_roadmap_id || 0]);
  if (!src) return null; // the teacher deleted the original roadmap
  const roadmapId = await copyRoadmap(src, userId);
  if (assignment.due_date) {
    // Put the due date on the last task so it shows in reminders and the calendar.
    const [[last]] = await q().query('SELECT t.id FROM tasks t JOIN modules m ON m.id = t.module_id WHERE m.roadmap_id = ? ORDER BY m.order_index DESC, t.position DESC, t.id DESC LIMIT 1', [roadmapId]);
    if (last) await q().query('UPDATE tasks SET due_date = ? WHERE id = ?', [String(assignment.due_date instanceof Date ? assignment.due_date.toISOString() : assignment.due_date).slice(0, 10), last.id]).catch(() => {});
  }
  await q().query('INSERT INTO assignment_copies (assignment_id, user_id, roadmap_id) VALUES (?, ?, ?)', [assignment.id, userId, roadmapId]);
  return roadmapId;
}

/* ---------- Classes ---------- */

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await q().query(
      `SELECT c.id, c.name, c.description, cm.role, u.name AS teacher,
              (SELECT COUNT(*) FROM classroom_members x WHERE x.classroom_id = c.id AND x.role = 'student') AS students,
              (SELECT COUNT(*) FROM classroom_assignments a WHERE a.classroom_id = c.id) AS assignments
       FROM classrooms c JOIN classroom_members cm ON cm.classroom_id = c.id AND cm.user_id = ? JOIN users u ON u.id = c.owner_id
       ORDER BY c.created_at DESC`, [req.user.id]);
    res.json(rows.map((r) => ({ ...r, students: Number(r.students), assignments: Number(r.assignments) })));
  } catch (err) {
    console.error('[classes] list', err.message);
    res.status(500).json({ message: 'Could not load your classes.' });
  }
});

router.post('/', auth, async (req, res) => {
  const name = clean(req.body.name, 100);
  if (name.length < 3) return res.status(400).json({ message: 'Give the class a name (at least 3 characters).' });
  try {
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM classroom_members WHERE user_id = ?', [req.user.id]);
    if (Number(n) >= MAX_CLASSES) return res.status(400).json({ message: `You can be in up to ${MAX_CLASSES} classes.` });
    const [ins] = await q().query('INSERT INTO classrooms (name, description, owner_id, join_code) VALUES (?, ?, ?, ?)',
      [name, String(req.body.description || '').trim().slice(0, 1000) || null, req.user.id, randomCode(8)]);
    await q().query('INSERT INTO classroom_members (classroom_id, user_id, role) VALUES (?, ?, ?)', [ins.insertId, req.user.id, 'teacher']);
    res.json({ id: ins.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Could not create the class.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const c = await classById(req.params.id);
    const role = c && await member(c.id, req.user.id);
    if (!role) return res.status(404).json({ message: 'Class not found.' });
    const [[teacher]] = await q().query('SELECT name FROM users WHERE id = ?', [c.owner_id]);
    const [assignments] = await q().query('SELECT id, title, instructions, due_date, source_roadmap_id, created_at FROM classroom_assignments WHERE classroom_id = ? ORDER BY created_at DESC', [c.id]);
    const [posts] = await q().query('SELECT p.id, p.body, p.created_at, u.name FROM classroom_posts p JOIN users u ON u.id = p.user_id WHERE p.classroom_id = ? ORDER BY p.id DESC LIMIT 30', [c.id]);
    const base = { id: c.id, name: c.name, description: c.description, role, teacher: teacher?.name || '', posts, created_at: c.created_at };

    if (role === 'student') {
      const [copies] = await q().query('SELECT assignment_id, roadmap_id FROM assignment_copies WHERE user_id = ? AND assignment_id IN (SELECT id FROM classroom_assignments WHERE classroom_id = ?)', [req.user.id, c.id]);
      const copyOf = new Map(copies.map((x) => [x.assignment_id, x.roadmap_id]));
      const prog = await progress([...copyOf.values()]);
      return res.json({ ...base, assignments: assignments.map((a) => ({ id: a.id, title: a.title, instructions: a.instructions, due_date: a.due_date, roadmap_id: copyOf.get(a.id) || null, progress: prog.get(copyOf.get(a.id))?.pct ?? 0 })) });
    }

    // Teacher view: the roster with progress on each assignment
    const [students] = await q().query(
      `SELECT u.id, u.name, u.email, cm.joined_at FROM classroom_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.classroom_id = ? AND cm.role = 'student' ORDER BY u.name`, [c.id]);
    const [copies] = assignments.length ? await q().query('SELECT assignment_id, user_id, roadmap_id FROM assignment_copies WHERE assignment_id IN (?)', [assignments.map((a) => a.id)]) : [[]];
    const prog = await progress(copies.map((x) => x.roadmap_id));
    const week = await weekOf(req.user.id);
    const stats = await weekStats(students.map((s) => s.id), week.start);
    const lastActive = new Map();
    for (const s of students) { const l = await learningSummary(s.id).catch(() => null); lastActive.set(s.id, l?.lastActive || null); }
    res.json({
      ...base,
      join_code: c.join_code,
      assignments: assignments.map((a) => {
        const done = copies.filter((x) => x.assignment_id === a.id).map((x) => prog.get(x.roadmap_id)?.pct ?? 0);
        return { ...a, average: done.length ? Math.round(done.reduce((n, p) => n + p, 0) / done.length) : 0, completed: done.filter((p) => p === 100).length };
      }),
      students: students.map((s) => ({
        id: s.id, name: s.name, email: s.email, joined_at: s.joined_at, last_active: lastActive.get(s.id),
        week_tasks: stats.get(s.id)?.tasks || 0, week_focus: stats.get(s.id)?.focus || 0,
        progress: Object.fromEntries(assignments.map((a) => { const cp = copies.find((x) => x.assignment_id === a.id && x.user_id === s.id); return [a.id, cp ? (prog.get(cp.roadmap_id)?.pct ?? 0) : null]; })),
      })),
    });
  } catch (err) {
    console.error('[classes] class', err.message);
    res.status(500).json({ message: 'Could not load this class.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const c = await classById(req.params.id);
  if (!c || (await member(c.id, req.user.id)) !== 'teacher') return res.status(403).json({ message: 'Only the teacher can change this.' });
  await q().query('UPDATE classrooms SET name = ?, description = ? WHERE id = ?', [clean(req.body.name, 100) || c.name, String(req.body.description ?? c.description ?? '').trim().slice(0, 1000) || null, c.id]);
  if (req.body.new_code) await q().query('UPDATE classrooms SET join_code = ? WHERE id = ?', [randomCode(8), c.id]);
  res.json({ message: req.body.new_code ? 'New join code made — the old one stops working.' : 'Class updated' });
});

router.delete('/:id', auth, async (req, res) => {
  const c = await classById(req.params.id);
  if (!c || c.owner_id !== req.user.id) return res.status(403).json({ message: 'Only the class owner can delete it.' });
  await q().query('DELETE FROM assignment_copies WHERE assignment_id IN (SELECT id FROM classroom_assignments WHERE classroom_id = ?)', [c.id]);
  await q().query('DELETE FROM classroom_assignments WHERE classroom_id = ?', [c.id]);
  await q().query('DELETE FROM classroom_posts WHERE classroom_id = ?', [c.id]);
  await q().query('DELETE FROM classroom_members WHERE classroom_id = ?', [c.id]);
  await q().query('DELETE FROM classrooms WHERE id = ?', [c.id]);
  res.json({ message: 'Class deleted. Students keep their roadmaps.' });
});

router.post('/join', auth, async (req, res) => {
  try {
    const [[c]] = await q().query('SELECT * FROM classrooms WHERE join_code = ?', [String(req.body.code || '').trim().toLowerCase()]);
    if (!c) return res.status(404).json({ message: 'That class code isn’t valid. Check it with your teacher.' });
    const role = await member(c.id, req.user.id);
    if (role) return res.json({ id: c.id, message: 'You’re already in this class.' });
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM classroom_members WHERE classroom_id = ? AND role = ?', [c.id, 'student']);
    if (Number(n) >= MAX_STUDENTS) return res.status(400).json({ message: 'This class is full.' });
    await q().query('INSERT INTO classroom_members (classroom_id, user_id, role) VALUES (?, ?, ?)', [c.id, req.user.id, 'student']);
    const [assignments] = await q().query('SELECT * FROM classroom_assignments WHERE classroom_id = ? ORDER BY created_at', [c.id]);
    for (const a of assignments) await giveCopy(a, req.user.id).catch((e) => console.warn('[classes] copy', e.message));
    const [[u]] = await q().query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await notify(c.owner_id, { title: `${firstName(u?.name)} joined ${c.name}`, message: 'They now have all of the class assignments.', link: `/classes/${c.id}`, type: 'class' });
    res.json({ id: c.id, message: `Welcome to ${c.name}!` });
  } catch (err) {
    console.error('[classes] join', err.message);
    res.status(500).json({ message: 'Could not join the class.' });
  }
});

router.post('/:id/leave', auth, async (req, res) => {
  const role = await member(req.params.id, req.user.id);
  if (role !== 'student') return res.status(400).json({ message: role === 'teacher' ? 'Teachers can delete the class instead.' : 'You’re not in this class.' });
  await q().query('DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'You left the class. Your roadmaps stay in your account.' });
});

router.delete('/:id/students/:userId', auth, async (req, res) => {
  if ((await member(req.params.id, req.user.id)) !== 'teacher') return res.status(403).json({ message: 'Only the teacher can remove students.' });
  await q().query('DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ? AND role = ?', [req.params.id, req.params.userId, 'student']);
  res.json({ message: 'Student removed' });
});

/* ---------- Assignments ---------- */

router.post('/:id/assignments', auth, async (req, res) => {
  try {
    const c = await classById(req.params.id);
    if (!c || (await member(c.id, req.user.id)) !== 'teacher') return res.status(403).json({ message: 'Only the teacher can assign roadmaps.' });
    const src = await ownRoadmap(req.body.roadmap_id, req.user.id);
    if (!src) return res.status(404).json({ message: 'Pick one of your own roadmaps.' });
    const due = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.due_date || '')) ? req.body.due_date : null;
    const [ins] = await q().query('INSERT INTO classroom_assignments (classroom_id, source_roadmap_id, title, instructions, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, src.id, clean(req.body.title, 300) || src.title, String(req.body.instructions || '').trim().slice(0, 2000) || null, due, req.user.id]);
    const [[a]] = await q().query('SELECT * FROM classroom_assignments WHERE id = ?', [ins.insertId]);
    const [students] = await q().query('SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = ?', [c.id, 'student']);
    for (const s of students) {
      await giveCopy(a, s.user_id).catch((e) => console.warn('[classes] copy', e.message));
      await notify(s.user_id, { title: `New assignment in ${c.name}`, message: `${a.title}${due ? ` — due ${due}` : ''}`, link: `/classes/${c.id}`, type: 'class' });
    }
    res.json({ id: a.id, message: `Assigned to ${students.length} student${students.length === 1 ? '' : 's'}.` });
  } catch (err) {
    console.error('[classes] assign', err.message);
    res.status(500).json({ message: 'Could not create the assignment.' });
  }
});

router.delete('/:id/assignments/:aid', auth, async (req, res) => {
  if ((await member(req.params.id, req.user.id)) !== 'teacher') return res.status(403).json({ message: 'Only the teacher can remove assignments.' });
  await q().query('DELETE FROM assignment_copies WHERE assignment_id = ?', [req.params.aid]);
  await q().query('DELETE FROM classroom_assignments WHERE id = ? AND classroom_id = ?', [req.params.aid, req.params.id]);
  res.json({ message: 'Assignment removed. Students keep their copies.' });
});

/* ---------- Announcements ---------- */

router.post('/:id/posts', auth, async (req, res) => {
  const body = String(req.body.body || '').trim().slice(0, 2000);
  if (!body) return res.status(400).json({ message: 'Write something first.' });
  const c = await classById(req.params.id);
  if (!c || (await member(c.id, req.user.id)) !== 'teacher') return res.status(403).json({ message: 'Only the teacher can post announcements.' });
  await q().query('INSERT INTO classroom_posts (classroom_id, user_id, body) VALUES (?, ?, ?)', [c.id, req.user.id, body]);
  const [students] = await q().query('SELECT user_id FROM classroom_members WHERE classroom_id = ? AND role = ?', [c.id, 'student']);
  for (const s of students) await notify(s.user_id, { title: `${c.name}: new announcement`, message: body.slice(0, 140), link: `/classes/${c.id}`, type: 'class' });
  res.json({ message: 'Posted' });
});

router.delete('/:id/posts/:pid', auth, async (req, res) => {
  if ((await member(req.params.id, req.user.id)) !== 'teacher') return res.status(403).json({ message: 'Only the teacher can remove posts.' });
  await q().query('DELETE FROM classroom_posts WHERE id = ? AND classroom_id = ?', [req.params.pid, req.params.id]);
  res.json({ message: 'Removed' });
});

/* ---------- Is this roadmap a class assignment? (banner on the roadmap page) ---------- */

router.get('/for-roadmap/:roadmapId', auth, async (req, res) => {
  const [[row]] = await q().query(
    `SELECT a.title, a.due_date, a.instructions, c.id AS class_id, c.name AS class_name, u.name AS teacher
     FROM assignment_copies ac JOIN classroom_assignments a ON a.id = ac.assignment_id JOIN classrooms c ON c.id = a.classroom_id JOIN users u ON u.id = c.owner_id
     WHERE ac.roadmap_id = ? AND ac.user_id = ?`, [req.params.roadmapId, req.user.id]);
  res.json(row || null);
});

module.exports = router;
