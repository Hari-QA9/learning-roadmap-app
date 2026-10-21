import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, Field, Input, Select, Alert, Icon, Badge, Segmented, Spinner } from '../components/ui';

const SUGGESTIONS = ['Python for data analysis', 'React and TypeScript', 'Selenium test automation', 'System design basics', 'AWS cloud fundamentals', 'SQL for analysts'];
const STAGES = ['Reading your topic', 'Designing modules', 'Writing tasks', 'Finding free resources', 'Saving your roadmap'];

function AIGenerator() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get('topic') || '');
  const [duration, setDuration] = useState('4 weeks');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Progress hints while the AI works (it usually takes 10–30s).
  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [loading]);

  const generate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) { setError('Tell us what you want to learn.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post('/ai/generate', { topic: topic.trim(), duration, level });
      setResult({ id: r.data.roadmapId, data: r.data.data || {} });
      toast.success('Roadmap created');
    } catch (err) {
      setError(errorMessage(err, 'Could not generate the roadmap. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setTopic(''); setError(''); };
  const mods = result?.data?.modules || [];
  const res = result?.data?.resources || [];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <PageHeader
        title="Roadmap generator"
        description="Describe what you want to learn. AI drafts modules, tasks and free resources, and saves it as a roadmap you can edit."
      />

      {!result && (
        <Card>
          <form onSubmit={generate}>
            {error && <div className="mb-2"><Alert tone="danger" onClose={() => setError('')}>{error}</Alert></div>}
            <Field label="What do you want to learn?">
              <Input
                autoFocus
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Playwright end-to-end testing with TypeScript"
                disabled={loading}
                style={{ height: 44, fontSize: 15 }}
              />
            </Field>
            <div className="row row-wrap mt-2" style={{ gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="badge" style={{ cursor: 'pointer', height: 26 }} disabled={loading} onClick={() => setTopic(s)}>{s}</button>
              ))}
            </div>
            <div className="form-grid mt-3">
              <Field label="Duration">
                <Select value={duration} onChange={(e) => setDuration(e.target.value)} disabled={loading}>
                  {['1 week', '2 weeks', '4 weeks', '6 weeks', '8 weeks', '3 months', '6 months'].map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Your level">
                <Segmented value={level} onChange={(v) => !loading && setLevel(v)} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} />
              </Field>
            </div>
            <hr />
            {loading ? (
              <div className="row" style={{ gap: 12 }}>
                <Spinner />
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{STAGES[stage]}…</div>
                  <div className="tiny subtle">This usually takes 10–30 seconds.</div>
                </div>
              </div>
            ) : (
              <div className="row-between">
                <span className="small subtle">You can edit everything afterwards.</span>
                <Button type="submit" variant="primary" icon="wand" disabled={!topic.trim()}>Generate roadmap</Button>
              </div>
            )}
          </form>
        </Card>
      )}

      {result && (
        <div className="stack-lg fade-in">
          <Alert tone="success">Your roadmap is saved. Open it to start working through the tasks.</Alert>
          <Card
            title={result.data.title || topic}
            description={result.data.description}
            actions={<Badge><Icon name="clock" size={11} /> {duration}</Badge>}
            footer={
              <>
                <Button variant="ghost" icon="refresh" onClick={reset}>Generate another</Button>
                <Button variant="primary" iconRight="arrowRight" onClick={() => navigate(result.id ? `/roadmaps/${result.id}` : '/roadmaps')}>Open roadmap</Button>
              </>
            }
          >
            {result.data.goal && <p className="mb-3"><strong>Goal:</strong> {result.data.goal}</p>}
            <div className="steps">
              {mods.map((m, i) => (
                <div key={i} className="step">
                  <div className="step-num">{i + 1}</div>
                  <div>
                    <h3>{m.title}</h3>
                    {m.description && <p className="small mt-1">{m.description}</p>}
                    {Array.isArray(m.tasks) && m.tasks.length > 0 && (
                      <ul className="small mt-1" style={{ paddingLeft: 18, color: 'var(--text-2)' }}>
                        {m.tasks.map((t, j) => <li key={j}>{typeof t === 'string' ? t : t.title}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {res.length > 0 && (
              <>
                <hr />
                <h3 className="mb-2">Free resources</h3>
                <div className="stack-sm">
                  {res.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="row small" style={{ gap: 8 }}>
                      <Icon name="external" size={13} /> <span className="truncate">{r.title}</span> <span className="subtle">· {r.type}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default AIGenerator;
