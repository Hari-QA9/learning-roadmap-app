// FSRS memory model for review cards (Free Spaced Repetition Scheduler, version 5 — the
// model behind modern Anki). Every card has a memory *stability* S (days until recall
// drops to 90%) and a *difficulty* D (1–10). After each review the model predicts how
// likely you are to remember the card right now (retrievability R) and schedules the
// next review for when R will have fallen to your target (90% by default).
//
// The 19 weights `w` start at the published defaults (fitted on millions of Anki
// reviews). Once a member has enough reviews, `fit()` personalises them to how *they*
// remember, by minimising the log-loss of the model's recall predictions on their own
// review history (see lib/memoryModel.js).

const DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
// Allowed range for each weight (keeps fitted models sensible).
const BOUNDS = [
  [0.01, 100], [0.01, 100], [0.01, 100], [0.01, 100], [1, 10], [0.001, 4], [0.001, 4], [0.001, 0.75],
  [0, 4.5], [0, 0.8], [0.001, 3.5], [0.001, 5], [0.001, 0.25], [0.001, 0.9], [0, 4], [0, 1], [1, 6], [0, 2], [0, 2],
];
const DECAY = -0.5;
const FACTOR = 19 / 81; // so that R = 90% exactly when t = S
const DAY = 86400000;
const MAX_INTERVAL = 3650; // days
const RELEARN_MINUTES = 10;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const clampD = (d) => clamp(d, 1, 10);

/** Probability of recalling a card `t` days after the last review, given stability S. */
const retrievability = (t, S) => Math.pow(1 + (FACTOR * Math.max(0, t)) / Math.max(S, 0.01), DECAY);
/** Days until recall falls to `r`. */
const intervalFor = (S, r = 0.9) => (S / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);

const initS = (w, G) => Math.max(w[G - 1], 0.1);
const initD = (w, G) => clampD(w[4] - Math.exp(w[5] * (G - 1)) + 1);
function nextD(w, D, G) {
  const delta = -w[6] * (G - 3);
  const damped = D + (delta * (10 - D)) / 9; // changes get smaller near the top of the scale
  return clampD(w[7] * initD(w, 4) + (1 - w[7]) * damped); // slowly drift back toward "normal"
}
function recallS(w, D, S, R, G) {
  const hard = G === 2 ? w[15] : 1;
  const easy = G === 4 ? w[16] : 1;
  return S * (1 + Math.exp(w[8]) * (11 - D) * Math.pow(S, -w[9]) * (Math.exp(w[10] * (1 - R)) - 1) * hard * easy);
}
function forgetS(w, D, S, R) {
  return Math.min(S, w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - R)));
}
const sameDayS = (w, S, G) => S * Math.exp(w[17] * (G - 3 + w[18]));

/**
 * One review. `state` = { S, D, last } (null for a new card); G = 1 again, 2 hard, 3 good, 4 easy.
 * Returns the new state and R, the predicted chance of recall just before this review (null for new cards).
 */
function step(w, state, G, now) {
  if (!state || !(state.S > 0)) return { S: initS(w, G), D: initD(w, G), last: now, R: null };
  const t = (now - state.last) / DAY;
  if (t < 1) return { S: Math.max(0.01, sameDayS(w, state.S, G)), D: nextD(w, state.D, G), last: now, R: retrievability(t, state.S) };
  const R = retrievability(t, state.S);
  const S = G === 1 ? forgetS(w, state.D, state.S, R) : recallS(w, state.D, state.S, R, G);
  return { S: Math.max(0.01, S), D: nextD(w, state.D, G), last: now, R };
}

/**
 * What each answer would do, from the card's current state: { 1: {S, D, dueMs, days}, 2: …, 3: …, 4: … }.
 * Again → back in 10 minutes; the others → when recall falls to the target retention.
 * Hard ≤ Good < Easy is enforced so the buttons always make sense.
 */
function outcomes(w, state, now, retention = 0.9) {
  const out = {};
  for (const G of [1, 2, 3, 4]) {
    const s = step(w, state, G, now);
    const days = G === 1 ? 0 : clamp(Math.round(intervalFor(s.S, retention)), 1, MAX_INTERVAL);
    out[G] = { S: s.S, D: s.D, days };
  }
  out[2].days = Math.min(out[2].days, out[3].days);
  out[4].days = Math.max(out[4].days, out[3].days + 1);
  for (const G of [1, 2, 3, 4]) out[G].dueMs = G === 1 ? now + RELEARN_MINUTES * 60000 : now + out[G].days * DAY;
  return out;
}

/** A stored card → model state. Cards scheduled before FSRS (SM-2 ease/interval) are converted once. */
function cardState(card) {
  const last = card.last_reviewed_at ? new Date(card.last_reviewed_at).getTime() : null;
  if (Number(card.stability) > 0 && Number(card.difficulty) > 0) return { S: Number(card.stability), D: Number(card.difficulty), last: last || Date.now() };
  if (!Number(card.reps) || !last) return null; // never reviewed (or forgotten and restarted)
  const ease = Number(card.ease) || 2.5;
  return { S: Math.max(0.5, Number(card.interval_days) || 1), D: clampD(10 - ((ease - 1.3) / 1.7) * 9), last };
}

/** A member's weights: their fitted ones if valid, else the defaults. */
function weightsFrom(json) {
  try {
    const w = typeof json === 'string' ? JSON.parse(json) : json;
    if (Array.isArray(w) && w.length === 19 && w.every((x) => Number.isFinite(x))) return w.map((x, i) => clamp(x, BOUNDS[i][0], BOUNDS[i][1]));
  } catch { /* fall through */ }
  return DEFAULT_W.slice();
}

module.exports = { DEFAULT_W, BOUNDS, DAY, retrievability, intervalFor, step, outcomes, cardState, weightsFrom, clamp };
