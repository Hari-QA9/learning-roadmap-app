import React, { useState } from 'react';
import { Card, Icon, Ring } from '../ui';

const ICON = { ok: 'checkCircle', warn: 'alert', error: 'xCircle', info: 'info' };
const TONE = { ok: 'text-success', warn: 'text-warning', error: 'text-danger', info: 'subtle' };

/** Live resume score: updates on every keystroke, no AI needed. */
export default function HealthPanel({ analysis, onJump, jobLabel }) {
  const [showPassed, setShowPassed] = useState(false);
  const failing = analysis.checks.filter((c) => !c.ok).sort((a, b) => (b.level === 'error') - (a.level === 'error') || b.weight - a.weight);
  const passed = analysis.checks.filter((c) => c.ok);
  const tone = analysis.score >= 80 ? 'success' : analysis.score >= 60 ? 'accent' : 'warning';
  const verdict = analysis.score >= 85 ? 'Ready to send' : analysis.score >= 70 ? 'Almost there' : analysis.score >= 50 ? 'Needs work' : 'Getting started';

  return (
    <Card pad={false} className="health">
      <div className="health-head">
        <Ring value={analysis.score} size={64} stroke={6} tone={tone} />
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{verdict}</div>
          <div className="tiny subtle">
            {failing.length ? `${failing.length} thing${failing.length > 1 ? 's' : ''} to improve` : 'Every check passes'}
            {jobLabel ? ` · checked against ${jobLabel}` : ' · recruiter & ATS checks'}
          </div>
        </div>
      </div>
      <div className="list">
        {failing.map((c) => (
          <button key={c.id} type="button" className="list-row clickable health-row" onClick={() => onJump?.(c.section)}>
            <Icon name={ICON[c.level]} size={15} className={TONE[c.level]} style={{ flex: 'none', marginTop: 2 }} />
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="small" style={{ fontWeight: 500, color: 'var(--text)' }}>{c.title}</div>
              <div className="tiny muted">{c.detail}</div>
            </div>
          </button>
        ))}
        {passed.length > 0 && (
          <button type="button" className="list-row clickable health-row" onClick={() => setShowPassed(!showPassed)}>
            <Icon name="checkCircle" size={15} className="text-success" style={{ flex: 'none' }} />
            <span className="small grow" style={{ textAlign: 'left' }}>{passed.length} check{passed.length > 1 ? 's' : ''} passed</span>
            <Icon name="chevronDown" size={14} style={{ transform: showPassed ? 'rotate(180deg)' : 'none', color: 'var(--text-3)' }} />
          </button>
        )}
        {showPassed && passed.map((c) => (
          <div key={c.id} className="list-row health-row">
            <Icon name="check" size={14} className="text-success" style={{ flex: 'none', marginTop: 2 }} />
            <div className="grow"><div className="small">{c.title}</div><div className="tiny subtle">{c.detail}</div></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
