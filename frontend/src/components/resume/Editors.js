import React, { useLayoutEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useToast } from '../Toast';
import { Button, Field, Input, Textarea, Icon } from '../ui';
import { emptyEntry, uid, dateRange } from '../../lib/resume';

const WEAK = /^(responsible for|worked on|helped|assisted|duties included|tasked with|involved in|participated in)\b/i;
const HAS_NUMBER = /\d|%|\$/;
/** A textarea that grows to fit its text. */
function AutoTextarea(props) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return <Textarea ref={ref} rows={1} {...props} style={{ overflow: 'hidden', resize: 'none', ...(props.style || {}) }} />;
}

/* ---------- Small building blocks ---------- */
function MoveButtons({ index, count, onMove, label }) {
  return (
    <>
      <Button size="sm" variant="ghost" icon="chevronDown" style={{ transform: 'rotate(180deg)' }} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`} />
      <Button size="sm" variant="ghost" icon="chevronDown" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`} />
    </>
  );
}

const move = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

/* ---------- Contact ---------- */
export function ContactEditor({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="form-grid">
      <Field label="Full name"><Input value={value.name} onChange={set('name')} placeholder="Sai Cherukumalla" /></Field>
      <Field label="Target job title" hint="Shown under your name — match the job you apply for."><Input value={value.headline} onChange={set('headline')} placeholder="QA Automation Engineer" /></Field>
      <Field label="Email"><Input type="email" value={value.email} onChange={set('email')} placeholder="you@gmail.com" /></Field>
      <Field label="Phone"><Input value={value.phone} onChange={set('phone')} placeholder="(201) 555-0123" /></Field>
      <Field label="Location" hint="City and state is enough — no street address."><Input value={value.location} onChange={set('location')} placeholder="Jersey City, NJ" /></Field>
      <Field label="LinkedIn"><Input value={value.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/yourname" /></Field>
      <Field label="GitHub / portfolio" optional className="full"><Input value={value.website} onChange={set('website')} placeholder="github.com/yourname" /></Field>
    </div>
  );
}

/* ---------- Summary ---------- */
export function SummaryEditor({ value, onChange, resume, jobTitle }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const n = value.trim() ? value.trim().split(/\s+/).length : 0;
  const write = async () => {
    setBusy(true);
    try {
      const r = await api.post('/resume/generate-summary', { resume, jobTitle });
      onChange(r.data.summary || value);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not write a summary'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack-sm">
      <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder="QA Automation Engineer with hands-on experience building Selenium and Java test frameworks…" />
      <div className="row-between">
        <span className={`tiny ${n && (n < 30 || n > 90) ? 'text-warning' : 'subtle'}`}>{n} words · aim for 30–90</span>
        <Button size="sm" icon="sparkles" loading={busy} onClick={write}>{value ? 'Rewrite with AI' : 'Write with AI'}</Button>
      </div>
    </div>
  );
}

/* ---------- Skills ---------- */
export function SkillsEditor({ value, onChange, onSync, syncing }) {
  const update = (i, patch) => onChange(value.map((g, k) => (k === i ? { ...g, ...patch } : g)));
  return (
    <div className="stack-sm">
      <p className="tiny subtle">Group them so recruiters can scan (e.g. “Languages”, “Testing”, “Tools”). Separate skills with commas.</p>
      {value.map((g, i) => (
        <div key={g.id} className="skill-group-row">
          <Input value={g.group} onChange={(e) => update(i, { group: e.target.value })} placeholder="Group (optional)" aria-label="Skill group" />
          <Input value={g.items} onChange={(e) => update(i, { items: e.target.value })} placeholder="Java, Python, SQL" aria-label="Skills" />
          <Button size="sm" variant="ghost" icon="trash" aria-label="Remove group" disabled={value.length === 1} onClick={() => onChange(value.filter((_, k) => k !== i))} />
        </div>
      ))}
      <div className="row-between row-wrap">
        <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange([...value, { id: uid(), group: '', items: '' }])}>Add group</Button>
        {onSync && <Button size="sm" variant="ghost" icon="briefcase" loading={syncing} onClick={onSync}>Use for job matching</Button>}
      </div>
    </div>
  );
}

/* ---------- Bullets with live hints + AI improve ---------- */
function Bullets({ bullets, onChange, context }) {
  const toast = useToast();
  const [improving, setImproving] = useState(null);
  const [options, setOptions] = useState(null); // { index, options, tip }

  const setAt = (i, v) => onChange(bullets.map((b, k) => (k === i ? v : b)));
  const improve = async (i) => {
    setImproving(i);
    try {
      const r = await api.post('/resume/improve-bullet', { bullet: bullets[i], ...context });
      setOptions({ index: i, options: r.data.options || [], tip: r.data.tip });
    } catch (e) {
      toast.error(errorMessage(e, 'Could not improve this bullet'));
    } finally {
      setImproving(null);
    }
  };

  return (
    <div className="stack-sm">
      <div className="label">Bullet points <span className="opt">— what you did and the result</span></div>
      {bullets.map((b, i) => {
        const hints = [];
        if (b.trim()) {
          if (WEAK.test(b.trim())) hints.push('Start with an action verb');
          if (!HAS_NUMBER.test(b)) hints.push('Add a number or result');
          if (b.trim().split(/\s+/).length > 32) hints.push('Too long');
        }
        return (
          <div key={i} className="bullet-row">
            <span className="bullet-dot">•</span>
            <div className="grow" style={{ minWidth: 0 }}>
              <AutoTextarea
                value={b}
                onChange={(e) => setAt(i, e.target.value.replace(/\n/g, ' '))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); const a = [...bullets]; a.splice(i + 1, 0, ''); onChange(a); }
                }}
                placeholder="Automated 300+ regression tests with Selenium and Java, cutting release testing from 3 days to 4 hours"
                aria-label={`Bullet ${i + 1}`}
              />
              {hints.length > 0 && <div className="bullet-hints">{hints.map((h) => <span key={h}>{h}</span>)}</div>}
              {options && options.index === i && (
                <div className="bullet-options fade-in">
                  {options.options.map((o, k) => (
                    <button key={k} type="button" className="bullet-option" onClick={() => { setAt(i, o); setOptions(null); }}>
                      <Icon name="check" size={12} /> {o}
                    </button>
                  ))}
                  <div className="row-between mt-1">
                    <span className="tiny subtle">{options.tip}</span>
                    <Button size="sm" variant="ghost" onClick={() => setOptions(null)}>Keep mine</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="bullet-actions">
              <Button size="sm" variant="ghost" icon="sparkles" loading={improving === i} disabled={!b.trim()} onClick={() => improve(i)} aria-label="Improve with AI" title="Improve with AI" />
              <Button size="sm" variant="ghost" icon="x" onClick={() => onChange(bullets.length > 1 ? bullets.filter((_, k) => k !== i) : [''])} aria-label="Remove bullet" />
            </div>
          </div>
        );
      })}
      <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange([...bullets, ''])}>Add bullet</Button>
    </div>
  );
}

/* ---------- Experience / projects / education / certifications ---------- */
const FIELDS = {
  experience: [['title', 'Job title', 'Test Engineer'], ['company', 'Company', 'Accenture'], ['location', 'Location', 'Hyderabad, India'], ['start', 'Start', 'Jan 2021'], ['end', 'End', 'Dec 2022']],
  projects: [['name', 'Project name', 'E2E test framework for an e-commerce site'], ['tech', 'Tools used', 'Playwright, TypeScript, GitHub Actions'], ['link', 'Link', 'github.com/you/project'], ['start', 'Start', '2025'], ['end', 'End', '2026']],
  education: [['degree', 'Degree', 'MS Computer Science'], ['school', 'School', 'Long Island University'], ['location', 'Location', 'Brooklyn, NY'], ['start', 'Start', '2025'], ['end', 'Graduation', 'Dec 2026']],
  certifications: [['name', 'Certificate', 'ISTQB Foundation Level'], ['issuer', 'Issued by', 'ISTQB'], ['date', 'Date', '2025'], ['link', 'Link', '']],
};
const heading = (kind, e) => ({
  experience: [e.title, e.company].filter(Boolean).join(' · '),
  projects: e.name,
  education: [e.degree, e.school].filter(Boolean).join(' · '),
  certifications: [e.name, e.issuer].filter(Boolean).join(' · '),
}[kind]);

export function EntriesEditor({ kind, value, onChange, context = {} }) {
  const [open, setOpen] = useState(() => (value[0] ? value[0].id : null));
  const update = (i, patch) => onChange(value.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  const add = () => { const e = emptyEntry(kind); onChange([...value, e]); setOpen(e.id); };
  const noun = { experience: 'role', projects: 'project', education: 'school', certifications: 'certificate' }[kind];

  return (
    <div className="stack-sm">
      {value.length === 0 && (
        <p className="tiny subtle">
          {kind === 'projects' ? 'Students and career changers: 2–3 projects with real tools and results can stand in for work experience.' : `No ${noun}s yet.`}
        </p>
      )}
      {value.map((e, i) => {
        const isOpen = open === e.id;
        return (
          <div key={e.id} className={`entry ${isOpen ? 'open' : ''}`}>
            <div className="entry-head" onClick={() => setOpen(isOpen ? null : e.id)}>
              <Icon name="chevronRight" size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', color: 'var(--text-3)' }} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 500 }}>{heading(kind, e) || `New ${noun}`}</div>
                {kind !== 'certifications' && <div className="tiny subtle">{dateRange(e) || 'Add dates'}</div>}
              </div>
              <div className="row" style={{ gap: 0 }} onClick={(ev) => ev.stopPropagation()}>
                <MoveButtons index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} label={noun} />
                <Button size="sm" variant="ghost" icon="trash" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Delete ${noun}`} />
              </div>
            </div>
            {isOpen && (
              <div className="entry-body fade-in">
                <div className="form-grid">
                  {FIELDS[kind].map(([k, label, ph]) => (
                    <Field key={k} label={label} optional={['location', 'link', 'tech'].includes(k)}>
                      <Input
                        value={e[k] || ''}
                        placeholder={ph}
                        disabled={k === 'end' && e.current}
                        onChange={(ev) => update(i, { [k]: ev.target.value })}
                      />
                    </Field>
                  ))}
                </div>
                {kind === 'experience' && (
                  <label className="checkbox mt-2"><input type="checkbox" checked={!!e.current} onChange={(ev) => update(i, { current: ev.target.checked, end: ev.target.checked ? '' : e.end })} /> I currently work here</label>
                )}
                {kind === 'education' && (
                  <Field label="Details" optional className="mt-2" hint="GPA (if 3.5+), honors, relevant coursework.">
                    <Input value={e.details || ''} onChange={(ev) => update(i, { details: ev.target.value })} placeholder="GPA 3.8 · Coursework: Software Testing, Data Structures, Cloud Computing" />
                  </Field>
                )}
                {(kind === 'experience' || kind === 'projects') && (
                  <div className="mt-3">
                    <Bullets
                      bullets={e.bullets && e.bullets.length ? e.bullets : ['']}
                      onChange={(b) => update(i, { bullets: b })}
                      context={{ role: e.title || e.name, company: e.company, current: !!e.current, ...context }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <Button size="sm" variant="ghost" icon="plus" onClick={add}>Add {noun}</Button>
    </div>
  );
}
