import React from 'react';
import api, { isLoggedIn } from '../lib/api';
import { LANGS, useI18n } from '../lib/i18n';
import { Select } from './ui';

/** Language picker. Saves the choice in the browser and (when logged in) on the account. */
export default function LanguageSelect({ compact = false, style }) {
  const { lang, setLang, t } = useI18n();
  const change = (e) => {
    setLang(e.target.value);
    if (isLoggedIn()) api.put('/settings', { language: e.target.value }).catch(() => {});
  };
  return (
    <Select value={lang} onChange={change} aria-label={t('lang.label')} className={compact ? 'select-sm' : undefined} style={{ width: 'auto', ...style }}>
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
    </Select>
  );
}
