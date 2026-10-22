import React, { useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, Field, Input, Textarea, Select, Alert, Badge, Icon, EmptyState, Spinner, Segmented } from '../components/ui';

const STORE = 'learnmap.studyplan';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };

function planToText(plan) {
  const lines = [plan.title, `${plan.totalDuration || ''}`, '', plan.overview || '', ''];
  (plan.weeklySchedule || []).forEach((d) => {
    lines.push(`${d.day} — ${d.topic} (${d.duration})`);
    (d.tasks || []).forEach((t) => lines.push(`  • ${t}`));
  });
  const tips = Array.isArray(plan.tips) ? plan.tips : plan.tips ? [plan.tips] : [];
  if (tips.length) { lines.push('', 'Tips:'); tips.forEach((t) => lines.push(`  • ${t}`)); }
  return lines.join('\n');
}

function StudyPlanner() {
  const toast = useToast();
  const saved = load();
  const [form, setForm] = useState(saved.form || { goal: '', skills: '', currentLevel: 'beginner', hoursPerDay: '2', daysPerWeek: '5', weeks: '' });
  const [plan, setPlan] = useState(saved.plan || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(saved.done || {});

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const persist = (next) => { try { localStorage.setItem(STORE, JSON.stringify({ form, plan, done, ...next })); } catch {} };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.goal.trim()) { setError('Describe what you want to achieve.'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/ai/study-plan', form);
      setPlan(r.data);
      setDone({});
      persist({ plan: r.data, done: {} });
    } catch (err) {
      setError(errorMessage(err, 'Could not create the plan. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key) => {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    persist({ done: next });
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(planToText(plan)); toast.success('Plan copied to clipboard'); }
    catch { toast.error('Could not copy'); }
  };

  const tips = plan ? (Array.isArray(plan.tips) ? plan.tips : plan.tips ? String(plan.tips).split(/(?<=\.)\s+/).filter(Boolean) : []) : [];
  const totalTasks = (plan?.weeklySchedule || []).reduce((n, d) => n + (d.tasks || []).length, 0);
  const doneTasks = Object.values(done).filter(Boolean).length;

  return (
    <>
      <PageHeader title="Study planner" description="A weekly schedule built around your goal and the time you actually have." />

      <div className="split form-left">
        <Card title="Your goal" className="sticky-top">
          <form onSubmit={submit}>
            {error && <div className="mb-2"><Alert tone="danger" onClose={() => setError('')}>{error}</Alert></div>}
            <Field label="What do you want to achieve?">
              <Textarea rows={3} value={form.goal} onChange={set('goal')} placeholder="e.g. Pass the NCLEX, get a lab research job, or become job-ready in data analysis" />
            </Field>
            <Field label="What you already know" optional>
              <Input value={form.skills} onChange={set('skills')} placeholder="e.g. Intro biology, basic Excel" />
            </Field>
            <Field label="Level">
              <Segmented value={form.currentLevel} onChange={(v) => setForm({ ...form, currentLevel: v })} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
            </Field>
            <div className="form-grid mt-2">
              <Field label="Hours per day">
                <Select value={form.hoursPerDay} onChange={set('hoursPerDay')}>
                  {['1', '2', '3', '4', '5', '6', '8', '10'].map((h) => <option key={h} value={h}>{h} hour{h === '1' ? '' : 's'}</option>)}
                </Select>
              </Field>
              <Field label="Days per week">
                <Select value={form.daysPerWeek} onChange={set('daysPerWeek')}>
                  {['3', '4', '5', '6', '7'].map((d) => <option key={d} value={d}>{d} days</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Total length" optional className="mt-2">
              <Input value={form.weeks} onChange={set('weeks')} placeholder="e.g. 12 (weeks)" inputMode="numeric" />
            </Field>
            <Button type="submit" variant="primary" block loading={loading} icon="calendar" className="mt-3">{plan ? 'Rebuild plan' : 'Build my plan'}</Button>
          </form>
        </Card>

        <div className="stack-lg">
          {loading && !plan && <Card><div className="loading-block"><Spinner /> Building your schedule…</div></Card>}
          {!loading && !plan && <Card><EmptyState icon="calendar" title="Your plan will appear here" description="Tell us your goal and how much time you have. Takes about 10 seconds." /></Card>}

          {plan && (
            <div className="stack-lg fade-in" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity var(--dur)' }}>
              <Card>
                <div className="row-between row-wrap" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <h2 style={{ fontSize: 18 }}>{plan.title}</h2>
                    <div className="row row-wrap mt-1" style={{ gap: 6 }}>
                      {plan.totalDuration && <Badge><Icon name="clock" size={11} /> {plan.totalDuration}</Badge>}
                      <Badge>{form.hoursPerDay}h × {form.daysPerWeek} days / week</Badge>
                      {totalTasks > 0 && <Badge tone={doneTasks === totalTasks ? 'success' : 'accent'}>{doneTasks}/{totalTasks} done this week</Badge>}
                    </div>
                  </div>
                  <div className="row no-print" style={{ gap: 6 }}>
                    <Button size="sm" icon="copy" onClick={copy}>Copy</Button>
                    <Button size="sm" icon="print" onClick={() => window.print()}>Print</Button>
                  </div>
                </div>
                {plan.overview && <p className="mt-2">{plan.overview}</p>}
              </Card>

              <Card title="Weekly schedule" description="Tick tasks off as you go — progress is saved on this device." pad={false}>
                <div className="list">
                  {(plan.weeklySchedule || []).map((d, i) => (
                    <div key={i} className="list-row" style={{ alignItems: 'flex-start', padding: '16px 20px' }}>
                      <div style={{ width: 92, flex: 'none' }}>
                        <div style={{ fontWeight: 600 }}>{d.day}</div>
                        <div className="tiny subtle">{d.duration}</div>
                      </div>
                      <div className="grow">
                        <div style={{ fontWeight: 500 }}>{d.topic}</div>
                        <div className="stack-sm mt-1">
                          {(d.tasks || []).map((t, j) => {
                            const key = `${i}-${j}`;
                            return (
                              <label key={key} className="checkbox small" style={{ color: done[key] ? 'var(--text-3)' : 'var(--text-2)', textDecoration: done[key] ? 'line-through' : 'none' }}>
                                <input type="checkbox" checked={!!done[key]} onChange={() => toggle(key)} /> {t}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {plan.milestones?.length > 0 && (
                <Card title="Milestones">
                  <div className="steps">
                    {plan.milestones.map((m, i) => (
                      <div key={i} className="step"><div className="step-num">{i + 1}</div><div><div className="tiny subtle">{m.week}</div><div style={{ color: 'var(--text)' }}>{m.goal}</div></div></div>
                    ))}
                  </div>
                </Card>
              )}

              {tips.length > 0 && (
                <Card title="Tips">
                  <ul className="stack-sm" style={{ listStyle: 'none' }}>
                    {tips.map((t, i) => <li key={i} className="row small" style={{ alignItems: 'flex-start', color: 'var(--text)' }}><Icon name="sparkles" size={14} className="text-accent" style={{ marginTop: 3 }} /> {t}</li>)}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default StudyPlanner;
