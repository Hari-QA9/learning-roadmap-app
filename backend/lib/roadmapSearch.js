// Meaning-based search and "similar roadmaps" for Explore, using embeddings (lib/embeddings.js).
// "get into data science" finds "Python for analytics" even with no words in common.
// Only roadmaps their owners listed on Explore are ever searched or suggested.
const db = require('../db');
const E = require('./embeddings');

const q = () => db.promise();
const RELATED = () => (Number(process.env.ML_SIM_LOW) || 0.55) + 0.1; // "clearly related" cut-off

/** Listed roadmaps with the text that describes them (title, description, goal, module titles). */
async function listedRoadmaps() {
  const [rows] = await q().query('SELECT id, title, description, goal FROM roadmaps WHERE share_slug IS NOT NULL AND listed = 1 ORDER BY copies DESC, id DESC LIMIT 2000');
  if (!rows.length) return [];
  const [mods] = await q().query('SELECT roadmap_id, title FROM modules WHERE roadmap_id IN (?) ORDER BY order_index, id', [rows.map((r) => r.id)]);
  const byRoadmap = new Map();
  for (const m of mods) { if (!byRoadmap.has(m.roadmap_id)) byRoadmap.set(m.roadmap_id, []); byRoadmap.get(m.roadmap_id).push(m.title); }
  return rows.map((r) => ({
    id: r.id,
    text: [r.title, r.description, r.goal && `Goal: ${r.goal}`, (byRoadmap.get(r.id) || []).length && `Modules: ${byRoadmap.get(r.id).slice(0, 20).join('; ')}`].filter(Boolean).join('\n'),
  }));
}

async function vectors() {
  const items = await listedRoadmaps();
  return E.vectorsFor('roadmap', items, { task: 'RETRIEVAL_DOCUMENT' });
}

// Searches cost an API call each — keep anonymous visitors to a sensible number.
const perIp = new Map();
function allow(ip) {
  const now = Date.now();
  const list = (perIp.get(ip) || []).filter((t) => t > now - 3600000);
  if (list.length >= 60) return false;
  list.push(now); perIp.set(ip, list);
  if (perIp.size > 5000) perIp.delete(perIp.keys().next().value);
  return true;
}

/** Roadmap ids ranked by meaning for a search, best first: [{ id, score }] — or null when unavailable. */
async function search(term, ip) {
  if (!E.enabled() || !allow(ip || 'anon')) return null;
  const qv = await E.embedText(term, 'RETRIEVAL_QUERY');
  if (!qv) return null;
  const vecs = await vectors();
  return [...vecs].map(([id, v]) => ({ id, score: E.cosine(qv, v) })).filter((x) => x.score >= RELATED() - 0.05).sort((a, b) => b.score - a.score);
}

/** The listed roadmaps closest in meaning to this one: [{ id, score }]. */
async function similar(roadmapId, n = 3) {
  if (!E.enabled()) return [];
  const vecs = await vectors();
  let me = vecs.get(Number(roadmapId));
  if (!me) {
    // Not listed itself (e.g. your own private roadmap) — embed it on the fly.
    const [[r]] = await q().query('SELECT id, title, description, goal FROM roadmaps WHERE id = ?', [roadmapId]);
    if (!r) return [];
    const [mods] = await q().query('SELECT title FROM modules WHERE roadmap_id = ? ORDER BY order_index, id LIMIT 20', [r.id]);
    const text = [r.title, r.description, r.goal && `Goal: ${r.goal}`, mods.length && `Modules: ${mods.map((m) => m.title).join('; ')}`].filter(Boolean).join('\n');
    me = (await E.vectorsFor('roadmap', [{ id: r.id, text }], { task: 'RETRIEVAL_DOCUMENT' })).get(r.id);
    if (!me) return [];
  }
  return [...vecs].filter(([id]) => id !== Number(roadmapId))
    .map(([id, v]) => ({ id, score: E.cosine(me, v) }))
    .filter((x) => x.score >= RELATED() && x.score < 0.985) // skip copies of the very same roadmap
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

module.exports = { search, similar };
