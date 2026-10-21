// Pulls real job postings from public job APIs and stores them in `jobs`.
//
// Free, no key needed:
//   - Remotive    https://remotive.com/api/remote-jobs       (attribution + link back required)
//   - Arbeitnow   https://www.arbeitnow.com/api/job-board-api
//   - The Muse    https://www.themuse.com/api/public/jobs
//   - Greenhouse  company boards  boards-api.greenhouse.io/v1/boards/{company}/jobs
//   - Lever       company boards  api.lever.co/v0/postings/{company}
//   - Ashby       company boards  api.ashbyhq.com/posting-api/job-board/{company}
// Free with a key (turn on by adding the key to backend/.env):
//   - Adzuna      ADZUNA_APP_ID + ADZUNA_APP_KEY     (developer.adzuna.com)
//   - USAJobs     USAJOBS_API_KEY + USAJOBS_EMAIL    (developer.usajobs.gov)
// Paid (optional, adds LinkedIn / Indeed / Glassdoor listings via Google for Jobs):
//   - JSearch     JSEARCH_API_KEY                    (RapidAPI / OpenWeb Ninja)
//
// See backend/.env.example for every setting.
const db = require('../db');
const { extractSkills } = require('./skills');
require('dotenv').config();

const q = () => db.promise();
const env = (k, d = '') => (process.env[k] || d).trim();
const list = (k, d) => env(k, d.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

// Company job boards read by default. Add or replace with GREENHOUSE_BOARDS / LEVER_COMPANIES / ASHBY_COMPANIES.
// A name that doesn't exist (or moved to another system) is simply skipped.
const DEFAULT_GREENHOUSE = [
  'stripe', 'airbnb', 'figma', 'discord', 'robinhood', 'duolingo', 'gitlab', 'dropbox', 'coinbase', 'databricks',
  'cloudflare', 'datadog', 'instacart', 'lyft', 'pinterest', 'reddit', 'twilio', 'mongodb', 'elastic', 'okta',
  'affirm', 'asana', 'brex', 'chime', 'gusto', 'roblox', 'samsara', 'squarespace', 'toast', 'vercel',
  'webflow', 'grammarly', 'airtable', 'flexport', 'nuro', 'scaleai', 'anduril', 'betterment', 'oscar',
  // Biotech, health and science
  'ginkgobioworks', '10xgenomics', 'recursionpharmaceuticals', 'tempus', 'benchling', 'insitro', 'grail', 'zocdoc', 'hims',
];
const DEFAULT_LEVER = ['palantir', 'spotify', 'plaid', 'mistral', 'zoox', 'whoop', 'attentive'];
const DEFAULT_ASHBY = ['ramp', 'notion', 'openai', 'linear', 'vanta', 'replit', 'supabase', 'posthog', 'retool', 'deel', 'abridge'];

// Search terms for the keyword-based sources (Adzuna, USAJobs, JSearch): the roles members actually want,
// topped up with a broad mix across fields so the board isn't only tech.
const DEFAULT_QUERIES = [
  'software engineer', 'data analyst', 'research associate', 'lab technician', 'registered nurse', 'accountant',
  'financial analyst', 'marketing coordinator', 'mechanical engineer', 'civil engineer', 'teacher', 'project coordinator',
];
// The Muse job categories (all fields).
const DEFAULT_MUSE = [
  'Software Engineering', 'Data and Analytics', 'IT', 'Science and Engineering', 'Healthcare', 'Accounting and Finance',
  'Marketing', 'Design and UX', 'Education', 'Project Management', 'Sales', 'Business Operations', 'Human Resources and Recruitment',
];

/** Members' most-wanted target roles first, then the defaults (or JOB_QUERIES). */
async function searchTerms(max) {
  const counts = new Map();
  try {
    const [rows] = await q().query('SELECT target_roles FROM career_profiles WHERE target_roles IS NOT NULL');
    for (const r of rows) {
      let roles = [];
      try { roles = JSON.parse(r.target_roles) || []; } catch { /* ignore */ }
      for (const role of roles) {
        const k = String(role).trim().toLowerCase().replace(/\s+/g, ' ');
        if (k.length >= 3 && k.length <= 60) counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
  } catch { /* table may not exist yet */ }
  const fromMembers = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const base = list('JOB_QUERIES', DEFAULT_QUERIES).map((x) => x.toLowerCase());
  return [...new Set([...fromMembers, ...base])].slice(0, max);
}

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
const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const money = (min, max, per) => {
  const f = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);
  if (!min && !max) return null;
  const range = min && max && Math.round(min) !== Math.round(max) ? `${f(min)}–${f(max)}` : f(min || max);
  return per ? `${range} / ${String(per).toLowerCase().replace(/^per\s+/, '')}` : range;
};
// "FullTime", "FULLTIME", "full_time" → "full-time"
const jobType = (t) => (t ? String(t).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase()
  .replace(/\bfull ?time\b/g, 'full-time').replace(/\bpart ?time\b/g, 'part-time') : null);

async function getJSON(url, { headers = {}, timeoutMs = 20000 } = {}) {
  if (typeof fetch !== 'function') throw new Error('This Node.js version has no fetch — use Node 18 or newer.');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'LearnMap job board', Accept: 'application/json', ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Run `fn` over items, a few at a time, collecting results and skipped names. */
async function eachLimited(items, limit, fn) {
  const out = [];
  const skipped = [];
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const item = items[i++];
      try { out.push(...(await fn(item))); } catch { skipped.push(item); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return { out, skipped };
}

/* ---------- Free sources ---------- */
async function fromRemotive() {
  const data = await getJSON('https://remotive.com/api/remote-jobs?limit=150');
  return (data.jobs || []).map((j) => ({
    source: 'remotive', external_id: String(j.id), title: j.title, company: j.company_name,
    location: j.candidate_required_location || 'Remote', remote: 1, url: j.url, description: stripHtml(j.description),
    salary: j.salary || null, job_type: jobType(j.job_type),
    posted_at: j.publication_date ? new Date(j.publication_date) : null, tags: j.tags || [],
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
  const cats = list('MUSE_CATEGORIES', DEFAULT_MUSE).map((c) => `category=${encodeURIComponent(c)}`).join('&');
  for (const page of [0, 1, 2, 3, 4]) {
    const data = await getJSON(`https://www.themuse.com/api/public/jobs?page=${page}&${cats}`);
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
  const boards = [...new Set(list('GREENHOUSE_BOARDS', DEFAULT_GREENHOUSE))];
  const { out, skipped } = await eachLimited(boards, 6, async (board) => {
    const data = await getJSON(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
    const jobs = (data.jobs || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 60);
    return jobs.map((j) => {
      const loc = j.location && j.location.name;
      return {
        source: 'greenhouse', external_id: `${board}-${j.id}`, title: j.title, company: j.company_name || titleCase(board),
        location: loc || null, remote: isRemote(loc, j.title) ? 1 : 0, url: j.absolute_url, description: stripHtml(j.content),
        salary: null, job_type: null, posted_at: j.updated_at ? new Date(j.updated_at) : null, tags: [],
      };
    });
  });
  if (skipped.length) console.warn(`[jobs] Greenhouse boards not found (skipped): ${skipped.join(', ')}`);
  return out;
}

async function fromLever() {
  const companies = [...new Set(list('LEVER_COMPANIES', DEFAULT_LEVER))];
  const { out, skipped } = await eachLimited(companies, 6, async (c) => {
    const data = await getJSON(`https://api.lever.co/v0/postings/${encodeURIComponent(c)}?mode=json`);
    if (!Array.isArray(data)) throw new Error('not a board');
    return data.slice(0, 60).map((j) => {
      const loc = j.categories && (j.categories.location || (j.categories.allLocations || []).join(' · '));
      const lists = (j.lists || []).map((l) => `${l.text}\n${stripHtml(l.content)}`).join('\n\n');
      return {
        source: 'lever', external_id: `${c}-${j.id}`, title: j.text, company: titleCase(c),
        location: loc || null, remote: isRemote(loc, j.workplaceType) ? 1 : 0, url: j.hostedUrl,
        description: `${j.descriptionPlain || stripHtml(j.description)}\n\n${lists}`.trim().slice(0, 20000),
        salary: null, job_type: j.categories && j.categories.commitment, posted_at: j.createdAt ? new Date(j.createdAt) : null, tags: [],
      };
    });
  });
  if (skipped.length) console.warn(`[jobs] Lever companies not found (skipped): ${skipped.join(', ')}`);
  return out;
}

async function fromAshby() {
  const companies = [...new Set(list('ASHBY_COMPANIES', DEFAULT_ASHBY))];
  const { out, skipped } = await eachLimited(companies, 6, async (c) => {
    const data = await getJSON(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c)}?includeCompensation=true`);
    return (data.jobs || [])
      .filter((j) => j.isListed !== false)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 60)
      .map((j) => ({
        source: 'ashby', external_id: `${c}-${j.id}`, title: j.title, company: titleCase(c),
        location: j.location || null, remote: j.isRemote || isRemote(j.location) ? 1 : 0, url: j.jobUrl || j.applyUrl,
        description: j.descriptionPlain || stripHtml(j.descriptionHtml),
        salary: (j.compensation && j.compensation.compensationTierSummary) || null, job_type: jobType(j.employmentType),
        posted_at: j.publishedAt ? new Date(j.publishedAt) : null, tags: [],
      }));
  });
  if (skipped.length) console.warn(`[jobs] Ashby companies not found (skipped): ${skipped.join(', ')}`);
  return out;
}

/* ---------- Free with a key ---------- */
async function fromAdzuna() {
  const id = env('ADZUNA_APP_ID');
  const key = env('ADZUNA_APP_KEY');
  if (!id || !key) return null; // not configured
  const country = env('ADZUNA_COUNTRY', 'us');
  const { out, skipped } = await eachLimited(await searchTerms(Number(env('ADZUNA_MAX_QUERIES', '12')) || 12), 2, async (what) => {
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${encodeURIComponent(id)}&app_key=${encodeURIComponent(key)}`
      + `&results_per_page=50&max_days_old=30&what=${encodeURIComponent(what)}&content-type=application/json`;
    const data = await getJSON(url);
    return (data.results || []).map((j) => ({
      source: 'adzuna', external_id: String(j.id), title: stripHtml(j.title), company: j.company && j.company.display_name,
      location: j.location && j.location.display_name, remote: isRemote(j.title, j.description) ? 1 : 0, url: j.redirect_url,
      // Adzuna only shares a preview of the description; the full posting is on the employer's site.
      description: stripHtml(j.description),
      salary: j.salary_is_predicted === '1' ? null : money(j.salary_min, j.salary_max),
      job_type: jobType([j.contract_time, j.contract_type].filter(Boolean).join(', ')),
      posted_at: j.created ? new Date(j.created) : null, tags: j.category ? [j.category.label] : [],
    }));
  });
  if (skipped.length) console.warn(`[jobs] Adzuna searches failed: ${skipped.join(', ')}`);
  return out;
}

async function fromUSAJobs() {
  const key = env('USAJOBS_API_KEY');
  const email = env('USAJOBS_EMAIL');
  if (!key || !email) return null; // not configured
  const keywords = env('USAJOBS_KEYWORDS') ? list('USAJOBS_KEYWORDS', []) : await searchTerms(Number(env('USAJOBS_MAX_QUERIES', '8')) || 8);
  const { out } = await eachLimited(keywords, 2, async (kw) => {
    const data = await getJSON(`https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(kw)}&ResultsPerPage=100&DatePosted=30`, {
      headers: { Host: 'data.usajobs.gov', 'User-Agent': email, 'Authorization-Key': key },
    });
    const items = (data.SearchResult && data.SearchResult.SearchResultItems) || [];
    return items.map(({ MatchedObjectId, MatchedObjectDescriptor: d = {} }) => {
      const pay = (d.PositionRemuneration || [])[0] || {};
      const details = (d.UserArea && d.UserArea.Details) || {};
      return {
        source: 'usajobs', external_id: String(MatchedObjectId || d.PositionID), title: d.PositionTitle,
        company: d.OrganizationName || d.DepartmentName, location: d.PositionLocationDisplay,
        remote: isRemote(d.PositionLocationDisplay) || details.RemoteIndicator ? 1 : 0, url: (d.ApplyURI || [])[0] || d.PositionURI,
        description: [details.JobSummary, d.QualificationSummary, (details.MajorDuties || []).join('\n')].filter(Boolean).join('\n\n'),
        salary: money(Number(pay.MinimumRange), Number(pay.MaximumRange), pay.Description),
        job_type: jobType(((d.PositionSchedule || [])[0] || {}).Name),
        posted_at: d.PublicationStartDate ? new Date(d.PublicationStartDate) : null, tags: [],
      };
    });
  });
  return out;
}

/* ---------- Paid (optional) ---------- */
// JSearch reads Google for Jobs, which includes listings published on LinkedIn, Indeed, Glassdoor, ZipRecruiter…
// We keep the original publisher so members see "via LinkedIn" and apply on the original page.
async function fromJSearch() {
  const key = env('JSEARCH_API_KEY');
  if (!key) return null; // not configured
  const host = env('JSEARCH_HOST', 'jsearch.p.rapidapi.com');
  const where = env('JSEARCH_LOCATION', 'United States');
  const { out, skipped } = await eachLimited(await searchTerms(Number(env('JSEARCH_MAX_QUERIES', '4')) || 4), 2, async (query) => {
    const url = `https://${host}/search?query=${encodeURIComponent(`${query} in ${where}`)}&page=1&num_pages=1&date_posted=week`;
    const data = await getJSON(url, { headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host } });
    return (data.data || []).map((j) => {
      const loc = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ');
      return {
        source: 'jsearch', external_id: String(j.job_id), title: j.job_title, company: j.employer_name,
        publisher: j.job_publisher || null,
        location: loc || (j.job_is_remote ? 'Remote' : null), remote: j.job_is_remote ? 1 : 0, url: j.job_apply_link,
        description: j.job_description || '',
        salary: money(j.job_min_salary, j.job_max_salary, j.job_salary_period),
        job_type: jobType(j.job_employment_type),
        posted_at: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : null, tags: [],
      };
    });
  });
  if (skipped.length) console.warn(`[jobs] JSearch searches failed: ${skipped.join(', ')}`);
  return out;
}

const ADAPTERS = {
  remotive: fromRemotive, arbeitnow: fromArbeitnow, themuse: fromTheMuse, greenhouse: fromGreenhouse, lever: fromLever,
  ashby: fromAshby, adzuna: fromAdzuna, usajobs: fromUSAJobs, jsearch: fromJSearch,
};

async function saveJobs(items) {
  let saved = 0;
  for (const j of items) {
    if (!j.title || !j.external_id) continue;
    const skills = extractSkills(`${j.title}\n${(j.tags || []).join(', ')}\n${j.description || ''}`);
    try {
      await q().query(
        `INSERT INTO jobs (source, external_id, title, company, location, remote, url, description, salary, job_type, skills, posted_at, publisher, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE title = VALUES(title), company = VALUES(company), location = VALUES(location), remote = VALUES(remote),
           url = VALUES(url), description = VALUES(description), salary = VALUES(salary), job_type = VALUES(job_type),
           skills = VALUES(skills), posted_at = VALUES(posted_at), publisher = VALUES(publisher), fetched_at = CURRENT_TIMESTAMP`,
        [j.source, String(j.external_id).slice(0, 191), String(j.title).slice(0, 300), j.company ? String(j.company).slice(0, 200) : null,
          j.location ? String(j.location).slice(0, 255) : null, j.remote ? 1 : 0, j.url ? String(j.url).slice(0, 1000) : null,
          j.description || null, j.salary ? String(j.salary).slice(0, 120) : null, j.job_type ? String(j.job_type).slice(0, 60) : null,
          JSON.stringify(skills), j.posted_at && !isNaN(j.posted_at) ? j.posted_at : null, j.publisher ? String(j.publisher).slice(0, 80) : null]
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
    const enabled = list('JOB_SOURCES', Object.keys(ADAPTERS)).filter((s) => ADAPTERS[s]);
    const perSource = {};
    let saved = 0;
    for (const name of enabled) {
      try {
        const items = await ADAPTERS[name]();
        if (items === null) continue; // needs a key that isn't set
        const n = await saveJobs(items);
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
