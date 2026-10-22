// Keeps the most recent server errors in memory so the admin dashboard can show them.
// (For a bigger launch, send these to an error service like Sentry — see TODO.md.)
const MAX = 200;
const recent = [];
let installed = false;

function record(message) {
  if (/^\(node:\d+\) \w*Warning/.test(String(message))) return; // Node runtime warnings aren't app errors
  recent.unshift({ at: new Date().toISOString(), message: String(message).slice(0, 600) });
  if (recent.length > MAX) recent.length = MAX;
}

function installErrorLog() {
  if (installed) return;
  installed = true;
  const original = console.error.bind(console);
  console.error = (...args) => {
    try { record(args.map((a) => (a instanceof Error ? `${a.message}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); } catch { /* ignore */ }
    original(...args);
  };
  process.on('unhandledRejection', (err) => record(`Unhandled: ${err && err.message ? err.message : err}`));
}

module.exports = { installErrorLog, recentErrors: () => recent.slice(), recordError: record };
