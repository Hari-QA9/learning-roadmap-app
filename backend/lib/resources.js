// Turns the AI's resource suggestions into links that actually work:
//   1. { libraryId }  → a hand-picked resource from resourceLibrary.js (always a real page)
//   2. { url }        → an exact page the AI named; kept only if it loads (checked with a quick request)
//   3. video          → a real YouTube video when YOUTUBE_API_KEY is set, otherwise a YouTube search
//   4. anything else  → a search on the named site, clearly labelled as a search
require('dotenv').config();
const { BY_ID } = require('./resourceLibrary');

const enc = encodeURIComponent;
const TYPES = ['video', 'docs', 'article', 'course', 'practice', 'book', 'tool'];
const domainOf = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

function searchLink(r = {}) {
  const query = String(r.query || r.title || '').trim();
  const site = domainOf(r.site);
  const kind = String(r.type || '').toLowerCase();
  if (kind === 'video' || site.includes('youtube')) return { url: `https://www.youtube.com/results?search_query=${enc(query)}`, kind: 'search', source: 'YouTube search' };
  if (site) return { url: `https://www.google.com/search?q=${enc(`site:${site} ${query}`)}`, kind: 'search', source: site };
  return { url: `https://www.google.com/search?q=${enc(query)}`, kind: 'search', source: 'Web search' };
}

/* ---------- Link checks (cached for the life of the server) ---------- */
const checked = new Map(); // url -> Promise<boolean>
async function urlWorks(url) {
  if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) return false;
  if (checked.has(url)) return checked.get(url);
  const p = (async () => {
    if (typeof fetch !== 'function') return false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Learnvoy link check)' } });
      // Some sites don't allow HEAD; try a normal request before giving up.
      if (res.status === 405 || res.status === 403 || res.status === 400) res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Learnvoy link check)' } });
      return res.status < 400;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  })();
  checked.set(url, p);
  return p;
}

/* ---------- YouTube (optional) ---------- */
const videoCache = new Map();
async function findVideo(query) {
  const key = (process.env.YOUTUBE_API_KEY || '').trim();
  if (!key || !query || typeof fetch !== 'function') return null;
  if (videoCache.has(query)) return videoCache.get(query);
  const p = (async () => {
    try {
      const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&relevanceLanguage=en&safeSearch=strict&videoEmbeddable=true&q=${enc(query)}&key=${enc(key)}`;
      const res = await fetch(u);
      if (!res.ok) return null;
      const item = ((await res.json()).items || [])[0];
      if (!item || !item.id || !item.id.videoId) return null;
      return { url: `https://www.youtube.com/watch?v=${item.id.videoId}`, title: decodeEntities(item.snippet.title), channel: item.snippet.channelTitle };
    } catch {
      return null;
    }
  })();
  videoCache.set(query, p);
  return p;
}
const decodeEntities = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Resolve one suggestion. Always returns something that opens. */
async function resolveOne(r = {}) {
  const type = TYPES.includes(String(r.type).toLowerCase()) ? String(r.type).toLowerCase() : 'article';
  const lib = r.libraryId && BY_ID.get(String(r.libraryId).trim());
  if (lib) {
    return { title: String(r.title || lib.title).slice(0, 160), type: lib.type, source: lib.source, url: lib.url, kind: 'direct', free: true, note: r.why ? String(r.why).slice(0, 200) : undefined };
  }
  const base = { title: String(r.title || r.query || 'Resource').slice(0, 160), type, note: r.why ? String(r.why).slice(0, 200) : undefined };
  if (r.url && await urlWorks(String(r.url).trim())) {
    return { ...base, url: String(r.url).trim(), source: domainOf(r.url), kind: 'direct', free: r.free !== false };
  }
  if (type === 'video') {
    const v = await findVideo(String(r.query || r.title || ''));
    if (v) return { ...base, title: v.title.slice(0, 160), url: v.url, source: v.channel ? `YouTube · ${v.channel}` : 'YouTube', kind: 'video', free: true };
  }
  return { ...base, ...searchLink(r), free: true };
}

/** Resolve a list (max 4), dropping duplicates. */
async function resolveResources(list, max = 4) {
  const items = (Array.isArray(list) ? list : []).filter((r) => r && (r.title || r.query || r.libraryId || r.url)).slice(0, max + 2);
  const out = await Promise.all(items.map((r) => resolveOne(r)));
  const seen = new Set();
  return out.filter((r) => { const k = r.url; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, max);
}

module.exports = { resolveResources, resolveOne, searchLink, urlWorks };
