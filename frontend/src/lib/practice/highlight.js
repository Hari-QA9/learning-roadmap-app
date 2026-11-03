// A small, fast syntax highlighter for the practice editor (JavaScript, Python, SQL, HTML/CSS).
// It only colours text — it never changes it — so a missed case just shows plain text.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const words = (s) => new Set(s.split(/\s+/));

const JS_KW = words('const let var function return if else for while do break continue new class extends import export from of in typeof instanceof try catch finally throw async await switch case default yield this super delete void static get set');
const JS_LIT = words('true false null undefined NaN Infinity');
const PY_KW = words('def return if elif else for while in not and or is class import from as with try except finally raise lambda pass break continue yield global nonlocal assert del async await match case');
const PY_LIT = words('True False None');
const PY_BUILTIN = words('print len range int str float list dict set tuple bool sum min max abs sorted reversed enumerate zip map filter round any all isinstance type open input self');
const SQL_KW = words('select from where and or not in is null like between join left right inner outer full cross on as group by order having limit offset distinct union all insert into values update set delete create table primary key foreign references drop alter add index view case when then else end asc desc count sum avg min max exists coalesce integer text real numeric varchar date');

const RULES = {
  javascript: [
    ['c', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
    ['s', /`(?:\\[\s\S]|[^\\`])*`?|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?/y],
    ['n', /\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)n?\b/iy],
    ['w', /[A-Za-z_$][\w$]*/y],
  ],
  python: [
    ['c', /#[^\n]*/y],
    ['s', /[rbfu]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?)/iy],
    ['n', /\b\d+(?:\.\d+)?(?:e[+-]?\d+)?j?\b/iy],
    ['d', /@[\w.]+/y],
    ['w', /[A-Za-z_]\w*/y],
  ],
  sql: [
    ['c', /--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
    ['s', /'(?:''|[^'])*'?/y],
    ['n', /\b\d+(?:\.\d+)?\b/y],
    ['w', /[A-Za-z_]\w*/y],
  ],
  css: [
    ['c', /\/\*[\s\S]*?(?:\*\/|$)/y],
    ['s', /"[^"\n]*"?|'[^'\n]*'?/y],
    ['p', /[\w-]+(?=\s*:)/y],
    ['n', /#[\da-f]{3,8}\b|-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b/iy],
    ['k', /@[\w-]+/y],
  ],
};

function word(w, lang, next) {
  if (lang === 'javascript') {
    if (JS_KW.has(w)) return 'k';
    if (JS_LIT.has(w)) return 'l';
    if (next === '(') return 'f';
  } else if (lang === 'python') {
    if (PY_KW.has(w)) return 'k';
    if (PY_LIT.has(w)) return 'l';
    if (PY_BUILTIN.has(w)) return 'b';
    if (next === '(') return 'f';
  } else if (lang === 'sql') {
    if (SQL_KW.has(w.toLowerCase())) return 'k';
  }
  return null;
}

function scan(code, lang) {
  const rules = RULES[lang];
  let out = '';
  let i = 0;
  let plain = '';
  const flush = () => { if (plain) { out += esc(plain); plain = ''; } };
  while (i < code.length) {
    let hit = null;
    for (const [type, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length) { hit = [type, m[0]]; break; }
    }
    if (!hit) { plain += code[i]; i += 1; continue; }
    let [type, text] = hit;
    if (type === 'w') {
      let j = i + text.length;
      while (code[j] === ' ') j += 1;
      type = word(text, lang, code[j]);
      if (!type) { plain += text; i += text.length; continue; }
    }
    flush();
    out += `<span class="hl-${type}">${esc(text)}</span>`;
    i += text.length;
  }
  flush();
  return out;
}

function html(code) {
  // Tags, attributes and comments; <style> and <script> contents get CSS / JS colours.
  let out = '';
  const re = /<!--[\s\S]*?(?:-->|$)|<(style|script)\b([^>]*)>([\s\S]*?)(<\/\1\s*>|$)|<\/?[A-Za-z][\w-]*(?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"?|'[^']*'?|[^\s>]+))?)*\s*\/?>?/gi;
  let last = 0;
  let m;
  const tag = (t) => {
    const p = t.match(/^(<\/?)([\w-]+)([\s\S]*?)(\/?>?)$/);
    if (!p) return esc(t);
    // Attributes are coloured from the raw text, then escaped piece by piece.
    const attrs = p[3].replace(/([^\s=]+)(\s*=\s*)?("[^"]*"?|'[^']*'?|[^\s"'>]+)?/g, (all, name, eq, val) =>
      `<span class="hl-a">${esc(name)}</span>${eq ? esc(eq) : ''}${val ? `<span class="hl-s">${esc(val)}</span>` : ''}`);
    return `${esc(p[1])}<span class="hl-t">${esc(p[2])}</span>${attrs}${esc(p[4])}`;
  };
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[0].startsWith('<!--')) out += `<span class="hl-c">${esc(m[0])}</span>`;
    else if (m[1]) {
      const open = `<${m[1]}${m[2]}>`;
      out += tag(open) + scan(m[3], m[1].toLowerCase() === 'style' ? 'css' : 'javascript') + (m[4] ? tag(m[4]) : '');
    } else out += tag(m[0]);
    last = m.index + m[0].length;
    if (!m[0].length) re.lastIndex += 1;
  }
  return out + esc(code.slice(last));
}

export function highlight(code, lang) {
  const text = String(code || '');
  try {
    if (lang === 'html') return html(text);
    if (RULES[lang]) return scan(text, lang);
  } catch { /* fall through to plain text */ }
  return esc(text);
}
