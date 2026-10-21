// Pulls real job postings from free, public job APIs and stores them in `jobs`.
// Sources (all public, no API key):
//   - Remotive    https://remotive.com/api/remote-jobs       (attribution + link back required)
//   - Arbeitnow   https://www.arbeitnow.com/api/job-board-api
//   - The Muse    https://www.themuse.com/api/public/jobs
//   - Greenhouse  company boards: https://boards-api.greenhouse.io/v1/boards/{board}/jobs
//   - Lever       company boards: https://api.lever.co/v0/postings/{company}
// Configure in backend/.env:
//   JOB_SOURCES=remotive,arbeitnow,themuse,greenhouse,lever
//   GREENHOUSE_BOARDS=stripe,airbnb,figma      (company board tokens)
//   LEVER_COMPANIES=netflix,palantir
//   JOB_REFRESH_HOURS=6
const db = require('../db');
const { extractSkills } = require('./skills');
require('dotenv').config();

const q = () => db.promise();
const UA = { 'User-Agent': 'LearnMap job board (learning platform)', Accept: 'application/json' };

const DEFAULT_GREENHOUSE = ['stripe', 'airbnb', 'figma', 'discord', 'robinhood', 'duolingo', 'gitlab', 'dropbox'];
const DEFAULT_LEVER = ['palantir', 'spotify'];

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/\n\s*\n(\s*•)/g, '\n$1')
    .trim()
    .slice(0, 20000);
}

const isRemote = (...parts) => /remote|anywhere|worldwide|work from home/i.test(parts.filter(Boolean).join(' '));

async function getJSON(url, timeoutMs = 20000) {
  if (typeof fetch !== 'function') throw new Error('This Node.js version has no fetch — use Node 18 or newer.');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* ---------- Source adapters → common shape ---------- */
async function fromRemotive() {
  const data = await getJSON('https://remotive.com/api/remote-jobs?limit=150');
  return (data.jobs || []).map((j) => ({
    source: 'remotive', external_id: String(j.id), title: j.title, company: j.company_name,
    location: j.candidate_required_location || 'Remote', remote: 1, url: j.url, description: stripHtml(j.description),
    salary: j.salary || null, job_type: j.job_type ? String(j.job_type).replace(/_/g, ' ') : null, posted_at: j.publication_date ? new Date(j.publication_date) : null,
    tags: j.tags || [],
  }));
}

async function fromArbeitnow() {
  const data = await getJSON('https://www.arbeitnow.com/api/job-board-api');
  return (data.data || []).map((j) => ({
    source: 'arbeitnow', external_id: String(j.slug), title: j.title, company: j.company_name,
    location: j.location || (j.remote ? 'Remote' : null), remote: j.remote ? 1 : 0, url: j.url, description: stripHtml(j.description),
    salary: null, job_type: (j.job_types || []).join(', ') || null, posted_at: j.created_at ? new Date(j.created_at * 1000) : null,
    tags: j.tags || [],
  }));
}

async function fromTheMuse() {
  const out = [];
  for (const page of [0, 1]) {
    const data = await getJSON(`https://www.themuse.com/api/public/jobs?page=${page}&category=Software%20Engineering&category=Data%20and%20Analytics&category=IT`);
    for (const j of data.results || []) {
      const loc = (j.locations || []).map((l) => l.name).join(' · ');
      out.push({
        source: 'themuse', external_id: String(j.id), title: j.name, company: j.company && j.company.name,
        location: loc || null, remote: isRemote(loc) ? 1 : 0, url: j.refs && j.refs.landing_page, description: stripHtml(j.contents),
        salary: null, job_type: (j.levels || []).map((l) => l.name).join(', ') || null,
        posted_at: j.publication_date ? new Date(j.publication_date) : null, tags: [],
      });
    }
  }
  return out;
}

async function fromGreenhouse() {
  const boards = (process.env.GREENHOUSE_BOARDS || DEFAULT_GREENHOUSE.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const board of boards) {
    try {
      const data = await getJSON(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
      const company = board.charAt(0).toUpperCase() + board.slice(1);
      const jobs = (data.jobs || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 60);
      for (const j of jobs) {
        const loc = j.location && j.location.name;
        out.push({
          source: 'greenhouse', external_id: `${board}-${j.id}`, title: j.title, company: (j.company_name || company),
          location: loc || null, remote: isRemote(loc, j.title) ? 1 : 0, url: j.absolute_url, description: stripHtml(j.content),
          salary: null, job_type: null, posted_at: j.updated_at ? new Date(j.updated_at) : null, tags: [],
        });
      }
    } catch (err) {
      console.warn(`[jobs] Greenhouse board "${board}" skipped: ${err.message}`);
    }
  }
  return out;
}

async function fromLever() {
  const companies = (process.env.LEVER_COMPANIES || DEFAULT_LEVER.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const c of companies) {
    try {
      const data = await getJSON(`https://api.lever.co/v0/postings/${encodeURIComponent(c)}?mode=json`);
      for (const j of (Array.isArray(data) ? data : []).slice(0, 60)) {
        const loc = j.categories && (j.categories.location || (j.categories.allLocations || []).join(' · '));
        const lists = (j.lists || []).map((l) => `${l.text}\n${stripHtml(l.content)}`).join('\n\n');
        out.push({
          source: 'lever', external_id: `${c}-${j.id}`, title: j.text, company: c.charAt(0).toUpperCase() + c.slice(1),
          location: loc || null, remote: isRemote(loc, j.workplaceType) ? 1 : 0, url: j.hostedUrl,
          description: `${j.descriptionPlain || stripHtml(j.description)}\n\n${lists}`.trim().slice(0, 20000),
          salary: null, job_type: j.categories && j.categories.commitment, posted_at: j.createdAt ? new Date(j.createdAt) : null, tags: [],
        });
      }
    } catch (err) {
      console.warn(`[jobs] Lever company "${c}" skipped: ${err.message}`);
    }
  }
  return out;
}

const ADAPTERS = { remotive: fromRemotive, arbeitnow: fromArbeitnow, themuse: fromTheMuse, greenhouse: fromGreenhouse, lever: fromLever };

async function saveJobs(list) {
  let saved = 0;
  for (const j of list) {
    if (!j.title || !j.external_id) continue;
    const skills = extractSkills(`${j.title}\n${(j.tags || []).join(', ')}\n${j.description || ''}`);
    try {
      await q().query(
        `INSERT INTO jobs (source, external_id, title, company, location, remote, url, description, salary, job_type, skills, posted_at, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE title = VALUES(title), company = VALUES(company), location = VALUES(location), remote = VALUES(remote),
           url = VALUES(url), description = VALUES(description), salary = VALUES(salary), job_type = VALUES(job_type),
           skills = VALUES(skills), posted_at = VALUES(posted_at), fetched_at = CURRENT_TIMESTAMP`,
        [j.source, j.external_id.slice(0, 191), String(j.title).slice(0, 300), j.company ? String(j.company).slice(0, 200) : null,
          j.location ? String(j.location).slice(0, 255) : null, j.remote ? 1 : 0, j.url ? String(j.url).slice(0, 1000) : null,
          j.description || null, j.salary ? String(j.salary).slice(0, 120) : null, j.job_type ? String(j.job_type).slice(0, 60) : null,
          JSON.stringify(skills), j.posted_at && !isNaN(j.posted_at) ? j.posted_at : null]
      );
      saved++;
    } catch (err) {
      console.warn('[jobs] could not save a job:', err.message);
    }
  }
  return saved;
}

let running = null;
let lastRun = 0;

/** Fetch every enabled source. Returns { saved, perSource }. Only one refresh runs at a time. */
async function refreshJobs() {
  if (running) return running;
  running = (async () => {
    const enabled = (process.env.JOB_SOURCES || 'remotive,arbeitnow,themuse,greenhouse,lever').split(',').map((s) => s.trim()).filter((s) => ADAPTERS[s]);
    const perSource = {};
    let saved = 0;
    for (const name of enabled) {
      try {
        const list = await ADAPTERS[name]();
        const n = await saveJobs(list);
        perSource[name] = n;
        saved += n;
      } catch (err) {
        perSource[name] = `error: ${err.message}`;
        console.warn(`[jobs] ${name} failed: ${err.message}`);
      }
    }
    // Drop board jobs that are over 45 days old and nobody saved or applied to.
    await q().query(
      `DELETE FROM jobs WHERE user_id IS NULL AND fetched_at < ? AND id NOT IN (SELECT job_id FROM job_applications WHERE job_id IS NOT NULL)`,
      [new Date(Date.now() - 45 * 86400000)]
    ).catch(() => {});
    lastRun = Date.now();
    console.log(`[jobs] Refreshed: ${saved} jobs (${Object.entries(perSource).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
    return { saved, perSource };
  })().finally(() => { running = null; });
  return running;
}

/** Refresh on start (if stale) and every JOB_REFRESH_HOURS. */
function scheduleJobRefresh() {
  const hours = Math.max(1, Number(process.env.JOB_REFRESH_HOURS) || 6);
  const tick = async () => {
    try {
      const [rows] = await q().query('SELECT MAX(fetched_at) AS last FROM jobs WHERE user_id IS NULL');
      const last = rows[0] && rows[0].last ? new Date(rows[0].last).getTime() : 0;
      if (Date.now() - last > hours * 3600000) await refreshJobs();
    } catch (err) {
      console.warn('[jobs] scheduled refresh skipped:', err.message);
    }
  };
  setTimeout(tick, 8000);
  setInterval(tick, 30 * 60 * 1000).unref();
}

module.exports = { refreshJobs, scheduleJobRefresh, saveJobs, stripHtml, lastRefresh: () => lastRun };
