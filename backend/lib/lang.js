// The language the member uses LearnMap in. The browser sends it in an "X-Language" header;
// it's kept for the whole request (AsyncLocalStorage) so every AI call can write in that language.
const { AsyncLocalStorage } = require('async_hooks');

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', te: 'Telugu', fr: 'French', zh: 'Simplified Chinese' };
const store = new AsyncLocalStorage();

function middleware(req, res, next) {
  const code = String(req.headers['x-language'] || '').toLowerCase().slice(0, 5);
  store.run({ lang: LANGS[code] ? code : 'en' }, next);
}

const current = () => store.getStore()?.lang || 'en';
const run = (lang, fn) => store.run({ lang: LANGS[lang] ? lang : 'en' }, fn);

/** Extra instruction for the AI when the member doesn't use English ('' for English). */
function instruction(lang = current()) {
  if (!LANGS[lang] || lang === 'en') return '';
  const name = LANGS[lang];
  return `LANGUAGE: The learner uses LearnMap in ${name}. Write every piece of human-readable text in ${name} — titles, descriptions, tasks, explanations, questions, answers, feedback and letters. `
    + 'Keep JSON keys, enum values (for example learn|practice|build|review, behavioral|technical|situational|motivation, basic|intermediate|advanced, A|B|C|D), URLs, code and widely used technical terms exactly as specified in English.';
}

module.exports = { LANGS, middleware, current, run, instruction };
