// Personalises the FSRS memory model (lib/fsrs.js) to one member from their own review history.
//
// Training data: every review that happened at least a day after the previous review of the
// same card. For each one the model predicted a recall probability R; the label is whether the
// member actually remembered (any answer except "Again"). We minimise the log-loss of those
// predictions over the 19 weights with Adam (numeric gradients — the model is tiny), keep the
// weights close to the published defaults (L2 penalty), and only accept the result if it
// predicts better than the defaults on cards held out from training.
const F = require('./fsrs');

const MIN_REVIEWS = 100; // long-term reviews needed before personalising
const EPS = 1e-6;

/** Group reviews by card, oldest first. reviews: [{ card_id, grade (1-4), at (ms) }] */
function byCard(reviews) {
  const m = new Map();
  for (const r of reviews) {
    if (!m.has(r.card_id)) m.set(r.card_id, []);
    m.get(r.card_id).push(r);
  }
  for (const list of m.values()) list.sort((a, b) => a.at - b.at);
  return [...m.values()];
}

/** Mean log-loss of the recall predictions for these cards' histories, and how many predictions there were. */
function logLoss(w, cards) {
  let loss = 0;
  let n = 0;
  for (const list of cards) {
    let state = null;
    for (const r of list) {
      if (state && (r.at - state.last) / F.DAY >= 1) {
        const R = Math.min(1 - EPS, Math.max(EPS, F.retrievability((r.at - state.last) / F.DAY, state.S)));
        const y = r.grade > 1 ? 1 : 0;
        loss -= y * Math.log(R) + (1 - y) * Math.log(1 - R);
        n++;
      }
      state = F.step(w, state, r.grade, r.at);
    }
  }
  return { loss: n ? loss / n : 0, n };
}

const countLongTerm = (reviews) => logLoss(F.DEFAULT_W, byCard(reviews)).n;

// Optimise in "relative" units so weights of very different sizes (0.005 vs 15) move alike.
const SCALE = F.DEFAULT_W.map((x) => Math.max(Math.abs(x), 0.1));
const toX = (w) => w.map((v, i) => v / SCALE[i]);
const toW = (x) => x.map((v, i) => F.clamp(v * SCALE[i], F.BOUNDS[i][0], F.BOUNDS[i][1]));

function fitWeights(cards, { start = F.DEFAULT_W, iterations = 80, lr = 0.03, l2 = 0.02 } = {}) {
  const x0 = toX(F.DEFAULT_W);
  const objective = (x) => logLoss(toW(x), cards).loss + l2 * x.reduce((s, v, i) => s + (v - x0[i]) ** 2, 0);
  let x = toX(start);
  const m = new Array(x.length).fill(0);
  const v = new Array(x.length).fill(0);
  const b1 = 0.9; const b2 = 0.999;
  for (let it = 1; it <= iterations; it++) {
    const g = x.map((_, i) => {
      const h = 1e-3;
      const up = x.slice(); up[i] += h;
      const down = x.slice(); down[i] -= h;
      return (objective(up) - objective(down)) / (2 * h);
    });
    for (let i = 0; i < x.length; i++) {
      m[i] = b1 * m[i] + (1 - b1) * g[i];
      v[i] = b2 * v[i] + (1 - b2) * g[i] * g[i];
      const mh = m[i] / (1 - b1 ** it);
      const vh = v[i] / (1 - b2 ** it);
      x[i] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
    }
    x = toX(toW(x)); // stay inside the allowed ranges
  }
  return toW(x);
}

/**
 * Fit a member's weights. Returns { ok, w, n, loss_default, loss_fitted, reason }.
 * `ok` is true only when the personal model beats the defaults on held-out cards.
 */
function fit(reviews, opts = {}) {
  const cards = byCard(reviews);
  const total = logLoss(F.DEFAULT_W, cards).n;
  if (total < MIN_REVIEWS) return { ok: false, n: total, reason: `needs ${MIN_REVIEWS} reviews spaced a day or more apart` };
  // Hold out every 5th card (by id) to check the personal model really generalises.
  const train = []; const test = [];
  cards.forEach((list) => ((Number(list[0].card_id) % 5 === 0 ? test : train).push(list)));
  if (!test.length || logLoss(F.DEFAULT_W, test).n < 10) { test.length = 0; train.length = 0; cards.forEach((l, i) => (i % 5 === 0 ? test : train).push(l)); }
  const w = fitWeights(train, opts);
  const before = logLoss(F.DEFAULT_W, test).loss;
  const after = logLoss(w, test).loss;
  return { ok: after < before, w, n: total, loss_default: before, loss_fitted: after, reason: after < before ? null : 'the default model already predicts your memory well' };
}

module.exports = { fit, logLoss, byCard, countLongTerm, MIN_REVIEWS };
