import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { PageHeader, Button, Card, Field, Input, Textarea, Alert, Badge, Progress, Icon, EmptyState, Spinner } from '../components/ui';

const STORE = 'learnmap.career';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };

function CareerAdvisor() {
  const navigate = useNavigate();
  const saved = load();
  const [form, setForm] = useState(saved.form || { skills: '', experience: '', interests: '', education: '', location: '' });
  const [result, setResult] = useState(saved.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.skills.trim()) { setError('Add at least one skill so the advice is relevant.'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/ai/career-advice', form);
      setResult(r.data);
      try { localStorage.setItem(STORE, JSON.stringify({ form, result: r.data })); } catch {}
    } catch (err) {
      setError(errorMessage(err, 'Could not get advice. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const gaps = (result?.skillGaps || []).map((g) => (typeof g === 'string' ? { skill: g } : g));
  const steps = result?.nextSteps || [];
  const tone = (p) => (p === 'high' ? 'danger' : p === 'medium' ? 'warning' : undefined);

  return (
    <>
      <PageHeader title="Career advisor" description="Describe where you are today. Get matching roles, the skills you’re missing, and concrete next steps." />

      <div className="split form-left">
        <Card title="Your profile" className="sticky-top">
          <form onSubmit={submit}>
            {error && <div className="mb-2"><Alert tone="danger" onClose={() => setError('')}>{error}</Alert></div>}
            <Field label="Skills" hint="Comma-separated is fine.">
              <Textarea rows={3} value={form.skills} onChange={set('skills')} placeholder="e.g. Cell culture, PCR, Excel — or Python, SQL, Git" />
            </Field>
            <Field label="Experience" optional>
              <Textarea rows={2} value={form.experience} onChange={set('experience')} placeholder="1.5 years as a test engineer" />
            </Field>
            <Field label="Interests" optional>
              <Input value={form.interests} onChange={set('interests')} placeholder="Automation, AI, developer tools" />
            </Field>
            <Field label="Education" optional>
              <Input value={form.education} onChange={set('education')} placeholder="MS Computer Science" />
            </Field>
            <Field label="Job market" optional>
              <Input value={form.location} onChange={set('location')} placeholder="New York / remote (US)" />
            </Field>
            <Button type="submit" variant="primary" block loading={loading} icon="compass" className="mt-3">
              {result ? 'Update advice' : 'Get advice'}
            </Button>
          </form>
        </Card>

        <div className="stack-lg">
          {loading && !result && (
            <Card><div className="loading-block"><Spinner /> Analysing your profile…</div></Card>
          )}
          {!loading && !result && (
            <Card><EmptyState icon="compass" title="Your advice will appear here" description="Fill in your skills and press Get advice. It takes about 10 seconds." /></Card>
          )}
          {result && (
            <div className="stack-lg fade-in" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity var(--dur)' }}>
              {(result.summary || result.advice) && (
                <Card>
                  <p style={{ color: 'var(--text)', fontSize: 15, lineHeight: 1.65 }}>{result.summary || result.advice}</p>
                </Card>
              )}

              {result.roles?.length > 0 && (
                <Card title="Roles that fit" pad={false}>
                  <div className="list">
                    {result.roles.map((r, i) => (
                      <div key={i} className="list-row" style={{ alignItems: 'flex-start', padding: '14px 20px' }}>
                        <div className="grow">
                          <div className="row-between">
                            <div style={{ fontWeight: 500 }}>{r.title}</div>
                            <span className="small muted nowrap">{r.match}% match</span>
                          </div>
                          <div className="mt-1"><Progress value={r.match} size="sm" tone={r.match >= 80 ? 'success' : undefined} /></div>
                          <div className="row row-wrap tiny subtle mt-1" style={{ gap: 10 }}>
                            {r.salary && <span>{r.salary}</span>}
                            {r.why && <span>· {r.why}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {gaps.length > 0 && (
                <Card title="Skills to build" description="Turn any gap into a roadmap in one click." pad={false}>
                  <div className="list">
                    {gaps.map((g, i) => (
                      <div key={i} className="list-row">
                        <div className="grow">
                          <div className="row" style={{ gap: 8 }}>
                            <span style={{ fontWeight: 500 }}>{g.skill}</span>
                            {g.priority && <Badge tone={tone(g.priority)}>{g.priority}</Badge>}
                          </div>
                          {g.how && <div className="tiny subtle mt-1">{g.how}</div>}
                        </div>
                        <Button size="sm" icon="wand" onClick={() => navigate(`/ai-generator?topic=${encodeURIComponent(g.skill)}`)}>Roadmap</Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {steps.length > 0 && (
                <Card title="Next steps">
                  <div className="steps">
                    {steps.map((s, i) => (
                      <div key={i} className="step"><div className="step-num">{i + 1}</div><p style={{ color: 'var(--text)', paddingTop: 3 }}>{s}</p></div>
                    ))}
                  </div>
                </Card>
              )}

              {result.companies?.length > 0 && (
                <Card title="Companies to look at">
                  <div className="row row-wrap" style={{ gap: 6 }}>
                    {result.companies.map((c, i) => <Badge key={`${c}-${i}`}><Icon name="briefcase" size={11} /> {c}</Badge>)}
                  </div>
                </Card>
              )}

              {result.summary && result.advice && (
                <Card title="Advice"><p style={{ color: 'var(--text)' }}>{result.advice}</p></Card>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CareerAdvisor;
