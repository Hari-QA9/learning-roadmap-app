import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  PageHeader, Button, Card, Field, Input, Textarea, Select, Alert, Icon, Badge, Segmented, Spinner, Progress, formatMinutes,
} from '../components/ui';

const SUGGESTIONS = ['Playwright test automation', 'Python for data analysis', 'React with TypeScript', 'System design for interviews', 'AWS cloud practitioner', 'SQL for analysts'];
const GOALS = ['Get a job in this field', 'Pass an exam or certification', 'Build a specific project', 'Level up at my current job', 'Learn it for fun'];
const STYLES = [
  { value: 'hands-on', label: 'Hands-on' },
  { value: 'videos', label: 'Videos' },
  { value: 'reading', label: 'Reading' },
  { value: 'mixed', label: 'Mixed' },
];
const STYLE_TEXT = {
  'hands-on': 'doing exercises and building things, with minimal theory',
  videos: 'watching video tutorials, then practising',
  reading: 'reading documentation and articles, then practising',
  mixed: 'a balanced mix of videos, reading and hands-on practice',
};
const STAGES = [
  { at: 0, text: 'Understanding your goal and background' },
  { at: 5, text: 'Planning modules around your time' },
  { at: 12, text: 'Writing detailed tasks for each module' },
  { at: 24, text: 'Adding projects, resources and interview prep' },
  { at: 40, text: 'Almost there — saving your roadmap' },
];
const TYPE_ICON = { learn: 'book', practice: 'target', build: 'wand', review: 'refresh' };

function AIGenerator() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    topic: params.get('topic') || '',
    goal: GOALS[0],
    customGoal: '',
    level: 'beginner',
    background: '',
    hoursPerWeek: '6',
    duration: '6 weeks',
    style: 'mixed',
  });
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const generate = async (e) => {
    e?.preventDefault();
    if (!form.topic.trim()) { setError('Tell us what you want to learn.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const goal = form.goal === 'Other' ? form.customGoal.trim() : form.goal;
      const r = await api.post('/ai/generate', {
        topic: form.topic.trim(),
        goal,
        level: form.level,
        background: form.background.trim(),
        hoursPerWeek: Number(form.hoursPerWeek),
        duration: form.duration,
        style: STYLE_TEXT[form.style],
      }, { timeout: 240000 });
      setResult({ id: r.data.roadmapId, data: r.data.data || {} });
      toast.success('Your roadmap is ready');
    } catch (err) {
      setError(errorMessage(err, 'Could not generate the roadmap. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const stage = [...STAGES].reverse().find((s) => elapsed >= s.at) || STAGES[0];
  const d = result?.data || {};
  const mods = d.modules || [];
  const taskCount = mods.reduce((n, m) => n + (m.tasks?.length || 0), 0);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        title="Roadmap generator"
        description="Tell us about you, not just the topic. You’ll get a personalised plan with detailed tasks, real resources, projects and interview prep."
      />

      {!result && (
        <form onSubmit={generate}>
          {error && <div className="mb-2"><Alert tone="danger" onClose={() => setError('')}>{error}</Alert></div>}

          <Card title="1. What do you want to learn?" className="mb-3">
            <Input
              autoFocus
              value={form.topic}
              onChange={set('topic')}
              placeholder="e.g. Playwright end-to-end testing with TypeScript"
              disabled={loading}
              style={{ height: 44, fontSize: 15 }}
            />
            <div className="row row-wrap mt-2" style={{ gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="badge" style={{ cursor: 'pointer', height: 26 }} disabled={loading} onClick={() => setForm({ ...form, topic: s })}>{s}</button>
              ))}
            </div>
          </Card>

          <Card title="2. About you" description="This is what makes the roadmap yours." className="mb-3">
            <div className="form-grid">
              <Field label="Your goal">
                <Select value={form.goal} onChange={set('goal')} disabled={loading}>
                  {GOALS.map((g) => <option key={g}>{g}</option>)}
                  <option value="Other">Something else…</option>
                </Select>
              </Field>
              {form.goal === 'Other' ? (
                <Field label="Describe your goal">
                  <Input value={form.customGoal} onChange={set('customGoal')} placeholder="e.g. Automate testing at my company" disabled={loading} />
                </Field>
              ) : (
                <Field label="Current level">
                  <Segmented value={form.level} onChange={(v) => !loading && setForm({ ...form, level: v })} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
                </Field>
              )}
              {form.goal === 'Other' && (
                <Field label="Current level" className="full">
                  <Segmented value={form.level} onChange={(v) => !loading && setForm({ ...form, level: v })} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
                </Field>
              )}
              <Field label="What you already know" optional className="full" hint="The AI skips what you know and builds on it.">
                <Textarea rows={2} value={form.background} onChange={set('background')} placeholder="e.g. 1.5 years of manual testing, basic Java, some Selenium" disabled={loading} />
              </Field>
            </div>
          </Card>

          <Card title="3. Your time and style" className="mb-3">
            <div className="form-grid">
              <Field label="Hours per week">
                <Select value={form.hoursPerWeek} onChange={set('hoursPerWeek')} disabled={loading}>
                  {['2', '4', '6', '8', '10', '15', '20', '30'].map((h) => <option key={h} value={h}>{h} hours</option>)}
                </Select>
              </Field>
              <Field label="Duration">
                <Select value={form.duration} onChange={set('duration')} disabled={loading}>
                  {['2 weeks', '4 weeks', '6 weeks', '8 weeks', '3 months', '6 months'].map((x) => <option key={x}>{x}</option>)}
                </Select>
              </Field>
              <Field label="How you like to learn" className="full">
                <Segmented value={form.style} onChange={(v) => !loading && setForm({ ...form, style: v })} options={STYLES} />
              </Field>
            </div>
          </Card>

          <Card>
            {loading ? (
              <div className="stack">
                <div className="row" style={{ gap: 12 }}>
                  <Spinner />
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{stage.text}…</div>
                    <div className="tiny subtle">Detailed roadmaps take about 30–60 seconds. {elapsed}s</div>
                  </div>
                </div>
                <Progress value={Math.min(95, (elapsed / 50) * 100)} size="sm" />
              </div>
            ) : (
              <div className="row-between row-wrap">
                <span className="small subtle">You’ll get modules, step-by-step tasks, resources, mini-projects, a capstone and interview questions.</span>
                <Button type="submit" variant="primary" size="lg" icon="wand" disabled={!form.topic.trim()}>Generate my roadmap</Button>
              </div>
            )}
          </Card>
        </form>
      )}

      {result && (
        <div className="stack-lg fade-in">
          <Card
            title={d.title || form.topic}
            description={d.description}
            footer={
              <>
                <Button variant="ghost" icon="refresh" onClick={() => setResult(null)}>Generate another</Button>
                <Button variant="primary" iconRight="arrowRight" onClick={() => navigate(result.id ? `/roadmaps/${result.id}` : '/roadmaps')}>Start learning</Button>
              </>
            }
          >
            <div className="kv mb-3">
              <div><div className="tiny subtle">Modules</div><div style={{ fontWeight: 600, fontSize: 18 }}>{mods.length}</div></div>
              <div><div className="tiny subtle">Tasks</div><div style={{ fontWeight: 600, fontSize: 18 }}>{taskCount}</div></div>
              {d.total_hours > 0 && <div><div className="tiny subtle">Total effort</div><div style={{ fontWeight: 600, fontSize: 18 }}>{d.total_hours}h</div></div>}
              <div><div className="tiny subtle">Pace</div><div style={{ fontWeight: 600, fontSize: 18 }}>{form.hoursPerWeek}h/week</div></div>
            </div>

            {d.outcomes?.length > 0 && (
              <div className="callout mb-3">
                <div className="label mb-2">By the end you’ll be able to</div>
                <ul className="check-list">{d.outcomes.map((o, i) => <li key={i}><Icon name="checkCircle" size={14} className="text-success" />{o}</li>)}</ul>
              </div>
            )}

            <div className="steps">
              {mods.map((m, i) => (
                <div key={i} className="step">
                  <div className="step-num">{i + 1}</div>
                  <div>
                    <div className="row row-wrap" style={{ gap: 8 }}>
                      <h3>{m.title}</h3>
                      {m.week && <Badge>{m.week}</Badge>}
                      {m.est_hours > 0 && <Badge><Icon name="clock" size={11} /> {m.est_hours}h</Badge>}
                    </div>
                    {m.outcome && <p className="small mt-1">{m.outcome}</p>}
                    {m.tasks?.length > 0 && (
                      <div className="stack-sm mt-1">
                        {m.tasks.map((t, j) => (
                          <div key={j} className="row small" style={{ gap: 8, color: 'var(--text-2)' }}>
                            <Icon name={TYPE_ICON[t.type] || 'circle'} size={13} className={`type-${t.type}`} />
                            <span className="grow">{t.title}</span>
                            {t.est_minutes > 0 && <span className="tiny subtle nowrap">{formatMinutes(t.est_minutes)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {d.capstone && (
              <div className="callout mt-3">
                <div className="row" style={{ gap: 8 }}><Icon name="trophy" size={16} className="text-accent" /><strong>Capstone: {d.capstone.title}</strong></div>
                <p className="small mt-1">{d.capstone.brief}</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default AIGenerator;
