// Growth pack (logged-in): public profile settings, roadmap share links, copying shared
// roadmaps, and invite links.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { ownRoadmap } = require('../lib/ownership');
const { copyRoadmap } = require('../lib/roadmapCopy');
const { notify } = require('../lib/engagement');
const { randomCode, checkUsername, suggestUsername, inviteCode, awardBadge } = require('../lib/growth');

const q = () => db.promise();
const flag = (v) => (v ? 1 : 0);
const parse = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };

/** Only keep http(s) links, so nothing like javascript: can end up on a public page. */
function cleanLink(v) {
  const s = String(v || '').trim().slice(0, 300);
  if (!s) return '';
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.toString() : '';
  } catch { return ''; }
}

/* ---------- Public profile settings ---------- */

router.get('/profile', auth, async (req, res) => {
  try {
    const [rows] = await q().query('SELECT * FROM public_profiles WHERE user_id = ?', [req.user.id]);
    if (rows.length) {
      const p = rows[0];
      return res.json({
        exists: true, username: p.username, is_public: !!p.is_public, headline: p.headline || '',
        links: { linkedin: '', github: '', website: '', ...parse(p.links, {}) },
        show_roadmaps: !!p.show_roadmaps, show_certificates: !!p.show_certificates, show_resume: !!p.show_resume, show_stats: !!p.show_stats,
      });
    }
    const [[u]] = await q().query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const [[resume]] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ?', [req.user.id]).catch(() => [[null]]);
    const r = parse(resume?.resume_data, {});
    res.json({
      exists: false, username: await suggestUsername(u?.name), is_public: false,
      headline: r.contact?.headline || r.goal || '',
      links: { linkedin: r.contact?.linkedin || '', github: '', website: r.contact?.website || '' },
      show_roadmaps: true, show_certificates: true, show_resume: true, show_stats: true,
    });
  } catch (err) {
    console.error('[growth] profile', err.message);
    res.status(500).json({ message: 'Could not load your public profile settings.' });
  }
});

router.get('/username-check', auth, async (req, res) => {
  const { u, error } = checkUsername(req.query.u);
  if (error) return res.json({ available: false, message: error });
  const [rows] = await q().query('SELECT user_id FROM public_profiles WHERE username = ?', [u]);
  const available = !rows.length || rows[0].user_id === req.user.id;
  res.json({ available, username: u, message: available ? 'Available' : 'Already taken' });
});

router.put('/profile', auth, async (req, res) => {
  const b = req.body || {};
  const { u, error } = checkUsername(b.username);
  if (error) return res.status(400).json({ message: error });
  const links = { linkedin: cleanLink(b.links?.linkedin), github: cleanLink(b.links?.github), website: cleanLink(b.links?.website) };
  try {
    const [taken] = await q().query('SELECT user_id FROM public_profiles WHERE username = ? AND user_id <> ?', [u, req.user.id]);
    if (taken.length) return res.status(409).json({ message: 'That username is already taken.' });
    const vals = [u, flag(b.is_public), String(b.headline || '').trim().slice(0, 160), JSON.stringify(links),
      flag(b.show_roadmaps !== false), flag(b.show_certificates !== false), flag(b.show_resume !== false), flag(b.show_stats !== false)];
    const [exists] = await q().query('SELECT user_id FROM public_profiles WHERE user_id = ?', [req.user.id]);
    if (exists.length) {
      await q().query(
        `UPDATE public_profiles SET username = ?, is_public = ?, headline = ?, links = ?, show_roadmaps = ?, show_certificates = ?,
         show_resume = ?, show_stats = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [...vals, req.user.id]);
    } else {
      await q().query(
        `INSERT INTO public_profiles (username, is_public, headline, links, show_roadmaps, show_certificates, show_resume, show_stats, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...vals, req.user.id]);
    }
    res.json({ message: b.is_public ? 'Your public profile is live.' : 'Saved. Your profile is private.', username: u, links });
  } catch (err) {
    if (/duplicate|unique/i.test(err.message)) return res.status(409).json({ message: 'That username is already taken.' });
    console.error('[growth] save profile', err.message);
    res.status(500).json({ message: 'Could not save your public profile.' });
  }
});

/* ---------- Share a roadmap ---------- */

router.post('/roadmaps/:id/share', auth, async (req, res) => {
  try {
    const r = await ownRoadmap(req.params.id, req.user.id);
    if (!r) return res.status(404).json({ message: 'Roadmap not found.' });
    let slug = r.share_slug;
    if (!slug) {
      slug = randomCode(10);
      await q().query('UPDATE roadmaps SET share_slug = ? WHERE id = ?', [slug, r.id]);
    }
    res.json({ slug, copies: Number(r.copies) || 0, listed: !!Number(r.listed) });
  } catch (err) {
    console.error('[growth] share', err.message);
    res.status(500).json({ message: 'Could not create a share link.' });
  }
});

router.delete('/roadmaps/:id/share', auth, async (req, res) => {
  try {
    const r = await ownRoadmap(req.params.id, req.user.id);
    if (!r) return res.status(404).json({ message: 'Roadmap not found.' });
    await q().query('UPDATE roadmaps SET share_slug = NULL WHERE id = ?', [r.id]);
    await q().query('UPDATE roadmaps SET listed = 0 WHERE id = ?', [r.id]).catch(() => {});
    res.json({ message: 'Sharing turned off. The old link no longer works.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not turn sharing off.' });
  }
});

// List (or unlist) a shared roadmap on the public Explore page
router.put('/roadmaps/:id/listing', auth, async (req, res) => {
  try {
    const r = await ownRoadmap(req.params.id, req.user.id);
    if (!r) return res.status(404).json({ message: 'Roadmap not found.' });
    if (!r.share_slug) return res.status(400).json({ message: 'Share the roadmap first.' });
    await q().query('UPDATE roadmaps SET listed = ? WHERE id = ?', [req.body.listed ? 1 : 0, r.id]);
    res.json({ message: req.body.listed ? 'Listed on Explore — anyone can find it.' : 'Removed from Explore. The link still works.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not update the listing.' });
  }
});

/* ---------- Copy a shared roadmap into my account ---------- */

router.post('/roadmaps/copy/:slug', auth, async (req, res) => {
  const slug = String(req.params.slug || '');
  if (!/^[a-z0-9]{6,24}$/.test(slug)) return res.status(404).json({ message: 'This share link isn’t valid.' });
  try {
    const [[src]] = await q().query('SELECT * FROM roadmaps WHERE share_slug = ?', [slug]);
    if (!src) return res.status(404).json({ message: 'This roadmap is no longer shared.' });
    const userId = req.user.id;
    const newId = await copyRoadmap(src, userId);
    await q().query('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [userId, 'Copied Roadmap', `Copied roadmap: ${src.title}`]).catch(() => {});

    if (src.user_id !== userId) {
      await q().query('UPDATE roadmaps SET copies = COALESCE(copies, 0) + 1 WHERE id = ?', [src.id]);
      const copies = (Number(src.copies) || 0) + 1;
      const firstBadge = await awardBadge(src.user_id, 10).catch(() => false);
      // Tell the author on the 1st, 5th, 10th, 25th… copy (not every single time).
      if ([1, 5, 10, 25, 50, 100].includes(copies) || copies % 100 === 0) {
        await notify(src.user_id, {
          title: copies === 1 ? 'Someone copied your roadmap' : `${copies} people copied your roadmap`,
          message: `“${src.title}” is helping others learn.${firstBadge ? ' You earned the Trailblazer badge!' : ''}`,
          link: `/roadmaps/${src.id}`,
          type: 'share',
        });
      }
    }
    res.json({ message: 'Roadmap copied to your account.', roadmapId: newId });
  } catch (err) {
    console.error('[growth] copy', err.message);
    res.status(500).json({ message: 'Could not copy this roadmap. Please try again.' });
  }
});

/* ---------- Invite friends ---------- */

router.get('/invite', auth, async (req, res) => {
  try {
    const code = await inviteCode(req.user.id);
    const [joined] = await q().query(
      'SELECT u.name, r.created_at FROM referrals r JOIN users u ON u.id = r.invitee_id WHERE r.inviter_id = ? ORDER BY r.created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ code, joined: joined.map((j) => ({ name: String(j.name || '').split(' ')[0], created_at: j.created_at })), count: joined.length });
  } catch (err) {
    console.error('[growth] invite', err.message);
    res.status(500).json({ message: 'Could not load your invite link.' });
  }
});

module.exports = router;
