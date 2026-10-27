// Import: turn a YouTube playlist, a course syllabus, or your own notes into a roadmap.
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const { generateJSON, sendAIError } = require('../lib/gemini');
const { insertTask } = require('../lib/tasks');

const q = () => db.promise();
const importLimit = rateLimit({ max: 10, name: 'imports' });
const clean = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const TYPES = ['learn', 'practice', 'build', 'review'];

/** The playlist id from a YouTube URL (or a bare id). */
function playlistId(input) {
  const s = String(input || '').trim();
  try {
    const u = new URL(s);
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
    return u.searchParams.get('list');
  } catch {
    return /^[A-Za-z0-9_-]{12,64}$/.test(s) ? s : null;
  }
}

async function youtubePlaylist(id) {
  const key = (process.env.YOUTUBE_API_KEY || '').trim();
  if (!key) {
    const e = new Error('Importing YouTube playlists needs a free YouTube API key on the server (see TODO.md → YouTube). For now, paste the video titles into “Syllabus or notes”.');
    e.status = 400;
    throw e;
  }
  const get = async (url) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) { const e = new Error(r.status === 404 ? 'That playlist wasn’t found. Is it public?' : `YouTube said HTTP ${r.status}.`); e.status = 400; throw e; }
    return r.json();
  };
  const info = await get(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`);
  const title = info.items?.[0]?.snippet?.title;
  if (!title) { const e = new Error('That playlist wasn’t found. Is it public?'); e.status = 400; throw e; }
  const videos = [];
  let pageToken = '';
  for (let i = 0; i < 4; i++) { // up to 200 videos
    const page = await get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${pageToken}` : ''}`);
    for (const it of page.items || []) {
      const vid = it.snippet?.resourceId?.videoId;
      const t = it.snippet?.title;
      if (vid && t && !/^(private|deleted) video$/i.test(t)) videos.push({ title: t, url: `https://www.youtube.com/watch?v=${vid}&list=${id}` });
    }
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }
  if (!videos.length) { const e = new Error('That playlist has no public videos.'); e.status = 400; throw e; }
  return { title, channel: info.items[0].snippet.channelTitle || '', videos };
}

router.post('/roadmap', auth, importLimit, async (req, res) => {
  const b = req.body || {};
  const hours = Math.min(60, Math.max(1, parseInt(b.hoursPerWeek, 10) || 6));
  try {
    let material = '';
    let videos = [];
    let sourceTitle = clean(b.title, 160);
    if (b.source === 'youtube') {
      const id = playlistId(b.url);
      if (!id) return res.status(400).json({ message: 'Paste a YouTube playlist link (it contains “list=”).' });
      const pl = await youtubePlaylist(id);
      videos = pl.videos;
      sourceTitle = sourceTitle || pl.title;
      material = `YouTube playlist "${pl.title}"${pl.channel ? ` by ${pl.channel}` : ''}. Videos in order:\n${videos.map((v, i) => `${i + 1}. ${v.title}`).join('\n')}`;
    } else {
      const text = String(b.text || '').trim();
      if (text.length < 40) return res.status(400).json({ message: 'Paste a bit more — a syllabus, course outline, table of contents or notes.' });
      material = `${sourceTitle ? `Title: ${sourceTitle}\n` : ''}Material (a syllabus, course outline, table of contents, or the learner's notes):\n${text.slice(0, 20000)}`;
    }

    const data = await generateJSON(`Turn this material into a structured learning roadmap that a learner can tick off step by step.
${material}

The learner has about ${hours} hours per week.
Rules:
- Follow the material's own order and topics; group it into 3–10 modules (weeks or units).
- ${videos.length ? `Every video should appear as a task, in order. Set "video" to the video's number from the list (1-based). You may add a short practice or review task after a group of videos (with "video": null).` : 'Create concrete tasks (learn / practice / build / review) for each topic. Add a review task at the end of each module.'}
- Task titles are short and actionable. Estimate minutes realistically.
Return JSON:
{ "title": "roadmap title", "description": "one sentence", "duration": "e.g. 6 weeks",
  "modules": [ { "title": "string", "summary": "one sentence", "tasks": [ { "title": "string", "type": "learn|practice|build|review", "est_minutes": 30, "instructions": "one or two sentences", "video": null } ] } ] }`);

    const modules = (Array.isArray(data.modules) ? data.modules : []).filter((m) => m && m.title && Array.isArray(m.tasks) && m.tasks.length).slice(0, 15);
    if (!modules.length) throw new Error('The AI response was not valid JSON. Please try again.');
    // Make sure no video is left out, even if the AI skipped some.
    if (videos.length) {
      const used = new Set(modules.flatMap((m) => m.tasks.map((t) => Number(t.video)).filter(Boolean)));
      const missing = videos.map((v, i) => i + 1).filter((n) => !used.has(n));
      if (missing.length) modules[modules.length - 1].tasks.push(...missing.map((n) => ({ title: videos[n - 1].title, type: 'learn', video: n, est_minutes: 15 })));
    }

    const title = clean(data.title, 200) || sourceTitle || 'Imported roadmap';
    const [r] = await q().query('INSERT INTO roadmaps (user_id, title, description, duration, status) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title, clean(data.description, 500), clean(data.duration, 60) || null, 'active']);
    const roadmapId = r.insertId;
    await q().query('UPDATE roadmaps SET details = ? WHERE id = ?', [JSON.stringify({ version: 2, imported_from: b.source === 'youtube' ? 'youtube' : 'text', hours_per_week: hours }), roadmapId]).catch(() => {});
    let taskCount = 0;
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      const [mi] = await q().query('INSERT INTO modules (roadmap_id, title, description, position, order_index) VALUES (?, ?, ?, ?, ?)',
        [roadmapId, clean(m.title, 250), clean(m.summary, 1000), i, i]);
      for (let j = 0; j < m.tasks.length && taskCount < 400; j++, taskCount++) {
        const t = m.tasks[j];
        const video = videos[Number(t.video) - 1];
        await insertTask({
          userId: req.user.id, roadmapId, moduleId: mi.insertId, title: clean(t.title || video?.title, 250) || 'Task', description: clean(t.instructions, 1000),
          position: j, taskType: TYPES.includes(t.type) ? t.type : 'learn', estMinutes: Math.min(600, Math.max(5, parseInt(t.est_minutes, 10) || 20)),
          details: video ? { resources: [{ title: video.title, url: video.url, type: 'video' }] } : null,
        });
      }
    }
    if (videos.length) {
      await q().query('INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)',
        [roadmapId, `Playlist: ${sourceTitle}`.slice(0, 255), `https://www.youtube.com/playlist?list=${playlistId(b.url)}`, 'video', 1]).catch(() => {});
    }
    await q().query('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [req.user.id, 'Imported Roadmap', `Imported: ${title}`]).catch(() => {});
    res.json({ roadmapId, title, modules: modules.length, tasks: taskCount });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    sendAIError(res, err, 'Could not import this. Please try again.');
  }
});

module.exports = router;
module.exports.playlistId = playlistId;
