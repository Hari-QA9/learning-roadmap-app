import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useFocus, fmtClock } from '../lib/focus';
import { PageHeader, Card, Button, Field, Input, Select, Segmented, Stat, Icon, SkeletonRows, timeAgo } from '../components/ui';

const PRESETS = [
  { value: '25/5', label: '25 · 5' },
  { value: '50/10', label: '50 · 10' },
  { value: '15/3', label: '15 · 3' },
  { value: 'custom', label: 'Custom' },
];
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`);

function BigRing({ value, label, sub, tone }) {
  const size = 240; const stroke = 12; const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <div className="focus-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone === 'break' ? 'var(--success)' : 'var(--accent)'} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="focus-ring-label"><strong>{label}</strong><span>{sub}</span></div>
    </div>
  );
}

export default function Focus() {
  const f = useFocus();
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState([]);
  const [summary, setSummary] = useState(null);
  const [preset, setPreset] = useState(`${f.minutes}/${f.breakMinutes}` === '25/5' || `${f.minutes}/${f.breakMinutes}` === '50/10' || `${f.minutes}/${f.breakMinutes}` === '15/3' ? `${f.minutes}/${f.breakMinutes}` : 'custom');
  const [custom, setCustom] = useState({ focus: String(f.minutes), rest: String(f.breakMinutes) });
  const [plan, setPlan] = useState({ roadmap_id: f.roadmap_id ? String(f.roadmap_id) : '', label: f.label || '' });

  useEffect(() => { api.get('/roadmaps').then((r) => setRoadmaps(r.data || [])).catch(() => {}); }, []);
  const loadSummary = () => api.get('/learning/focus/summary', { noCache: true }).then((r) => setSummary(r.data)).catch(() => setSummary({ error: true }));
  useEffect(() => { loadSummary(); }, [f.lastLogged]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = preset === 'custom' ? Math.min(240, Math.max(1, parseInt(custom.focus, 10) || 25)) : Number(preset.split('/')[0]);
  const breakMinutes = preset === 'custom' ? Math.min(60, Math.max(1, parseInt(custom.rest, 10) || 5)) : Number(preset.split('/')[1]);
  const active = f.status === 'running' || f.status === 'paused';
  const progress = f.total ? 1 - f.remaining / f.total : 0;
  const start = () => f.start({ minutes, breakMinutes, roadmap_id: plan.roadmap_id ? Number(plan.roadmap_id) : null, task_id: null, label: plan.label.trim() });
  const max = Math.max(1, ...(summary?.last7 || []).map((d) => d.minutes));
  const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });

  return (
    <>
      <PageHeader title="Focus timer" description="Work in focused blocks with short breaks (the Pomodoro method). Every finished session is added to your study time." />
      <div className="split">
        <div className="stack-lg">
          <Card>
            <div className="focus-main">
              <BigRing
                value={active || f.status === 'ready-break' ? progress : 0}
                tone={f.mode}
                label={fmtClock(active ? f.remaining : (f.status === 'ready-break' ? f.breakMinutes : minutes) * 60000)}
                sub={f.status === 'ready-break' ? 'Break time' : f.mode === 'break' ? (f.status === 'paused' ? 'Break paused' : 'Break') : f.status === 'paused' ? 'Paused' : active ? 'Focus' : 'Ready'}
              />
              {active && f.label && <div className="small muted center">Working on: <strong style={{ color: 'var(--text)' }}>{f.label}</strong></div>}
              <div className="row row-wrap" style={{ gap: 8, justifyContent: 'center' }}>
                {f.status === 'idle' && <Button variant="primary" size="lg" icon="play" onClick={start}>Start {minutes}-minute focus</Button>}
                {f.status === 'running' && <Button size="lg" onClick={f.pause}>Pause</Button>}
                {f.status === 'paused' && <Button variant="primary" size="lg" icon="play" onClick={f.resume}>Resume</Button>}
                {active && <Button size="lg" variant="ghost" onClick={f.stop}>{f.mode === 'focus' ? 'Stop & save' : 'End break'}</Button>}
                {f.status === 'ready-break' && (<><Button variant="primary" size="lg" icon="play" onClick={f.startBreak}>Start {f.breakMinutes}-minute break</Button><Button size="lg" variant="ghost" onClick={f.skipBreak}>Skip break</Button></>)}
              </div>
              {f.lastLogged && Date.now() - f.lastLogged.at < 60000 && <div className="alert alert-success small center">Nice! {f.lastLogged.minutes} minutes added to your study time.</div>}
            </div>
          </Card>

          {f.status === 'idle' && (
            <Card title="Set up your session">
              <div className="stack-sm">
                <Field label="Focus · break (minutes)">
                  <Segmented value={preset} onChange={setPreset} options={PRESETS} />
                </Field>
                {preset === 'custom' && (
                  <div className="grid-2">
                    <Field label="Focus minutes"><Input type="number" min={1} max={240} value={custom.focus} onChange={(e) => setCustom({ ...custom, focus: e.target.value })} /></Field>
                    <Field label="Break minutes"><Input type="number" min={1} max={60} value={custom.rest} onChange={(e) => setCustom({ ...custom, rest: e.target.value })} /></Field>
                  </div>
                )}
                <Field label="Roadmap" optional hint="Time is added to this roadmap’s study hours.">
                  <Select value={plan.roadmap_id} onChange={(e) => setPlan({ ...plan, roadmap_id: e.target.value })} aria-label="Roadmap">
                    <option value="">General study</option>
                    {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </Select>
                </Field>
                <Field label="What are you working on?" optional>
                  <Input value={plan.label} onChange={(e) => setPlan({ ...plan, label: e.target.value })} maxLength={160} placeholder="e.g. CSS Grid exercises" />
                </Field>
              </div>
            </Card>
          )}
        </div>

        <div className="stack-lg">
          <div className="grid-2">
            <Stat label="Today" icon="clock" value={summary && !summary.error ? fmtMin(summary.today) : '—'} note={summary?.sessions_today ? `${summary.sessions_today} session${summary.sessions_today === 1 ? '' : 's'}` : 'No sessions yet'} loading={!summary} />
            <Stat label="This week" icon="flame" value={summary && !summary.error ? fmtMin(summary.week) : '—'} note={summary && !summary.error ? `${fmtMin(summary.month)} in 30 days` : ''} loading={!summary} />
          </div>
          <Card title="Last 7 days">
            {!summary ? <SkeletonRows rows={2} /> : (
              <div className="week-bars" style={{ height: 90 }} aria-label="Minutes studied in the last 7 days">
                {(summary.last7 || []).map((d) => (
                  <div key={d.day} className="week-bar" title={`${d.day}: ${d.minutes} min`}>
                    <span style={{ height: `${Math.max(4, (d.minutes / max) * 100)}%`, opacity: d.minutes ? 1 : 0.25 }} />
                    <em>{dayLabel(d.day)}</em>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {summary?.by_roadmap?.length > 0 && (
            <Card title="By roadmap" description="Last 7 days" pad={false}>
              <div className="list">
                {summary.by_roadmap.map((r) => (
                  <button key={r.roadmap_id || 0} type="button" className="list-row clickable" style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={() => r.roadmap_id && navigate(`/roadmaps/${r.roadmap_id}`)}>
                    <div className="list-icon"><Icon name={r.roadmap_id ? 'map' : 'book'} size={14} /></div>
                    <span className="grow truncate small">{r.title}</span>
                    <strong className="small">{fmtMin(r.minutes)}</strong>
                  </button>
                ))}
              </div>
            </Card>
          )}
          {summary?.recent?.length > 0 && (
            <Card title="Recent sessions" pad={false}>
              <div className="list">
                {summary.recent.map((x, i) => (
                  <div key={i} className="list-row small">
                    <span className="grow truncate">{x.task || x.label || x.roadmap || 'Focus session'}</span>
                    <span className="tiny subtle nowrap">{timeAgo(x.created_at)}</span>
                    <strong style={{ width: 44, textAlign: 'right' }}>{x.minutes}m</strong>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
