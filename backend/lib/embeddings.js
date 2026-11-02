// Text embeddings: turn a piece of text (a job post, a member's goals, a roadmap) into a list of
// numbers that captures its *meaning*, so "React developer" and "frontend engineer" end up close
// together even though they share no words. Closeness = cosine similarity of the two vectors.
//
// Uses Gemini's embedding model (same GEMINI_API_KEY). Vectors are stored in the `embeddings`
// table and only recomputed when the text changes. If embeddings are unavailable (no key,
// quota reached, ML_EMBEDDINGS=0) every caller falls back to plain keyword matching.
const crypto = require('crypto');
const db = require('../db');

const q = () => db.promise();
const MODEL = () => process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const DIMS = () => Math.min(3072, Math.max(64, parseInt(process.env.ML_EMBED_DIMS, 10) || 768));
const BATCH = 100;

let client = null;
let pausedUntil = 0; // after an error (e.g. quota), wait before trying again

function enabled() {
  return !!process.env.GEMINI_API_KEY && process.env.ML_EMBEDDINGS !== '0' && Date.now() >= pausedUntil;
}

const hashOf = (task, text) => crypto.createHash('sha1').update(`${MODEL()}|${DIMS()}|${task}|${text}`).digest('hex');
const toB64 = (v) => Buffer.from(new Float32Array(v).buffer).toString('base64');
const fromB64 = (s) => { const b = Buffer.from(s, 'base64'); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };

function normalise(values) {
  let n = 0;
  for (const x of values) n += x * x;
  n = Math.sqrt(n) || 1;
  return Float32Array.from(values, (x) => x / n);
}

/** Cosine similarity of two normalised vectors (−1 … 1; related texts are usually 0.7+). */
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Calls the embedding API for up to 100 texts. task: RETRIEVAL_DOCUMENT | RETRIEVAL_QUERY | SEMANTIC_SIMILARITY */
async function embedBatch(texts, task) {
  if (!client) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  const model = client.getGenerativeModel({ model: MODEL() });
  try {
    const res = await model.batchEmbedContents({
      requests: texts.map((t) => ({ content: { role: 'user', parts: [{ text: t.slice(0, 6000) }] }, taskType: task, outputDimensionality: DIMS() })),
    });
    return res.embeddings.map((e) => normalise(e.values));
  } catch (err) {
    pausedUntil = Date.now() + (/quota|429|rate/i.test(err.message) ? 15 : 5) * 60000;
    console.warn(`[ml] embeddings unavailable for a few minutes: ${String(err.message).slice(0, 160)}`);
    throw err;
  }
}

/* ---------- Stored vectors ---------- */
const memo = new Map(); // `${kind}:${id}` → { hash, vec }
const MEMO_MAX = 20000;
function remember(key, value) {
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
  memo.set(key, value);
}

/**
 * Vectors for items [{ id, text }] of one kind ('job', 'roadmap', 'profile'…).
 * With `compute: false` only already-stored vectors are returned (never waits on the API).
 * Returns Map id → Float32Array (items without a vector are left out).
 */
async function vectorsFor(kind, items, { task = 'RETRIEVAL_DOCUMENT', compute = true } = {}) {
  const out = new Map();
  // Items without text (e.g. a list query that didn't load the full job post) take whatever vector is stored.
  const want = new Map(items.filter((i) => i.text === undefined || (i.text && i.text.trim())).map((i) => [Number(i.id), i.text === undefined ? null : hashOf(task, i.text)]));
  const unknown = [];
  for (const [id, hash] of want) {
    const m = memo.get(`${kind}:${id}`);
    if (m && (hash === null || m.hash === hash)) out.set(id, m.vec); else unknown.push(id);
  }
  for (let i = 0; i < unknown.length; i += 500) {
    const ids = unknown.slice(i, i + 500);
    const [rows] = await q().query('SELECT ref_id, text_hash, vec FROM embeddings WHERE kind = ? AND ref_id IN (?)', [kind, ids]);
    for (const r of rows) {
      const h = want.get(Number(r.ref_id));
      if (h !== null && r.text_hash !== h) continue;
      const vec = fromB64(r.vec);
      remember(`${kind}:${r.ref_id}`, { hash: r.text_hash, vec });
      out.set(Number(r.ref_id), vec);
    }
  }
  if (!compute || !enabled()) return out;
  const missing = items.filter((i) => i.text !== undefined && want.has(Number(i.id)) && !out.has(Number(i.id)));
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    let vecs;
    try { vecs = await embedBatch(chunk.map((c) => c.text), task); } catch { break; }
    for (let k = 0; k < chunk.length; k++) {
      const id = Number(chunk[k].id);
      const hash = want.get(id);
      await q().query('DELETE FROM embeddings WHERE kind = ? AND ref_id = ?', [kind, id]);
      await q().query('INSERT INTO embeddings (kind, ref_id, model, text_hash, dims, vec) VALUES (?, ?, ?, ?, ?, ?)', [kind, id, MODEL(), hash, vecs[k].length, toB64(vecs[k])]);
      remember(`${kind}:${id}`, { hash, vec: vecs[k] });
      out.set(id, vecs[k]);
    }
  }
  return out;
}

/* ---------- One-off texts (search queries, a member's goals) ---------- */
const queryCache = new Map();
async function embedText(text, task = 'RETRIEVAL_QUERY') {
  const t = String(text || '').trim();
  if (!t || !enabled()) return null;
  const key = hashOf(task, t);
  if (queryCache.has(key)) return queryCache.get(key);
  let vec;
  try { [vec] = await embedBatch([t], task); } catch { return null; }
  if (queryCache.size > 1000) queryCache.delete(queryCache.keys().next().value);
  queryCache.set(key, vec);
  return vec;
}

module.exports = { enabled, vectorsFor, embedText, cosine, normalise, MODEL };
