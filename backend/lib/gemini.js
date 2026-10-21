// Shared Gemini helper so every route uses the same (current) model and
// the same JSON handling. Change the model in one place via GEMINI_MODEL.
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let client = null;

function getModel({ json = false, system } = {}) {
  if (!process.env.GEMINI_API_KEY) {
    const e = new Error('GEMINI_API_KEY is missing from backend/.env');
    e.status = 503;
    throw e;
  }
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const opts = { model: MODEL };
  if (json) opts.generationConfig = { responseMimeType: 'application/json', temperature: 0.7 };
  if (system) opts.systemInstruction = system;
  return client.getGenerativeModel(opts);
}

/** Parse JSON from a model reply, tolerating ``` fences or extra prose. */
function parseJSON(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const obj = cleaned.match(/\{[\s\S]*\}/);
    const arr = cleaned.match(/\[[\s\S]*\]/);
    const candidates = [obj && obj[0], arr && arr[0]].filter(Boolean).sort((a, b) => b.length - a.length);
    for (const c of candidates) {
      try { return JSON.parse(c); } catch (e) { /* try next */ }
    }
    throw new Error('The AI response was not valid JSON. Please try again.');
  }
}

async function generateJSON(prompt) {
  const result = await getModel({ json: true }).generateContent(prompt);
  return parseJSON(result.response.text());
}

async function generateText(prompt, system) {
  const result = await getModel({ system }).generateContent(prompt);
  return result.response.text();
}

/** Send a consistent, readable error for AI failures. */
function sendAIError(res, err, fallback = 'The AI request failed. Please try again.') {
  console.error('[AI]', err && err.message);
  const msg = String((err && err.message) || '');
  if (err && err.status === 503) return res.status(503).json({ message: msg });
  if (/API key not valid|API_KEY_INVALID/i.test(msg)) return res.status(503).json({ message: 'The Gemini API key is invalid. Check GEMINI_API_KEY in backend/.env.' });
  if (/quota|429|rate/i.test(msg)) return res.status(429).json({ message: 'AI usage limit reached. Please wait a minute and try again.' });
  if (/not found|404/i.test(msg) && /model/i.test(msg)) return res.status(502).json({ message: `The AI model "${MODEL}" is unavailable. Set GEMINI_MODEL in backend/.env.` });
  if (/valid JSON/i.test(msg)) return res.status(502).json({ message: msg });
  return res.status(502).json({ message: fallback });
}

module.exports = { getModel, parseJSON, generateJSON, generateText, sendAIError, MODEL };
