import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGS, STRINGS } from './strings';

export { LANGS };
const KEY = 'learnmap.lang';
const codes = LANGS.map((l) => l.code);

/** Saved choice, else the browser's language if we support it, else English. */
export function getLang() {
  try { const saved = localStorage.getItem(KEY); if (codes.includes(saved)) return saved; } catch {}
  const nav = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language) || 'en').slice(0, 2).toLowerCase();
  return codes.includes(nav) ? nav : 'en';
}

export function translate(lang, key, vars) {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  return s;
}

const Ctx = createContext({ lang: 'en', t: (k, v) => translate('en', k, v), setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getLang);
  useEffect(() => { document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-Hans' : lang); }, [lang]);
  const setLang = useCallback((code) => {
    if (!codes.includes(code)) return;
    try { localStorage.setItem(KEY, code); } catch {}
    setLangState(code);
  }, []);
  const value = useMemo(() => ({ lang, setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang]);
  return React.createElement(Ctx.Provider, { value }, children);
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
