// Smart job matching: blends the keyword skill match (lib/skills.js matchJob) with how close in
// *meaning* a job post is to what the member is looking for (embeddings, lib/embeddings.js).
// Keyword matching alone misses "React" ↔ "frontend engineer" or "patient care" ↔ "nursing";
// the meaning-based score catches those. Without embeddings it's keyword matching as before.
const db = require('../db');
const E = require('./embeddings');

const q = () => db.promise();
const parse = (v, d) => { if (!v) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };
// Cosine similarity → 0–100. Unrelated texts land around LOW, very close ones around HIGH.
const LOW = () => Number(process.env.ML_SIM_LOW) || 0.55;
const HIGH = () => Number(process.env.ML_SIM_HIGH) || 0.85;
const KEYWORD_WEIGHT = 0.5;

function profileText(profile) {
  const roles = (profile.target_roles || []).join(', ');
  const skills = (profile.skills || []).join(', ');
  if (!roles && !skills) return '';
  return [roles && `Looking for a job as: ${roles}.`, profile.level && `Level: ${profile.level}.`, skills && `Skills: ${skills}.`].filter(Boolean).join(' ');
}

function jobText(j) {
  const skills = parse(j.skills, []);
  return [j.title, j.company && `Company: ${j.company}`, skills.length && `Skills: ${skills.join(', ')}`, String(j.description || '').replace(/\s+/g, ' ').slice(0, 1500)].filter(Boolean).join('\n');
}

const toScore = (sim) => Math.round(Math.min(1, Math.max(0, (sim - LOW()) / (HIGH() - LOW()))) * 100);

/** Meaning-based scores for jobs already embedded: Map jobId → 0–100 (empty when unavailable). */
async function semanticScores(profile, jobIds) {
  const out = new Map();
  const text = profileText(profile);
  if (!text || !jobIds.length || !E.enabled()) return out;
  const pv = await E.embedText(text, 'RETRIEVAL_QUERY');
  if (!pv) return out;
  const vecs = await E.vectorsFor('job', jobIds.map((id) => ({ id })), { compute: false });
  for (const [id, v] of vecs) out.set(id, toScore(E.cosine(pv, v)));
  return out;
}

/** Final match: half keyword skill match, half meaning — or whichever one exists. */
function blend(keyword, semantic) {
  if (semantic === undefined || semantic === null) return keyword;
  if (keyword === undefined || keyword === null) return semantic;
  return Math.round(KEYWORD_WEIGHT * keyword + (1 - KEYWORD_WEIGHT) * semantic);
}

/* ---------- Background: embed job posts that don't have a vector yet ---------- */
let lastRun = 0;
let running = null;
async function embedMissingJobs(limit = 400) {
  if (!E.enabled()) return 0;
  const [rows] = await q().query(
    `SELECT j.id, j.title, j.company, j.skills, j.description FROM jobs j
     LEFT JOIN embeddings e ON e.kind = 'job' AND e.ref_id = j.id
     WHERE e.ref_id IS NULL ORDER BY j.id DESC LIMIT ${Math.max(1, Math.min(2000, limit))}`);
  if (!rows.length) return 0;
  const done = await E.vectorsFor('job', rows.map((j) => ({ id: j.id, text: jobText(j) })), { task: 'RETRIEVAL_DOCUMENT' });
  return done.size;
}
/** Fire-and-forget, at most every 2 minutes (called when someone opens the job board). */
function kickEmbedding() {
  if (running || Date.now() - lastRun < 120000) return;
  lastRun = Date.now();
  running = embedMissingJobs().catch((e) => console.warn('[ml] embed jobs', e.message)).finally(() => { running = null; });
}

module.exports = { semanticScores, blend, embedMissingJobs, kickEmbedding, profileText, jobText, toScore };
