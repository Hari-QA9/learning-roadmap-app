import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { useI18n } from '../lib/i18n';
import { useFocus } from '../lib/focus';
import CalendarCard from '../components/CalendarCard';
import { PageHeader, Card, Button, Badge, Icon, Modal, Field, Select, Input, SkeletonRows } from '../components/ui';

/* ---------- Dates as 'YYYY-MM-DD' (calendar days, not instants) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (ymd, n) => { const d = dateOf(ymd); d.setDate(d.getDate() + n); return ymdOf(d); };
const DAY_LETTERS = [0, 1, 2, 3, 4, 5, 6];

/** 6 weeks starting on the Sunday on/before the 1st of the month. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1, 12);
  const start = ymdOf(new Date(year, month, 1 - first.getDay(), 12));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
const timeLabel = (hhmm, lang) => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' }); };
const interviewDay = (v) => String(v || '').slice(0, 10);

export default function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const focus = useFocus();
  const { lang } = useI18n();
  const locale = lang === 'zh' ? 'zh-CN' : lang;
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(ymdOf(now));
  const [modal, setModal] = useState(null); // 'schedule' | 'plan' | 'sync'
  const [undo, setUndo] = useState(null); // last auto-plan, so it can be undone

  const grid = useMemo(() => monthGrid(view.y, view.m), [view]);
  const load = useCallback(() => {
    setError('');
    return api.get('/calendar/events', { params: { from: grid[0], to: grid[41] }, noCache: true })
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load your calendar.')));
  }, [grid]);
  useEffect(() => { load(); }, [load]);

  const today = data?.today || ymdOf(now);
  const schedule = data?.schedule || { days: [], active: false };
  const studyOn = (d) => schedule.active && d >= today && schedule.days.includes(dateOf(d).getDay());

  // Everything per day.
  const byDay = useMemo(() => {
    const map = {};
    const put = (d, item) => { (map[d] = map[d] || []).push(item); };
    for (const t of data?.tasks || []) put(t.due_date, { kind: 'task', ...t });
    for (const a of data?.interviews || []) put(interviewDay(a.interview_at), { kind: 'interview', ...a });
    return map;
  }, [data]);

  const setTaskStatus = async (task, done) => {
    const status = done ? 'done' : 'pending';
    const apply = (list) => (list || []).map((t) => (t.id === task.id ? { ...t, status } : t));
    setData((d) => ({ ...d, tasks: apply(d.tasks), overdue: done ? (d.overdue || []).filter((t) => t.id !== task.id) : d.overdue }));
    try {
      const r = await api.put(`/tasks/${task.id}`, { status, due_date: task.due_date });
      if (r.data?.queued) toast.success('Saved on this device — it will sync when you’re online');
      else if (done) toast.success('Nice — task done');
    } catch (e) {
      setData((d) => ({ ...d, tasks: (d.tasks || []).map((t) => (t.id === task.id ? task : t)) }));
      toast.error(errorMessage(e, 'Could not update the task'));
    }
  };

  const startStudy = () => { if (focus.status === 'idle') focus.setPlan({ label: 'Study session' }); navigate('/focus'); };

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const shift = (n) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => { setView({ y: now.getFullYear(), m: now.getMonth() }); setSelected(today); };
  const weekday = (i) => new Date(2026, 1, 1 + i).toLocaleDateString(locale, { weekday: 'short' }); // Feb 1 2026 is a Sunday

  const dayItems = byDay[selected] || [];
  const selTasks = dayItems.filter((x) => x.kind === 'task');
  const selInterviews = dayItems.filter((x) => x.kind === 'interview');

  return (
    <>
      <PageHeader title="Calendar" description="Due dates, interviews and your study sessions in one place. Ticking tasks off works offline too."
        actions={<>
          <Button icon="clock" onClick={() => setModal('schedule')}>Study schedule</Button>
          <Button icon="link" onClick={() => setModal('sync')}>Sync to my calendar</Button>
          <Button variant="primary" icon="sparkles" onClick={() => setModal('plan')}>Plan a roadmap</Button>
        </>} />

      {undo && (
        <div className="cal-note" role="status">
          <Icon name="checkCircle" size={15} />
          <span className="grow">{undo.message}</span>
          <button type="button" className="link-btn small" onClick={async () => {
            try { await api.post('/calendar/plan/undo', { task_ids: undo.task_ids }); toast.success('Plan undone'); setUndo(null); load(); } catch (e) { toast.error(errorMessage(e, 'Could not undo')); }
          }}>Undo</button>
          <button type="button" className="link-btn small subtle" onClick={() => setUndo(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {!schedule.active && data && (
        <div className="cal-note">
          <Icon name="clock" size={15} />
          <span className="grow">Set the days and time you usually study — they’ll show here and in your phone’s calendar, with a reminder before each session.</span>
          <button type="button" className="link-btn small" onClick={() => setModal('schedule')}>Set my study schedule</button>
        </div>
      )}

      <div className="cal-layout">
        <Card pad={false} className="cal-month">
          <div className="cal-head">
            <Button variant="ghost" size="sm" icon="chevronLeft" onClick={() => shift(-1)} aria-label="Previous month" />
            <h2 className="cal-title">{monthName}</h2>
            <Button variant="ghost" size="sm" icon="chevronRight" onClick={() => shift(1)} aria-label="Next month" />
            <span className="grow" />
            <Button size="sm" onClick={goToday}>Today</Button>
          </div>
          {error ? <div className="list-row small text-danger">{error} <button type="button" className="link-btn small" onClick={load}>Try again</button></div> : !data ? <div style={{ padding: 16 }}><SkeletonRows rows={5} /></div> : (
            <div className="cal-grid" role="grid" aria-label={monthName}>
              {DAY_LETTERS.map((i) => <div key={i} className="cal-wd" role="columnheader">{weekday(i)}</div>)}
              {grid.map((d) => {
                const items = byDay[d] || [];
                const study = studyOn(d);
                const inMonth = dateOf(d).getMonth() === view.m;
                const chips = [
                  ...(study ? [{ k: 'study', label: `${timeLabel(schedule.time, locale)} Study` }] : []),
                  ...items.map((x) => (x.kind === 'task'
                    ? { k: x.status === 'done' ? 'done' : d < today ? 'overdue' : 'task', label: x.title }
                    : { k: 'interview', label: `Interview: ${x.company || x.job_title}` })),
                ];
                const label = `${dateOf(d).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}${chips.length ? `, ${chips.length} item${chips.length === 1 ? '' : 's'}` : ''}`;
                return (
                  <button key={d} type="button" role="gridcell" aria-selected={d === selected} aria-label={label}
                    className={`cal-day ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''} ${d === selected ? 'sel' : ''}`}
                    onClick={() => setSelected(d)}>
                    <span className="cal-num">{dateOf(d).getDate()}</span>
                    <span className="cal-chips">
                      {chips.slice(0, 3).map((c, i) => <span key={i} className={`cal-chip ${c.k}`}>{c.label}</span>)}
                      {chips.length > 3 && <span className="cal-more">+{chips.length - 3}</span>}
                    </span>
                    {chips.length > 0 && <span className="cal-dots" aria-hidden="true">{chips.slice(0, 4).map((c, i) => <i key={i} className={c.k} />)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="stack">
          <Card title={dateOf(selected).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })} pad={false} className="cal-agenda">
            {!data ? <div style={{ padding: 16 }}><SkeletonRows rows={2} /></div> : (
              <div className="list">
                {studyOn(selected) && (
                  <div className="list-row">
                    <span className="cal-dot study" />
                    <div className="grow"><div style={{ fontWeight: 500 }}>Study session</div><div className="tiny subtle">{timeLabel(schedule.time, locale)} · {schedule.minutes} min</div></div>
                    {selected === today && <Button size="sm" icon="clock" onClick={startStudy}>Start</Button>}
                  </div>
                )}
                {selInterviews.map((a) => (
                  <button key={`i${a.id}`} type="button" className="list-row clickable" onClick={() => navigate('/applications')}>
                    <span className="cal-dot interview" />
                    <div className="grow" style={{ textAlign: 'left', minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>Interview: {a.job_title}{a.company ? ` — ${a.company}` : ''}</div>
                      <div className="tiny subtle">{String(a.interview_at).length > 10 ? new Date(a.interview_at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : ''}{a.location ? ` · ${a.location}` : ''}</div>
                    </div>
                  </button>
                ))}
                {selTasks.map((t) => <TaskRow key={t.id} t={t} onToggle={setTaskStatus} onOpen={() => navigate(`/roadmaps/${t.roadmap_id}`)} overdue={t.status !== 'done' && selected < today} />)}
                {!studyOn(selected) && !selInterviews.length && !selTasks.length && (
                  <div className="list-row small muted">Nothing planned{selected >= today ? ' — a good day to get ahead.' : '.'}</div>
                )}
              </div>
            )}
          </Card>

          {data?.overdue?.length > 0 && (
            <Card title={`Overdue (${data.overdue.length})`} pad={false}>
              <div className="list">{data.overdue.slice(0, 8).map((t) => <TaskRow key={t.id} t={t} onToggle={setTaskStatus} onOpen={() => navigate(`/roadmaps/${t.roadmap_id}`)} overdue showDate locale={locale} />)}</div>
            </Card>
          )}

          {data?.undated > 0 && (
            <Card>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <Icon name="list" size={16} style={{ color: 'var(--text-3)', marginTop: 2 }} />
                <div className="grow small">
                  <strong style={{ color: 'var(--text)' }}>{data.undated} open task{data.undated === 1 ? '' : 's'} without a date.</strong>{' '}
                  <span className="muted">Spread a roadmap over your study days and you’ll always know what’s next.</span>
                  <div className="mt-2"><Button size="sm" variant="primary" icon="sparkles" onClick={() => setModal('plan')}>Plan a roadmap</Button></div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ScheduleModal open={modal === 'schedule'} initial={schedule} locale={locale} onClose={() => setModal(null)} onSaved={(s) => { setData((d) => ({ ...d, schedule: s })); setModal(null); }} />
      <PlanModal open={modal === 'plan'} schedule={schedule} locale={locale} today={today} onClose={() => setModal(null)}
        onPlanned={(r) => { setModal(null); setUndo(r); const d = dateOf(r.first); setView({ y: d.getFullYear(), m: d.getMonth() }); setSelected(r.first); load(); }} />
      <Modal open={modal === 'sync'} onClose={() => setModal(null)} title="See LearnMap in your own calendar"
        description="Due dates, interviews and your weekly study sessions appear in Google Calendar, Apple Calendar or Outlook — and stay up to date.">
        <CalendarCard bare />
      </Modal>
    </>
  );
}

function TaskRow({ t, onToggle, onOpen, overdue, showDate, locale }) {
  const done = t.status === 'done';
  return (
    <div className="list-row cal-task">
      <input type="checkbox" className="cal-check" checked={done} onChange={(e) => onToggle(t, e.target.checked)} aria-label={`Mark “${t.title}” ${done ? 'not done' : 'done'}`} />
      <button type="button" className="grow link-row" onClick={onOpen} style={{ minWidth: 0, textAlign: 'left' }}>
        <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)', textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{t.title}</div>
        <div className="tiny subtle truncate">{t.roadmap_title}{showDate ? ` · due ${dateOf(t.due_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}` : ''}</div>
      </button>
      {overdue && !done && <Badge tone="danger">Overdue</Badge>}
    </div>
  );
}

function ScheduleModal({ open, initial, locale, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ days: [], time: '19:00', minutes: 60, remind: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF({ days: initial.days || [], time: initial.time || '19:00', minutes: initial.minutes || 60, remind: initial.remind !== false }); }, [open, initial]);
  const toggle = (d) => setF((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d].sort() }));
  const save = async (days) => {
    setBusy(true);
    try {
      const r = await api.put('/calendar/schedule', { ...f, days });
      toast.success(r.data.message);
      onSaved(r.data);
    } catch (e) { toast.error(errorMessage(e, 'Could not save your schedule')); } finally { setBusy(false); }
  };
  const long = (i) => new Date(2026, 1, 1 + i).toLocaleDateString(locale, { weekday: 'long' });
  const short = (i) => new Date(2026, 1, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' });
  return (
    <Modal open={open} onClose={onClose} title="Your study schedule" description="When do you usually study? Sessions show on your calendar, and you get a reminder before each one."
      footer={<>
        {initial.active && <Button variant="ghost" onClick={() => save([])} disabled={busy}>Turn off</Button>}
        <span className="grow" />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={!f.days.length || !f.time} onClick={() => save(f.days)}>Save schedule</Button>
      </>}>
      <div className="stack-sm">
        <Field label="Days">
          <div className="cal-daypick" role="group" aria-label="Study days">
            {DAY_LETTERS.map((i) => (
              <button key={i} type="button" aria-pressed={f.days.includes(i)} aria-label={long(i)} title={long(i)} className={f.days.includes(i) ? 'on' : ''} onClick={() => toggle(i)}>{short(i)}</button>
            ))}
          </div>
        </Field>
        <div className="row" style={{ gap: 12 }}>
          <Field label="Time" className="grow"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} aria-label="Study time" /></Field>
          <Field label="Length" className="grow">
            <Select value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} aria-label="Session length">
              {[30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hour${m === 60 ? '' : 's'}`}</option>)}
            </Select>
          </Field>
        </div>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={f.remind} onChange={(e) => setF({ ...f, remind: e.target.checked })} /> Remind me before each session
        </label>
        <p className="tiny subtle" style={{ margin: 0 }}>Reminders arrive in LearnMap and on your phone if you turned on notifications in Profile.</p>
      </div>
    </Modal>
  );
}

function PlanModal({ open, schedule, locale, today, onClose, onPlanned }) {
  const toast = useToast();
  const [roadmaps, setRoadmaps] = useState(null);
  const [f, setF] = useState({ roadmap_id: '', per_day: 1, start: today });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF((x) => ({ ...x, start: today }));
    api.get('/roadmaps').then((r) => { const list = r.data || []; setRoadmaps(list); setF((x) => ({ ...x, roadmap_id: x.roadmap_id || (list[0] ? String(list[0].id) : '') })); }).catch(() => setRoadmaps([]));
  }, [open, today]);
  const days = schedule.active ? schedule.days.map((d) => new Date(2026, 1, 1 + d).toLocaleDateString(locale, { weekday: 'short' })).join(', ') : null;
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post('/calendar/plan', { roadmap_id: Number(f.roadmap_id), per_day: f.per_day, start: f.start });
      const until = dateOf(r.data.last).toLocaleDateString(locale, { month: 'long', day: 'numeric' });
      onPlanned({ ...r.data, message: `${r.data.scheduled} task${r.data.scheduled === 1 ? '' : 's'} planned, through ${until}. They’re on your calendar and you’ll get reminders.` });
    } catch (e) { toast.error(errorMessage(e, 'Could not plan this roadmap')); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Plan a roadmap"
      description={days ? `Open tasks without a date are spread over your study days (${days}), in roadmap order. Tasks that already have a date stay as they are.` : 'Open tasks without a date are spread over the coming days, in roadmap order. Set a study schedule first to use only your study days.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.roadmap_id} onClick={submit}>Plan it</Button></>}>
      {roadmaps && !roadmaps.length ? <p className="small muted">Create a roadmap first — then plan it here.</p> : (
        <div className="stack-sm">
          <Field label="Roadmap">
            <Select value={f.roadmap_id} onChange={(e) => setF({ ...f, roadmap_id: e.target.value })} aria-label="Roadmap to plan">
              {(roadmaps || []).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </Select>
          </Field>
          <div className="row" style={{ gap: 12 }}>
            <Field label={days ? 'Tasks per study day' : 'Tasks per day'} className="grow">
              <Select value={f.per_day} onChange={(e) => setF({ ...f, per_day: Number(e.target.value) })} aria-label="Tasks per day">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Start" className="grow"><Input type="date" min={today} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value || today })} aria-label="Start date" /></Field>
          </div>
          <p className="tiny subtle" style={{ margin: 0 }}>You can undo this right after, and change any date later on the roadmap.</p>
        </div>
      )}
    </Modal>
  );
}
