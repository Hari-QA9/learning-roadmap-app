// Public pages (no login): portfolio profiles, shared roadmaps and certificate verification.
// Only data a member has chosen to make public is returned — never emails, phone numbers or ids
// that could be used to look up anything else.
const express = require('express');
const router = express.Router();
const db = require('../db');
const { learningSummary } = require('../lib/engagement');
const { loadProfile } = require('../lib/careerProfile');

const q = () => db.promise();
const parse = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };
const firstName = (n) => String(n || 'A Learnvoy member').split(' ')[0];

// Public pages can be cached briefly by browsers.
router.use((req, res, next) => { res.setHeader('Cache-Control', 'public, max-age=60'); next(); });

async function progressOf(roadmapIds) {
  if (!roadmapIds.length) return new Map();
  const [rows] = await q().query(
    `SELECT m.roadmap_id, COUNT(t.id) AS total, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done
     FROM modules m LEFT JOIN tasks t ON t.module_id = m.id WHERE m.roadmap_id IN (?) GROUP BY m.roadmap_id`,
    [roadmapIds]
  );
  return new Map(rows.map((r) => [r.roadmap_id, { total: Number(r.total) || 0, done: Number(r.done) || 0 }]));
}

/** Resume sections that are safe to show publicly (no email, phone or address). */
function publicResume(raw) {
  const r = parse(raw, null);
  if (!r || r.version !== 2) return null;
  const pickEntries = (list, fields) => (Array.isArray(list) ? list : []).slice(0, 12).map((e) => {
    const out = {};
    for (const f of fields) if (e && e[f] != null && e[f] !== '') out[f] = e[f];
    if (Array.isArray(e?.bullets)) out.bullets = e.bullets.filter(Boolean).slice(0, 8);
    return out;
  }).filter((e) => Object.keys(e).length);
  const out = {
    summary: String(r.summary || '').slice(0, 1500),
    experience: pickEntries(r.experience, ['title', 'company', 'start', 'end', 'current']),
    projects: pickEntries(r.projects, ['name', 'tech', 'link', 'start', 'end', 'current']),
    education: pickEntries(r.education, ['degree', 'school', 'start', 'end', 'current']),
    certifications: pickEntries(r.certifications, ['name', 'issuer', 'date']),
  };
  return out.summary || out.experience.length || out.projects.length || out.education.length ? out : null;
}

// GET /api/public/u/:username — a member's portfolio page
router.get('/u/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').toLowerCase();
    const [[p]] = await q().query('SELECT * FROM public_profiles WHERE username = ? AND is_public = 1', [username]);
    if (!p) return res.status(404).json({ message: 'This profile doesn’t exist or is private.' });
    const [[u]] = await q().query('SELECT id, name, bio, profile_picture, created_at FROM users WHERE id = ?', [p.user_id]);
    if (!u) return res.status(404).json({ message: 'This profile doesn’t exist or is private.' });

    const career = await loadProfile(u.id).catch(() => ({ skills: [] }));
    const out = {
      username: p.username,
      name: u.name,
      headline: p.headline || '',
      bio: u.bio || '',
      photo: /^https:\/\//i.test(u.profile_picture || '') ? u.profile_picture : null,
      member_since: u.created_at,
      links: parse(p.links, {}),
      skills: (career.skills || []).slice(0, 30),
    };

    if (p.show_stats) {
      const s = await learningSummary(u.id).catch(() => ({ streak: 0 }));
      const [[done]] = await q().query(
        `SELECT COUNT(*) AS n FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
         WHERE r.user_id = ? AND t.status = 'done'`, [u.id]);
      const [[badges]] = await q().query('SELECT COUNT(*) AS n FROM user_badges WHERE user_id = ?', [u.id]);
      out.stats = { streak: s.streak || 0, tasks_done: Number(done.n) || 0, badges: Number(badges.n) || 0 };
    }

    if (p.show_roadmaps) {
      const [roadmaps] = await q().query(
        'SELECT id, title, description, status, share_slug, copies FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [u.id]);
      const prog = await progressOf(roadmaps.map((r) => r.id));
      out.roadmaps = roadmaps.map((r) => {
        const pr = prog.get(r.id) || { total: 0, done: 0 };
        return {
          title: r.title, description: String(r.description || '').slice(0, 240), status: r.status,
          progress: pr.total ? Math.round((pr.done / pr.total) * 100) : 0, tasks: pr.total,
          share_slug: r.share_slug || null, copies: Number(r.copies) || 0,
        };
      });
    }

    if (p.show_certificates) {
      const [certs] = await q().query('SELECT roadmap_title, certificate_id, issued_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC LIMIT 30', [u.id]);
      out.certificates = certs;
    }

    if (p.show_resume) {
      const [[r]] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ?', [u.id]).catch(() => [[null]]);
      out.resume = publicResume(r?.resume_data);
    }
    res.json(out);
  } catch (err) {
    console.error('[public] profile', err.message);
    res.status(500).json({ message: 'Could not load this profile.' });
  }
});

// GET /api/public/explore — roadmaps their owners listed on Explore (most copied first)
router.get('/explore', async (req, res) => {
  try {
    const term = String(req.query.q || '').trim().toLowerCase().slice(0, 80);
    const sort = req.query.sort === 'new' ? 'r.created_at DESC' : 'r.copies DESC, r.created_at DESC';
    const params = [];
    let where = 'r.share_slug IS NOT NULL AND r.listed = 1';
    if (term) {
      where += ' AND (LOWER(r.title) LIKE ? OR LOWER(COALESCE(r.description, \'\')) LIKE ?)';
      params.push(`%${term}%`, `%${term}%`);
    }
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);
    const [rows] = await q().query(
      `SELECT r.id, r.title, r.description, r.duration, r.copies, r.share_slug, r.created_at, u.name AS author, p.username
       FROM roadmaps r JOIN users u ON u.id = r.user_id LEFT JOIN public_profiles p ON p.user_id = u.id AND p.is_public = 1
       WHERE ${where} ORDER BY ${sort} LIMIT 25 OFFSET ${page * 24}`, params);
    const ids = rows.map((r) => r.id);
    const [counts] = ids.length ? await q().query(
      'SELECT m.roadmap_id, COUNT(DISTINCT m.id) AS modules, COUNT(t.id) AS tasks FROM modules m LEFT JOIN tasks t ON t.module_id = m.id WHERE m.roadmap_id IN (?) GROUP BY m.roadmap_id', [ids]) : [[]];
    const c = new Map(counts.map((x) => [x.roadmap_id, x]));
    res.json({
      more: rows.length > 24,
      roadmaps: rows.slice(0, 24).map((r) => ({
        slug: r.share_slug, title: r.title, description: String(r.description || '').slice(0, 220), duration: r.duration || '',
        copies: Number(r.copies) || 0, modules: Number(c.get(r.id)?.modules) || 0, tasks: Number(c.get(r.id)?.tasks) || 0,
        author: r.username ? r.author : firstName(r.author), username: r.username || null, created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[public] explore', err.message);
    res.status(500).json({ message: 'Could not load roadmaps.' });
  }
});

// GET /api/public/roadmaps/:slug — a shared roadmap (outline only)
router.get('/roadmaps/:slug', async (req, res) => {
  const slug = String(req.params.slug || '');
  if (!/^[a-z0-9]{6,24}$/.test(slug)) return res.status(404).json({ message: 'This share link isn’t valid.' });
  try {
    const [[r]] = await q().query('SELECT id, user_id, title, description, goal, duration, copies FROM roadmaps WHERE share_slug = ?', [slug]);
    if (!r) return res.status(404).json({ message: 'This roadmap is no longer shared.' });
    const [mods] = await q().query('SELECT id, title, description FROM modules WHERE roadmap_id = ? ORDER BY order_index, id LIMIT 40', [r.id]);
    const ids = mods.map((m) => m.id);
    const [tasks] = ids.length
      ? await q().query('SELECT module_id, title, task_type, est_minutes FROM tasks WHERE module_id IN (?) ORDER BY position, id', [ids])
      : [[]];
    const [resources] = await q().query('SELECT title, url, type, is_free FROM resources WHERE roadmap_id = ? LIMIT 30', [r.id]);
    const [[author]] = await q().query(
      'SELECT u.name, p.username FROM users u LEFT JOIN public_profiles p ON p.user_id = u.id AND p.is_public = 1 WHERE u.id = ?', [r.user_id]);
    const minutes = tasks.reduce((s, t) => s + (Number(t.est_minutes) || 0), 0);
    res.json({
      slug,
      title: r.title,
      description: r.description || '',
      goal: r.goal || '',
      duration: r.duration || '',
      copies: Number(r.copies) || 0,
      author: author ? { name: author.username ? author.name : firstName(author.name), username: author.username || null } : null,
      modules: mods.map((m) => ({
        title: m.title,
        description: m.description || '',
        tasks: tasks.filter((t) => t.module_id === m.id).slice(0, 60).map((t) => ({ title: t.title, type: t.task_type || null, minutes: t.est_minutes || null })),
      })),
      resources: resources.filter((x) => /^https?:\/\//i.test(x.url || '')),
      total_tasks: tasks.length,
      total_hours: Math.round(minutes / 60),
    });
  } catch (err) {
    console.error('[public] roadmap', err.message);
    res.status(500).json({ message: 'Could not load this roadmap.' });
  }
});

// GET /api/public/groups/:code — what a group invite link shows before joining
router.get('/groups/:code', async (req, res) => {
  const code = String(req.params.code || '').toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(code)) return res.status(404).json({ message: 'This invite link isn’t valid.' });
  try {
    const [[g]] = await q().query('SELECT id, name, goal, description FROM study_groups WHERE invite_code = ?', [code]);
    if (!g) return res.status(404).json({ message: 'This invite link isn’t valid any more.' });
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?', [g.id]);
    res.json({ name: g.name, goal: g.goal || '', description: g.description || '', members: Number(n) });
  } catch (err) {
    res.status(500).json({ message: 'Could not load this group.' });
  }
});

// GET /api/public/classes/:code — what a class join link shows before joining
router.get('/classes/:code', async (req, res) => {
  const code = String(req.params.code || '').toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(code)) return res.status(404).json({ message: 'This class code isn’t valid.' });
  try {
    const [[c]] = await q().query('SELECT c.id, c.name, c.description, u.name AS teacher FROM classrooms c JOIN users u ON u.id = c.owner_id WHERE c.join_code = ?', [code]);
    if (!c) return res.status(404).json({ message: 'This class code isn’t valid any more. Ask your teacher for a new one.' });
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM classroom_members WHERE classroom_id = ? AND role = ?', [c.id, 'student']);
    res.json({ name: c.name, description: c.description || '', teacher: c.teacher, students: Number(n) });
  } catch (err) {
    res.status(500).json({ message: 'Could not load this class.' });
  }
});

// GET /api/public/certificates/:id — check a certificate is real
router.get('/certificates/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!/^[A-Za-z0-9-]{6,100}$/.test(id)) return res.status(404).json({ valid: false, message: 'No certificate has this ID.' });
  try {
    const [[c]] = await q().query('SELECT user_id, user_name, roadmap_title, issued_at, certificate_id FROM certificates WHERE certificate_id = ?', [id]);
    if (!c) return res.status(404).json({ valid: false, message: 'No certificate has this ID.' });
    const [[p]] = await q().query('SELECT username FROM public_profiles WHERE user_id = ? AND is_public = 1', [c.user_id]);
    res.json({ valid: true, certificate_id: c.certificate_id, name: c.user_name, roadmap_title: c.roadmap_title, issued_at: c.issued_at, username: p?.username || null });
  } catch (err) {
    console.error('[public] certificate', err.message);
    res.status(500).json({ message: 'Could not check this certificate.' });
  }
});

module.exports = router;
