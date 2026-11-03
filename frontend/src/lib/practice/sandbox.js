// Runs practice code safely, entirely in the browser.
//
// JavaScript, Python and SQL run in a Web Worker that lives inside a sandboxed iframe
// (sandbox="allow-scripts", no same-origin). So the code:
//   • can't see the app, the member's login, cookies or saved data (it has no origin of its own);
//   • can't freeze the page — a stuck loop is stopped after a few seconds by throwing the sandbox away.
// HTML & CSS exercises render in their own sandboxed iframe.
// Python (Pyodide) and SQL (sql.js) are downloaded from a public CDN the first time they're used,
// then the browser keeps them cached.

const PYODIDE = (process.env.REACT_APP_PYODIDE_URL || 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/').replace(/\/?$/, '/');
const SQLJS = (process.env.REACT_APP_SQLJS_URL || 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/').replace(/\/?$/, '/');

const LIMITS = {
  javascript: { run: 5000, load: 5000 },
  python: { run: 10000, load: 120000 },
  sql: { run: 5000, load: 45000 },
};

/* ---------- Worker programs (plain strings: they run inside the sandbox, not in the app) ---------- */
const SHARED = `
const __fmt = (v) => { try { if (typeof v === 'string') return v; if (v === undefined) return 'undefined'; if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']'; if (typeof v === 'bigint') return v + 'n'; return JSON.stringify(v); } catch (e) { return String(v); } };
function __deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a); const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => __deepEqual(a[k], b[k]));
}
class __Fail extends Error {}
const __assert = (c, m) => { if (!c) throw new __Fail(m || 'Assertion failed'); };
const __assertEqual = (a, b, m) => { if (!__deepEqual(a, b)) throw new __Fail((m ? m + ' — ' : '') + 'expected ' + __fmt(b) + ' but got ' + __fmt(a)); };
const __msg = (e) => (e instanceof __Fail ? e.message : e && e.name ? e.name + ': ' + e.message : String(e));
`;

const JS_WORKER = `${SHARED}
onmessage = async (ev) => {
  const { id, payload } = ev.data;
  const out = []; let size = 0;
  const log = (...a) => { const s = a.map(__fmt).join(' '); size += s.length; if (size < 20000) out.push(s); };
  const con = { log, info: log, warn: log, error: log, debug: log, table: log };
  const tests = payload.mode === 'test' ? payload.tests || [] : [];
  const body = tests.map((t, i) => 'try { await (async (assert, assertEqual) => {\\n' + t.code + '\\n})(__assert, __assertEqual); __r.push([' + i + ', true, ""]); } catch (e) { __r.push([' + i + ', false, __msg(e)]); }').join('\\n');
  let fn;
  try {
    fn = new Function('console', '__assert', '__assertEqual', '__msg', payload.code + '\\n;return (async () => { const __r = [];\\n' + body + '\\nreturn __r; });');
  } catch (e) {
    postMessage({ id, result: { ok: false, error: 'Your code has a syntax error: ' + e.message, stdout: '' } }); return;
  }
  let runTests;
  try { runTests = fn(con, __assert, __assertEqual, __msg); }
  catch (e) { postMessage({ id, result: { ok: false, error: __msg(e), stdout: out.join('\\n') } }); return; }
  try {
    const r = await runTests();
    postMessage({ id, result: { ok: true, stdout: out.join('\\n'), tests: r } });
  } catch (e) { postMessage({ id, result: { ok: false, error: __msg(e), stdout: out.join('\\n') } }); }
};
`;

const PY_DRIVER = `
import json, sys, io, traceback
__p = json.loads(__payload)
__out = io.StringIO()
__saved = (sys.stdout, sys.stderr)
sys.stdout = sys.stderr = __out
def __no_input(*a, **k):
    raise RuntimeError("input() isn't available here - use the values given in the exercise.")
def __where(e, name):
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == name]
    return ("line %d: " % frames[-1].lineno) if frames else ""
__res = {"ok": True, "tests": []}
__ns = {"__name__": "__main__", "input": __no_input}
try:
    try:
        exec(compile(__p["code"], "main.py", "exec"), __ns)
    except SyntaxError as e:
        __res["ok"] = False
        __res["error"] = "SyntaxError on line %s: %s" % (e.lineno, e.msg)
    except BaseException as e:
        __res["ok"] = False
        __res["error"] = (__where(e, "main.py").capitalize() + type(e).__name__ + ": " + str(e)).strip()
    if __res["ok"] and __p.get("mode") == "test":
        for i, t in enumerate(__p.get("tests") or []):
            try:
                exec(compile(t["code"], "test.py", "exec"), __ns)
                __res["tests"].append([i, True, ""])
            except AssertionError as e:
                __res["tests"].append([i, False, str(e) or "Assertion failed"])
            except BaseException as e:
                __res["tests"].append([i, False, (__where(e, "main.py").capitalize() + type(e).__name__ + ": " + str(e)).strip()])
finally:
    sys.stdout, sys.stderr = __saved
__res["stdout"] = __out.getvalue()[:20000]
json.dumps(__res)
`;

const PY_WORKER = `
const INDEX = ${JSON.stringify(PYODIDE)};
const DRIVER = ${JSON.stringify(PY_DRIVER)};
let py = null;
async function boot() {
  if (py) return py;
  postMessage({ status: 'loading' });
  importScripts(INDEX + 'pyodide.js');
  py = await loadPyodide({ indexURL: INDEX });
  postMessage({ status: 'ready' });
  return py;
}
onmessage = async (ev) => {
  const { id, payload } = ev.data;
  let p;
  try { p = await boot(); }
  catch (e) { postMessage({ id, result: { ok: false, setupError: true, error: 'Couldn’t load Python. Check your internet connection and try again.' } }); return; }
  try {
    p.globals.set('__payload', JSON.stringify(payload));
    postMessage({ id, result: JSON.parse(p.runPython(DRIVER)) });
  } catch (e) {
    postMessage({ id, result: { ok: false, error: String((e && e.message) || e).trim().split('\\n').filter(Boolean).pop() || 'Python error' } });
  }
};
`;

const SQL_WORKER = `
const BASE = ${JSON.stringify(SQLJS)};
let SQL = null;
async function boot() {
  if (SQL) return SQL;
  postMessage({ status: 'loading' });
  importScripts(BASE + 'sql-wasm.js');
  SQL = await initSqlJs({ locateFile: (f) => BASE + f });
  postMessage({ status: 'ready' });
  return SQL;
}
const cell = (v) => (v instanceof Uint8Array ? '[' + v.length + ' bytes]' : v);
onmessage = async (ev) => {
  const { id, payload } = ev.data;
  let S;
  try { S = await boot(); }
  catch (e) { postMessage({ id, result: { ok: false, setupError: true, error: 'Couldn’t load the SQL engine. Check your internet connection and try again.' } }); return; }
  const db = new S.Database();
  try {
    try { db.run(payload.setup || ''); }
    catch (e) { postMessage({ id, result: { ok: false, setupError: true, error: 'The exercise tables could not be created: ' + e.message } }); return; }
    if (!String(payload.code || '').replace(/--.*$/gm, '').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').trim()) {
      postMessage({ id, result: { ok: false, error: 'Write a query first.' } }); return;
    }
    let res;
    try { res = db.exec(payload.code); }
    catch (e) { postMessage({ id, result: { ok: false, error: e.message } }); return; }
    const last = res[res.length - 1] || { columns: [], values: [] };
    postMessage({ id, result: { ok: true, table: { columns: last.columns, values: last.values.slice(0, 500).map((r) => r.map(cell)) }, rows: last.values.length } });
  } finally { db.close(); }
};
`;

const SOURCES = { javascript: JS_WORKER, python: PY_WORKER, sql: SQL_WORKER };

// The page inside the sandboxed iframe: hands each job to the right worker and relays answers.
const BOOT = `<!doctype html><meta charset="utf-8"><script>
const W = {};
addEventListener('message', (e) => {
  if (e.source !== parent) return;
  const d = e.data || {};
  if (!W[d.kind]) {
    const w = new Worker(URL.createObjectURL(new Blob([d.src], { type: 'text/javascript' })));
    w.onmessage = (m) => parent.postMessage(Object.assign({ __lv: 1, kind: d.kind }, m.data), '*');
    w.onerror = (err) => { err.preventDefault(); parent.postMessage({ __lv: 1, kind: d.kind, id: w.current, result: { ok: false, error: err.message || 'The code runner stopped unexpectedly.' } }, '*'); };
    W[d.kind] = w;
  }
  W[d.kind].current = d.id;
  W[d.kind].postMessage({ id: d.id, payload: d.payload });
});
parent.postMessage({ __lv: 1, ready: true }, '*');
<\/script>`;

class Sandbox {
  constructor() {
    this.pending = new Map();
    this.loaded = {};
    this.seq = 0;
    this.onStatus = null;
    this.listener = (e) => {
      if (!this.frame || e.source !== this.frame.contentWindow) return;
      const d = e.data;
      if (!d || !d.__lv) return;
      if (d.ready) { this.loaded.javascript = true; this.readyResolve?.(); return; } // JavaScript needs no download
      if (d.status) {
        if (d.status === 'ready') {
          this.loaded[d.kind] = true;
          // Downloading is done: from now on, only the code's own run time counts.
          for (const [id, p] of this.pending) if (p.kind === d.kind) { clearTimeout(p.timer); p.timer = setTimeout(() => this.timeout(id), LIMITS[d.kind].run); }
        }
        this.onStatus?.(d.kind, d.status);
        return;
      }
      const p = this.pending.get(d.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(d.id);
      p.resolve(d.result || { ok: false, error: 'No result' });
    };
    window.addEventListener('message', this.listener);
  }

  ensure() {
    if (this.frame) return this.ready;
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('aria-hidden', 'true');
    f.title = 'Code runner';
    f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    this.ready = new Promise((r) => { this.readyResolve = r; });
    f.srcdoc = BOOT;
    this.frame = f;
    document.body.appendChild(f);
    return this.ready;
  }

  timeout(id) {
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    const loading = !this.loaded[p.kind];
    this.reset();
    p.resolve({
      ok: false, timeout: true, setupError: loading,
      error: loading
        ? `Starting ${p.kind === 'python' ? 'Python' : p.kind === 'sql' ? 'the SQL engine' : 'the code runner'} took too long. Check your internet connection and try again.`
        : 'Your code took too long and was stopped. Look for a loop that never ends.',
    });
  }

  /** Throw the sandbox away (stops runaway code). The next run starts a fresh one. */
  reset() {
    if (this.frame) this.frame.remove();
    this.frame = null;
    this.loaded = {};
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.resolve({ ok: false, error: 'Stopped.' }); }
    this.pending.clear();
  }

  async run(kind, payload) {
    await this.ensure();
    const id = ++this.seq;
    return new Promise((resolve) => {
      const ms = this.loaded[kind] ? LIMITS[kind].run : LIMITS[kind].load;
      const timer = setTimeout(() => this.timeout(id), ms);
      this.pending.set(id, { resolve, timer, kind });
      this.frame.contentWindow.postMessage({ id, kind, src: SOURCES[kind], payload }, '*');
    });
  }

  destroy() {
    this.reset();
    window.removeEventListener('message', this.listener);
  }
}

let shared = null;
/** One sandbox for the whole app session (so Python only downloads once). */
export function getSandbox() {
  if (!shared) shared = new Sandbox();
  return shared;
}
export const isLoaded = (kind) => !!shared?.loaded[kind];

/* ---------- HTML & CSS ---------- */
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** The learner's page with the checks added at the end; the checks report back to the app. */
function htmlWithTests(code, tests, token) {
  const script = `<script>(function(){
${SHARED}
var T = ${jsonForScript((tests || []).map((t) => t.code))};
var token = ${JSON.stringify(token)};
function done(){ setTimeout(async function(){
  var r = [];
  for (var i = 0; i < T.length; i++) {
    try { await (new Function('assert','assertEqual','$','$$','return (async () => {\\n' + T[i] + '\\n})()'))(__assert, __assertEqual, function(s){return document.querySelector(s);}, function(s){return Array.from(document.querySelectorAll(s));}); r.push([i, true, '']); }
    catch (e) { r.push([i, false, __msg(e)]); }
  }
  parent.postMessage({ __lvhtml: token, result: { ok: true, tests: r, stdout: '' } }, '*');
}, 30); }
if (document.readyState === 'complete') done(); else addEventListener('load', done);
})();<\/script>`;
  // A function replacer, so "$'" and "$$" in the script aren't treated as replacement patterns.
  return /<\/body>/i.test(code) ? code.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${script}</body>`) : `${code}\n${script}`;
}

function runHtml(code, tests) {
  return new Promise((resolve) => {
    const token = `h${Date.now()}${Math.random().toString(36).slice(2)}`;
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('aria-hidden', 'true');
    f.title = 'Page checker';
    f.style.cssText = 'position:absolute;left:-10000px;top:0;width:1024px;height:768px;border:0;visibility:hidden';
    const finish = (result) => { clearTimeout(timer); window.removeEventListener('message', onMsg); f.remove(); resolve(result); };
    const onMsg = (e) => { if (e.source === f.contentWindow && e.data && e.data.__lvhtml === token) finish(e.data.result); };
    const timer = setTimeout(() => finish({ ok: false, timeout: true, error: 'Your page took too long to load and was stopped. Check for a script that never ends.' }), 6000);
    window.addEventListener('message', onMsg);
    f.srcdoc = htmlWithTests(code, tests, token);
    document.body.appendChild(f);
  });
}

/* ---------- Checking ---------- */
const named = (tests, raw) => (tests || []).map((t, i) => {
  const r = (raw || []).find((x) => x[0] === i);
  return { name: t.name, passed: !!r?.[1], message: r ? r[2] : 'Not run' };
});

const norm = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v == null ? null : String(v));
const rowKey = (r) => JSON.stringify(r.map(norm));

/** Compare the learner's query result with the expected one. */
export function compareTables(got, exp, ordered) {
  const checks = [];
  checks.push({ name: 'Returns the right columns', passed: got.columns.length === exp.columns.length,
    message: got.columns.length === exp.columns.length ? '' : `expected ${exp.columns.length} column${exp.columns.length === 1 ? '' : 's'} (${exp.columns.join(', ')}) but got ${got.columns.length}` });
  let rowsOk = got.values.length === exp.values.length;
  let msg = rowsOk ? '' : `expected ${exp.values.length} row${exp.values.length === 1 ? '' : 's'} but got ${got.values.length}`;
  if (rowsOk) {
    const a = got.values.map(rowKey); const b = exp.values.map(rowKey);
    if (!ordered) { a.sort(); b.sort(); }
    const i = a.findIndex((x, k) => x !== b[k]);
    if (i >= 0) { rowsOk = false; msg = ordered ? `row ${i + 1} is different (check the values and the ORDER BY)` : 'some values are different from the expected result'; }
  }
  checks.push({ name: ordered ? 'Returns the right rows, in the right order' : 'Returns the right rows', passed: rowsOk, message: msg });
  return checks;
}

/** Run the learner's code. mode 'run' = just run it; 'test' = run the checks too.
 *  Returns { ok, error, stdout, table, results: [{ name, passed, message }], passed, total, setupError } */
export async function check(ex, code, mode = 'test') {
  if (ex.kind === 'html') {
    if (mode === 'run') return { ok: true, results: [], passed: 0, total: 0 };
    const r = await runHtml(code, ex.tests);
    const results = r.ok ? named(ex.tests, r.tests) : [];
    return { ...r, results, passed: results.filter((x) => x.passed).length, total: (ex.tests || []).length };
  }
  if (ex.kind === 'sql') {
    const r = await getSandbox().run('sql', { setup: ex.setup, code });
    if (!r.ok) {
      const results = mode === 'test' && !r.setupError ? [{ name: 'Query runs without errors', passed: false, message: r.error }] : [];
      return { ...r, results, passed: 0, total: mode === 'test' ? 3 : 0 };
    }
    if (mode === 'run' || !ex.expected) return { ...r, results: [], passed: 0, total: 0 };
    const results = [{ name: 'Query runs without errors', passed: true, message: '' }, ...compareTables(r.table, ex.expected, ex.ordered)];
    return { ...r, results, passed: results.filter((x) => x.passed).length, total: results.length };
  }
  const r = await getSandbox().run(ex.kind, { code, tests: (ex.tests || []).map((t) => ({ code: t.code })), mode });
  const results = r.ok && mode === 'test' ? named(ex.tests, r.tests) : [];
  return { ...r, results, passed: results.filter((x) => x.passed).length, total: mode === 'test' ? (ex.tests || []).length : 0 };
}

/** Before a new exercise is shown: the solution must pass every check and the starter must not.
 *  Returns { ok, error, expected, setupError } (`expected` = the solution's result for SQL). */
export async function validate(ex) {
  if (ex.kind === 'sql') {
    const r = await getSandbox().run('sql', { setup: ex.setup, code: ex.solution });
    if (r.setupError && /internet|took too long/i.test(r.error || '')) return { ok: false, setupError: true, error: r.error };
    if (!r.ok) return { ok: false, error: `the solution query failed: ${r.error}` };
    if (!r.table.values.length) return { ok: false, error: 'the solution query returned no rows' };
    return { ok: true, expected: r.table };
  }
  const sol = await check(ex, ex.solution, 'test');
  if (sol.setupError) return { ok: false, setupError: true, error: sol.error };
  if (!sol.ok) return { ok: false, error: `the solution doesn't run: ${sol.error}` };
  const bad = sol.results.find((x) => !x.passed);
  if (bad) return { ok: false, error: `the solution fails the test "${bad.name}": ${bad.message}` };
  const start = await check(ex, ex.starter || '', 'test');
  if (start.ok && start.total > 0 && start.passed === start.total) return { ok: false, error: 'the starter code already passes every test, so there is nothing to do' };
  return { ok: true };
}
// For tests.
export const _htmlWithTests = htmlWithTests;
