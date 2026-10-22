// Checks that every link in the resource library still opens.
// Run from the backend folder:  npm run check-resources
const { LIBRARY } = require('../lib/resourceLibrary');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

async function check(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    if (res.status >= 400) res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html' } });
    return { status: res.status };
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  const broken = [];
  const blocked = [];
  const slow = [];
  for (let i = 0; i < LIBRARY.length; i += 8) {
    const batch = LIBRARY.slice(i, i + 8);
    const results = await Promise.all(batch.map((r) => check(r.url)));
    batch.forEach((r, k) => {
      const x = results[k];
      if (x.error === 'timeout') slow.push(r);
      else if (x.error) broken.push({ ...r, why: x.error });
      else if ([401, 403, 405, 429, 503].includes(x.status)) blocked.push({ ...r, why: `HTTP ${x.status}` });
      else if (x.status >= 400) broken.push({ ...r, why: `HTTP ${x.status}` });
    });
  }
  const list = (title, items) => {
    if (!items.length) return;
    console.log(`\n${title}`);
    items.forEach((r) => console.log(`  ${r.id.padEnd(18)} ${r.url}${r.why ? `  (${r.why})` : ''}`));
  };
  list('✗ Broken — please tell Claude or remove these from backend/lib/resourceLibrary.js:', broken);
  list('• Blocked automated checks (usually fine — open in a browser to confirm):', blocked);
  list('• Too slow to answer (usually fine — open in a browser to confirm):', slow);
  const ok = LIBRARY.length - broken.length - blocked.length - slow.length;
  console.log(`\n${ok} of ${LIBRARY.length} links confirmed working. ${broken.length ? `${broken.length} broken.` : 'Nothing broken.'}`);
})();
