// Community pack: study groups (with chat), accountability buddies, weekly challenges and leaderboard.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { notify } = require('../lib/engagement');
const { randomCode, inviteCode } = require('../lib/growth');
const { weekOf, weekStats, shortName } = require('../lib/weekly');

const q = () => db.promise();
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const firstName = (n) => String(n || 'Someone').split(' ')[0];
const pad = (n) => String(n).padStart(2, '0');
const sqlTime = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const MAX_MEMBERS = 50;
const MAX_GROUPS = 20;
const MAX_BUDDIES = 5;

async function membership(groupId, userId) {
  const [[m]] = await q().query('SELECT role, last_read_id FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  return m || null;
}
async function groupById(id) {
  const [[g]] = await q().query('SELECT * FROM study_groups WHERE id = ?', [id]);
  return g || null;
}

/* =====================================================================
   Study groups
   ===================================================================== */

router.get('/groups', auth, async (req, res) => {
  try {
    const [rows] = await q().query(
      `SELECT g.id, g.name, g.goal, g.is_public, g.weekly_goal, gm.role, gm.last_read_id,
              (SELECT COUNT(*) FROM group_members x WHERE x.group_id = g.id) AS members,
              (SELECT COUNT(*) FROM group_messages m WHERE m.group_id = g.id AND m.id > gm.last_read_id AND m.user_id <> ?) AS unread
       FROM study_groups g JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ? ORDER BY g.created_at DESC`,
      [req.user.id, req.user.id]
    );
    res.json(rows.map((g) => ({ ...g, members: Number(g.members), unread: Number(g.unread), is_public: !!g.is_public })));
  } catch (err) {
    console.error('[community] groups', err.message);
    res.status(500).json({ message: 'Could not load your groups.' });
  }
});

router.get('/groups/discover', auth, async (req, res) => {
  try {
    const term = `%${clean(req.query.q, 60).toLowerCase()}%`;
    const [rows] = await q().query(
      `SELECT g.id, g.name, g.goal, g.description, (SELECT COUNT(*) FROM group_members x WHERE x.group_id = g.id) AS members
       FROM study_groups g WHERE g.is_public = 1 AND (LOWER(g.name) LIKE ? OR LOWER(COALESCE(g.goal, '')) LIKE ?)
         AND g.id NOT IN (SELECT group_id FROM group_members WHERE user_id = ?)
       ORDER BY members DESC, g.created_at DESC LIMIT 20`,
      [term, term, req.user.id]
    );
    res.json(rows.map((g) => ({ ...g, members: Number(g.members) })));
  } catch (err) {
    res.status(500).json({ message: 'Could not search groups.' });
  }
});

router.post('/groups', auth, async (req, res) => {
  const name = clean(req.body.name, 80);
  if (name.length < 3) return res.status(400).json({ message: 'Give your group a name (at least 3 characters).' });
  try {
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?', [req.user.id]);
    if (Number(n) >= MAX_GROUPS) return res.status(400).json({ message: `You can be in up to ${MAX_GROUPS} groups.` });
    const weeklyGoal = Math.min(500, Math.max(1, parseInt(req.body.weekly_goal, 10) || 20));
    const [ins] = await q().query(
      'INSERT INTO study_groups (name, goal, description, owner_id, invite_code, is_public, weekly_goal) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, clean(req.body.goal, 160) || null, String(req.body.description || '').trim().slice(0, 1000) || null, req.user.id, randomCode(10), req.body.is_public ? 1 : 0, weeklyGoal]
    );
    await q().query('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)', [ins.insertId, req.user.id, 'owner']);
    res.json({ id: ins.insertId, message: 'Group created' });
  } catch (err) {
    console.error('[community] create group', err.message);
    res.status(500).json({ message: 'Could not create the group.' });
  }
});

router.get('/groups/:id', auth, async (req, res) => {
  try {
    const g = await groupById(req.params.id);
    if (!g) return res.status(404).json({ message: 'Group not found.' });
    const me = await membership(g.id, req.user.id);
    const [members] = await q().query(
      'SELECT u.id, u.name, u.profile_picture, gm.role, gm.joined_at, p.username FROM group_members gm JOIN users u ON u.id = gm.user_id LEFT JOIN public_profiles p ON p.user_id = u.id AND p.is_public = 1 WHERE gm.group_id = ? ORDER BY gm.joined_at',
      [g.id]
    );
    if (!me) {
      if (!g.is_public) return res.status(404).json({ message: 'Group not found.' });
      return res.json({ id: g.id, name: g.name, goal: g.goal, description: g.description, is_public: true, member: false, members: members.length });
    }
    const week = await weekOf(req.user.id);
    const stats = await weekStats(members.map((m) => m.id), week.start, { withStreak: true });
    const list = members.map((m) => {
      const s = stats.get(m.id) || {};
      return {
        id: m.id, name: m.name, short_name: shortName(m.name), role: m.role, me: m.id === req.user.id, username: m.username || null,
        photo: /^https:\/\//i.test(m.profile_picture || '') ? m.profile_picture : null,
        week: { tasks: s.tasks || 0, focus: s.focus || 0, reviews: s.reviews || 0, points: s.points || 0 },
        streak: s.streak || 0, done_today: (s.today || 0) >= (s.goal || 1), last_active: s.lastActive || null,
      };
    }).sort((a, b) => b.week.points - a.week.points);
    const groupTasks = list.reduce((n, m) => n + m.week.tasks, 0);
    const [buddyRows] = await q().query('SELECT requester_id, addressee_id FROM buddies WHERE requester_id = ? OR addressee_id = ?', [req.user.id, req.user.id]);
    const buddyIds = new Set(buddyRows.map((b) => (b.requester_id === req.user.id ? b.addressee_id : b.requester_id)));
    res.json({
      id: g.id, name: g.name, goal: g.goal, description: g.description, is_public: !!g.is_public, weekly_goal: g.weekly_goal,
      invite_code: g.invite_code, member: true, role: me.role, created_at: g.created_at,
      week: { start: week.start, days_left: week.daysLeft, tasks: groupTasks, goal: g.weekly_goal },
      members: list.map((m) => ({ ...m, is_buddy: buddyIds.has(m.id) })),
    });
  } catch (err) {
    console.error('[community] group', err.message);
    res.status(500).json({ message: 'Could not load this group.' });
  }
});

router.put('/groups/:id', auth, async (req, res) => {
  try {
    const g = await groupById(req.params.id);
    const me = g && await membership(g.id, req.user.id);
    if (!me || me.role !== 'owner') return res.status(403).json({ message: 'Only the group owner can change this.' });
    const name = clean(req.body.name, 80) || g.name;
    await q().query('UPDATE study_groups SET name = ?, goal = ?, description = ?, is_public = ?, weekly_goal = ? WHERE id = ?', [
      name, clean(req.body.goal, 160) || null, String(req.body.description || '').trim().slice(0, 1000) || null,
      req.body.is_public ? 1 : 0, Math.min(500, Math.max(1, parseInt(req.body.weekly_goal, 10) || g.weekly_goal)), g.id,
    ]);
    if (req.body.new_invite) await q().query('UPDATE study_groups SET invite_code = ? WHERE id = ?', [randomCode(10), g.id]);
    res.json({ message: 'Group updated' });
  } catch (err) {
    res.status(500).json({ message: 'Could not update the group.' });
  }
});

async function deleteGroup(id) {
  await q().query('DELETE FROM group_messages WHERE group_id = ?', [id]);
  await q().query('DELETE FROM group_members WHERE group_id = ?', [id]);
  await q().query('DELETE FROM study_groups WHERE id = ?', [id]);
}

router.delete('/groups/:id', auth, async (req, res) => {
  try {
    const g = await groupById(req.params.id);
    const me = g && await membership(g.id, req.user.id);
    if (!me || me.role !== 'owner') return res.status(403).json({ message: 'Only the group owner can delete the group.' });
    await deleteGroup(g.id);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete the group.' });
  }
});

async function addMember(g, userId) {
  const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?', [g.id]);
  if (Number(n) >= MAX_MEMBERS) return { error: `This group is full (${MAX_MEMBERS} members).` };
  const [[{ mine }]] = await q().query('SELECT COUNT(*) AS mine FROM group_members WHERE user_id = ?', [userId]);
  if (Number(mine) >= MAX_GROUPS) return { error: `You can be in up to ${MAX_GROUPS} groups.` };
  const [[last]] = await q().query('SELECT MAX(id) AS id FROM group_messages WHERE group_id = ?', [g.id]);
  await q().query('INSERT INTO group_members (group_id, user_id, role, last_read_id) VALUES (?, ?, ?, ?)', [g.id, userId, 'member', Number(last?.id) || 0]);
  const [[u]] = await q().query('SELECT name FROM users WHERE id = ?', [userId]);
  await notify(g.owner_id, { title: `${firstName(u?.name)} joined ${g.name}`, message: 'Say hi in the group chat!', link: `/groups/${g.id}`, type: 'group' });
  return { ok: true };
}

// Join with an invite code (from a /g/:code link) or a public group's id
router.post('/groups/join', auth, async (req, res) => {
  try {
    let g = null;
    if (req.body.code) {
      const [[row]] = await q().query('SELECT * FROM study_groups WHERE invite_code = ?', [String(req.body.code).toLowerCase()]);
      g = row || null;
    } else if (req.body.group_id) {
      const row = await groupById(req.body.group_id);
      g = row && row.is_public ? row : null;
    }
    if (!g) return res.status(404).json({ message: 'This invite link isn’t valid any more.' });
    if (await membership(g.id, req.user.id)) return res.json({ id: g.id, message: 'You’re already in this group.' });
    const r = await addMember(g, req.user.id);
    if (r.error) return res.status(400).json({ message: r.error });
    res.json({ id: g.id, message: `Welcome to ${g.name}!` });
  } catch (err) {
    console.error('[community] join', err.message);
    res.status(500).json({ message: 'Could not join the group.' });
  }
});

router.post('/groups/:id/leave', auth, async (req, res) => {
  try {
    const g = await groupById(req.params.id);
    const me = g && await membership(g.id, req.user.id);
    if (!me) return res.status(404).json({ message: 'You’re not in this group.' });
    await q().query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [g.id, req.user.id]);
    if (me.role === 'owner') {
      const [[next]] = await q().query('SELECT user_id FROM group_members WHERE group_id = ? ORDER BY joined_at LIMIT 1', [g.id]);
      if (next) {
        await q().query('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', ['owner', g.id, next.user_id]);
        await q().query('UPDATE study_groups SET owner_id = ? WHERE id = ?', [next.user_id, g.id]);
        await notify(next.user_id, { title: `You now run ${g.name}`, message: 'The previous owner left, so the group passed to you.', link: `/groups/${g.id}`, type: 'group' });
      } else {
        await deleteGroup(g.id);
      }
    }
    res.json({ message: 'You left the group.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not leave the group.' });
  }
});

router.delete('/groups/:id/members/:userId', auth, async (req, res) => {
  try {
    const g = await groupById(req.params.id);
    const me = g && await membership(g.id, req.user.id);
    if (!me || me.role !== 'owner') return res.status(403).json({ message: 'Only the group owner can remove members.' });
    if (Number(req.params.userId) === req.user.id) return res.status(400).json({ message: 'Use “Leave group” to leave.' });
    await q().query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [g.id, req.params.userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Could not remove the member.' });
  }
});

/* ---------- Group chat ---------- */

router.get('/groups/:id/messages', auth, async (req, res) => {
  try {
    const me = await membership(req.params.id, req.user.id);
    if (!me) return res.status(404).json({ message: 'Group not found.' });
    const after = parseInt(req.query.after, 10) || 0;
    const [rows] = after
      ? await q().query('SELECT m.id, m.user_id, m.body, m.created_at, u.name FROM group_messages m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? AND m.id > ? ORDER BY m.id LIMIT 100', [req.params.id, after])
      : await q().query('SELECT * FROM (SELECT m.id, m.user_id, m.body, m.created_at, u.name FROM group_messages m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY m.id DESC LIMIT 60) t ORDER BY id', [req.params.id]);
    const last = rows.length ? rows[rows.length - 1].id : 0;
    if (last > (me.last_read_id || 0)) await q().query('UPDATE group_members SET last_read_id = ? WHERE group_id = ? AND user_id = ?', [last, req.params.id, req.user.id]);
    res.json(rows.map((m) => ({ id: m.id, body: m.body, created_at: m.created_at, name: shortName(m.name), mine: m.user_id === req.user.id, user_id: m.user_id })));
  } catch (err) {
    console.error('[community] messages', err.message);
    res.status(500).json({ message: 'Could not load messages.' });
  }
});

const lastPost = new Map(); // simple flood control: one message per second per member
router.post('/groups/:id/messages', auth, async (req, res) => {
  const body = String(req.body.body || '').trim().slice(0, 1000);
  if (!body) return res.status(400).json({ message: 'Write a message first.' });
  const now = Date.now();
  if (now - (lastPost.get(req.user.id) || 0) < 1000) return res.status(429).json({ message: 'Slow down a little.' });
  lastPost.set(req.user.id, now);
  try {
    const me = await membership(req.params.id, req.user.id);
    if (!me) return res.status(404).json({ message: 'Group not found.' });
    const [ins] = await q().query('INSERT INTO group_messages (group_id, user_id, body) VALUES (?, ?, ?)', [req.params.id, req.user.id, body]);
    await q().query('UPDATE group_members SET last_read_id = ? WHERE group_id = ? AND user_id = ?', [ins.insertId, req.params.id, req.user.id]);
    res.json({ id: ins.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Could not send the message.' });
  }
});

router.delete('/groups/:id/messages/:messageId', auth, async (req, res) => {
  try {
    const me = await membership(req.params.id, req.user.id);
    if (!me) return res.status(404).json({ message: 'Group not found.' });
    const [r] = me.role === 'owner'
      ? await q().query('DELETE FROM group_messages WHERE id = ? AND group_id = ?', [req.params.messageId, req.params.id])
      : await q().query('DELETE FROM group_messages WHERE id = ? AND group_id = ? AND user_id = ?', [req.params.messageId, req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete the message.' });
  }
});

/* =====================================================================
   Accountability buddies
   ===================================================================== */

async function buddyRows(userId) {
  const [rows] = await q().query(
    `SELECT b.*, u.name AS other_name, u.profile_picture AS other_photo, u.id AS other_id FROM buddies b
     JOIN users u ON u.id = CASE WHEN b.requester_id = ? THEN b.addressee_id ELSE b.requester_id END
     WHERE b.requester_id = ? OR b.addressee_id = ? ORDER BY b.created_at`,
    [userId, userId, userId]
  );
  return rows;
}

router.get('/buddies', auth, async (req, res) => {
  try {
    const rows = await buddyRows(req.user.id);
    const active = rows.filter((b) => b.status === 'active');
    const week = await weekOf(req.user.id);
    const stats = await weekStats(active.map((b) => b.other_id), week.start, { withStreak: true });
    const code = await inviteCode(req.user.id);
    const iRequested = (b) => b.requester_id === req.user.id;
    const myNudge = (b) => (iRequested(b) ? b.requester_nudged_at : b.addressee_nudged_at);
    res.json({
      code,
      buddies: active.map((b) => {
        const s = stats.get(b.other_id) || {};
        const nudged = myNudge(b) ? new Date(myNudge(b)).getTime() : 0;
        return {
          id: b.id, name: b.other_name, short_name: shortName(b.other_name), photo: /^https:\/\//i.test(b.other_photo || '') ? b.other_photo : null,
          streak: s.streak || 0, today: s.today || 0, goal: s.goal || 1, done_today: (s.today || 0) >= (s.goal || 1), last_active: s.lastActive || null,
          week: { tasks: s.tasks || 0, focus: s.focus || 0, reviews: s.reviews || 0, active_days: s.activeDays || 0 },
          can_nudge: Date.now() - nudged > 12 * 3600000,
        };
      }),
      incoming: rows.filter((b) => b.status === 'pending' && !iRequested(b)).map((b) => ({ id: b.id, name: b.other_name })),
      outgoing: rows.filter((b) => b.status === 'pending' && iRequested(b)).map((b) => ({ id: b.id, name: b.other_name })),
    });
  } catch (err) {
    console.error('[community] buddies', err.message);
    res.status(500).json({ message: 'Could not load your buddies.' });
  }
});

/** Ask someone to be your buddy — by their buddy/invite code, or a member of one of your groups. */
router.post('/buddies', auth, async (req, res) => {
  try {
    let otherId = null;
    if (req.body.code) {
      const [[row]] = await q().query('SELECT user_id FROM user_settings WHERE invite_code = ?', [String(req.body.code).toLowerCase()]);
      otherId = row?.user_id || null;
    } else if (req.body.user_id) {
      const [[shared]] = await q().query(
        'SELECT a.group_id FROM group_members a JOIN group_members b ON b.group_id = a.group_id WHERE a.user_id = ? AND b.user_id = ? LIMIT 1',
        [req.user.id, req.body.user_id]
      );
      otherId = shared ? Number(req.body.user_id) : null;
    }
    if (!otherId) return res.status(404).json({ message: 'We couldn’t find that person.' });
    if (otherId === req.user.id) return res.status(400).json({ message: 'You can’t be your own buddy — but nice try!' });
    const rows = await buddyRows(req.user.id);
    const existing = rows.find((b) => b.other_id === otherId);
    if (existing?.status === 'active') return res.json({ message: 'You’re already buddies.' });
    if (rows.filter((b) => b.status === 'active').length >= MAX_BUDDIES) return res.status(400).json({ message: `You can have up to ${MAX_BUDDIES} buddies.` });
    const [[me]] = await q().query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    if (existing && existing.addressee_id === req.user.id) {
      // They already asked me — accept straight away.
      await q().query('UPDATE buddies SET status = ?, accepted_at = ? WHERE id = ?', ['active', sqlTime(new Date()), existing.id]);
      await notify(otherId, { title: `${firstName(me?.name)} is now your buddy`, message: 'Keep each other on track this week!', link: '/buddies', type: 'buddy' });
      return res.json({ message: 'You’re now buddies!' });
    }
    if (existing) return res.json({ message: 'Request already sent.' });
    await q().query('INSERT INTO buddies (requester_id, addressee_id) VALUES (?, ?)', [req.user.id, otherId]);
    await notify(otherId, { title: `${firstName(me?.name)} wants to be your study buddy`, message: 'Buddies see each other’s streak and weekly progress, and can send a nudge.', link: '/buddies', type: 'buddy' });
    res.json({ message: 'Buddy request sent.' });
  } catch (err) {
    console.error('[community] buddy request', err.message);
    res.status(500).json({ message: 'Could not send the request.' });
  }
});

router.post('/buddies/:id/accept', auth, async (req, res) => {
  try {
    const [[b]] = await q().query('SELECT * FROM buddies WHERE id = ? AND addressee_id = ? AND status = ?', [req.params.id, req.user.id, 'pending']);
    if (!b) return res.status(404).json({ message: 'Request not found.' });
    const [[{ n }]] = await q().query('SELECT COUNT(*) AS n FROM buddies WHERE status = ? AND (requester_id = ? OR addressee_id = ?)', ['active', req.user.id, req.user.id]);
    if (Number(n) >= MAX_BUDDIES) return res.status(400).json({ message: `You can have up to ${MAX_BUDDIES} buddies.` });
    await q().query('UPDATE buddies SET status = ?, accepted_at = ? WHERE id = ?', ['active', sqlTime(new Date()), b.id]);
    const [[me]] = await q().query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await notify(b.requester_id, { title: `${firstName(me?.name)} accepted your buddy request`, message: 'Keep each other on track this week!', link: '/buddies', type: 'buddy' });
    res.json({ message: 'You’re now buddies!' });
  } catch (err) {
    res.status(500).json({ message: 'Could not accept.' });
  }
});

// Decline a request, cancel your own request, or end a buddy pairing
router.delete('/buddies/:id', auth, async (req, res) => {
  const [r] = await q().query('DELETE FROM buddies WHERE id = ? AND (requester_id = ? OR addressee_id = ?)', [req.params.id, req.user.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Not found.' });
  res.json({ message: 'Done' });
});

router.post('/buddies/:id/nudge', auth, async (req, res) => {
  try {
    const [[b]] = await q().query('SELECT * FROM buddies WHERE id = ? AND status = ? AND (requester_id = ? OR addressee_id = ?)', [req.params.id, 'active', req.user.id, req.user.id]);
    if (!b) return res.status(404).json({ message: 'Buddy not found.' });
    const mine = b.requester_id === req.user.id ? 'requester_nudged_at' : 'addressee_nudged_at';
    if (b[mine] && Date.now() - new Date(b[mine]).getTime() < 12 * 3600000) return res.status(429).json({ message: 'You already nudged them recently. Try again later.' });
    const other = b.requester_id === req.user.id ? b.addressee_id : b.requester_id;
    const kind = req.body.kind === 'cheer' ? 'cheer' : 'nudge';
    await q().query(`UPDATE buddies SET ${mine} = ? WHERE id = ?`, [sqlTime(new Date()), b.id]);
    const [[me]] = await q().query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await notify(other, kind === 'cheer'
      ? { title: `${firstName(me?.name)} sent you a high five 🙌`, message: 'Great work today — keep the streak going!', link: '/buddies', type: 'buddy' }
      : { title: `${firstName(me?.name)} nudged you 👋`, message: 'Time for a quick task to keep your streak alive?', link: '/dashboard', type: 'buddy' });
    res.json({ message: kind === 'cheer' ? 'High five sent!' : 'Nudge sent!' });
  } catch (err) {
    res.status(500).json({ message: 'Could not send the nudge.' });
  }
});

/* =====================================================================
   Weekly challenges & leaderboard
   ===================================================================== */
const CHALLENGES = [
  { key: 'tasks10', title: 'Finish 10 tasks', icon: 'checkCircle', target: 10, xp: 100, value: (s) => s.tasks },
  { key: 'days5', title: 'Learn on 5 different days', icon: 'flame', target: 5, xp: 75, value: (s) => s.activeDays },
  { key: 'focus120', title: 'Focus for 2 hours', icon: 'clock', target: 120, xp: 75, unit: 'min', value: (s) => s.focus },
  { key: 'review50', title: 'Review 50 flashcards', icon: 'layers', target: 50, xp: 50, value: (s) => s.reviews },
];

router.get('/challenges', auth, async (req, res) => {
  try {
    const week = await weekOf(req.user.id);
    const s = (await weekStats([req.user.id], week.start)).get(req.user.id);
    const [claims] = await q().query('SELECT challenge FROM challenge_claims WHERE user_id = ? AND week = ?', [req.user.id, week.start]);
    const claimed = new Set(claims.map((c) => c.challenge));
    const newlyDone = [];
    const list = [];
    for (const c of CHALLENGES) {
      const value = c.value(s) || 0;
      let done = claimed.has(c.key);
      if (!done && value >= c.target) {
        try {
          await q().query('INSERT INTO challenge_claims (user_id, week, challenge) VALUES (?, ?, ?)', [req.user.id, week.start, c.key]);
          await q().query('UPDATE user_stats SET xp_points = xp_points + ? WHERE user_id = ?', [c.xp, req.user.id]).catch(() => {});
          await notify(req.user.id, { title: `Challenge complete: ${c.title}`, message: `+${c.xp} XP. Nice work this week!`, link: '/challenges', type: 'challenge' });
          newlyDone.push(c.key);
          done = true;
        } catch { done = true; /* claimed in parallel */ }
      }
      list.push({ key: c.key, title: c.title, icon: c.icon, target: c.target, unit: c.unit || '', xp: c.xp, value: Math.min(value, c.target), done });
    }
    const completed = list.filter((c) => c.done).length;
    res.json({ week: { start: week.start, end: week.end, days_left: week.daysLeft }, challenges: list, newly_done: newlyDone, points: s.points + (newlyDone.length * 50), completed });
  } catch (err) {
    console.error('[community] challenges', err.message);
    res.status(500).json({ message: 'Could not load challenges.' });
  }
});

router.get('/leaderboard', auth, async (req, res) => {
  try {
    const scope = String(req.query.scope || 'friends');
    const week = await weekOf(req.user.id);
    let ids = [];
    let anonymise = false;
    if (scope === 'friends') {
      const [g] = await q().query('SELECT DISTINCT b.user_id FROM group_members a JOIN group_members b ON b.group_id = a.group_id WHERE a.user_id = ?', [req.user.id]);
      const [bd] = await q().query('SELECT requester_id, addressee_id FROM buddies WHERE status = ? AND (requester_id = ? OR addressee_id = ?)', ['active', req.user.id, req.user.id]);
      ids = [req.user.id, ...g.map((r) => r.user_id), ...bd.map((b) => (b.requester_id === req.user.id ? b.addressee_id : b.requester_id))];
    } else if (scope.startsWith('group:')) {
      const gid = parseInt(scope.slice(6), 10);
      if (!(await membership(gid, req.user.id))) return res.status(404).json({ message: 'Group not found.' });
      const [m] = await q().query('SELECT user_id FROM group_members WHERE group_id = ?', [gid]);
      ids = m.map((r) => r.user_id);
    } else if (scope === 'everyone') {
      const [m] = await q().query('SELECT user_id FROM user_settings WHERE leaderboard_public = 1 LIMIT 1000');
      ids = m.map((r) => r.user_id);
      anonymise = true;
    } else {
      return res.status(400).json({ message: 'Unknown leaderboard.' });
    }
    ids = [...new Set(ids)];
    const stats = await weekStats(ids, week.start);
    const [users] = ids.length ? await q().query('SELECT id, name FROM users WHERE id IN (?)', [ids]) : [[]];
    const names = new Map(users.map((u) => [u.id, u.name]));
    const rows = ids.map((id) => ({ id, ...stats.get(id) }))
      .filter((r) => r.points > 0 || r.id === req.user.id)
      .sort((a, b) => b.points - a.points)
      .map((r, i) => ({
        rank: i + 1, me: r.id === req.user.id, name: anonymise ? shortName(names.get(r.id)) : (names.get(r.id) || 'Member'),
        points: r.points, tasks: r.tasks, focus: r.focus, reviews: r.reviews, challenges: r.challenges,
      }));
    const [[opt]] = await q().query('SELECT leaderboard_public FROM user_settings WHERE user_id = ?', [req.user.id]);
    res.json({ scope, week: { start: week.start, days_left: week.daysLeft }, rows: rows.slice(0, 50), me: rows.find((r) => r.me) || null, public: !!opt?.leaderboard_public });
  } catch (err) {
    console.error('[community] leaderboard', err.message);
    res.status(500).json({ message: 'Could not load the leaderboard.' });
  }
});

router.put('/leaderboard/opt-in', auth, async (req, res) => {
  try {
    await q().query('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [req.user.id]).catch(() => {});
    await q().query('UPDATE user_settings SET leaderboard_public = ? WHERE user_id = ?', [req.body.public ? 1 : 0, req.user.id]);
    res.json({ message: req.body.public ? 'You’re on the public leaderboard (first name + initial only).' : 'You’re off the public leaderboard.' });
  } catch (err) {
    res.status(500).json({ message: 'Could not save.' });
  }
});

module.exports = router;
module.exports.deleteGroup = deleteGroup;
