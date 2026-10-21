import React, { useState } from 'react';
import { Field, Icon } from './ui';

/** Password input with show/hide toggle and a Caps Lock warning. */
export function PasswordField({ label = 'Password', hint, error, value, onChange, onBlur, name = 'password', autoComplete = 'current-password', placeholder = '••••••••', autoFocus, labelRight }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (e) => { if (e.getModifierState) setCaps(e.getModifierState('CapsLock')); };

  return (
    <Field
      label={labelRight ? <span className="row-between" style={{ width: '100%' }}><span>{label}</span>{labelRight}</span> : label}
      hint={caps ? undefined : hint}
      error={error}
    >
      <div className="input-group">
        <input
          className="input"
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={(e) => { setCaps(false); onBlur?.(e); }}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required
          style={{ paddingRight: 40 }}
          aria-describedby={caps ? `${name}-caps` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
          className="pw-toggle"
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
        </button>
      </div>
      {caps && <span id={`${name}-caps`} className="hint text-warning"><Icon name="alert" size={12} style={{ verticalAlign: '-2px' }} /> Caps Lock is on</span>}
    </Field>
  );
}

/** Scores a password 0–4 and explains what would make it stronger. */
export function scorePassword(pw = '') {
  const checks = [
    { ok: pw.length >= 8, tip: 'at least 8 characters' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), tip: 'upper and lower case letters' },
    { ok: /\d/.test(pw), tip: 'a number' },
    { ok: /[^A-Za-z0-9]/.test(pw), tip: 'a symbol' },
  ];
  let score = checks.filter((c) => c.ok).length;
  if (pw.length >= 14 && score >= 3) score = 4;
  if (pw.length < 8) score = Math.min(score, 1);
  if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwerty)/i.test(pw)) score = 0;
  const missing = checks.filter((c) => !c.ok).map((c) => c.tip);
  return { score, missing };
}

const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'];

export function StrengthMeter({ password }) {
  if (!password) return null;
  const { score, missing } = scorePassword(password);
  return (
    <div className="strength" aria-live="polite">
      <div className="row" style={{ gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < Math.max(1, score) ? COLORS[score] : 'var(--surface-3)', transition: 'background var(--dur)' }} />
        ))}
      </div>
      <div className="row-between tiny mt-1">
        <span style={{ color: COLORS[score], fontWeight: 500 }}>{LABELS[score]}</span>
        {missing.length > 0 && score < 4 && <span className="subtle">Add {missing.slice(0, 2).join(' and ')}</span>}
      </div>
    </div>
  );
}
