import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, Field, Input, Select, Segmented, EmptyState, SkeletonRows, Badge, Icon, Loading, ConfirmDialog, timeAgo } from '../components/ui';

/** Mock interview home: start a new practice interview, see past ones. */
export default function Interview() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [past, setPast] = useState(null);
  const [mode, setMode] = useState(params.get('job') ? 'job' : 'job');
  const [jobId, setJobId] = useState(params.get('job') || '');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('mixed');
  const [count, setCount] = useState('5');
  const [starting, setStarting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    api.get('/interviews', { noCache: true }).then((r) => setPast(r.data || [])).catch(() => setPast([]));
    Promise.allSettled([api.get('/applications'), api.get('/jobs/recommended', { params: { limit: 8 } })]).then(([a, r]) => {
      const list = [];
      const seen = new Set();
      if (a.status === 'fulfilled') (a.value.data || []).filter((x) => x.job_id).forEach((x) => { if (!seen.has(x.job_id)) { seen.add(x.job_id); list.push({ id: x.job_id, label: `${x.job_title}${x.company ? ` — ${x.company}` : ''}`, group: 'Your saved & applied jobs' }); } });
      if (r.status === 'fulfilled') (r.value.data.jobs || []).forEach((x) => { if (!seen.has(x.id)) { seen.add(x.id); list.push({ id: x.id, label: `${x.title}${x.company ? ` — ${x.company}` : ''}`, group: 'Recommended for you' }); } });
      setJobs(list);
      if (!list.length && !params.get('job')) setMode('role');
    });
  }, [params]);

  const start = async () => {
    if (mode === 'job' && !jobId) return toast.error('Pick a job');
    if (mode === 'role' && !role.trim()) return toast.error('Type the role you’re interviewing for');
    setStarting(true);
    try {
      const r = await api.post('/interviews', { ...(mode === 'job' ? { job_id: Number(jobId) } : { role, company }), type, count: Number(count) });
      navigate(`/interview/${r.data.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not start the interview'));
      setStarting(false);
    }
  };

  const remove = async () => {
    const s = toDelete;
    setToDelete(null);
    setPast((list) => list.filter((x) => x.id !== s.id));
    api.delete(`/interviews/${s.id}`).catch(() => {});
  };

  const groups = jobs.reduce((m, j) => ({ ...m, [j.group]: [...(m[j.group] || []), j] }), {});

  return (
    <>
      <PageHeader eyebrow="Career" title="Mock interview" description="Practice with realistic questions for a specific job, get feedback on every answer, and walk in prepared." />
      <div className="split">
        <Card title="Start a practice interview" description="Takes about 10–15 minutes. You can answer by typing or speaking.">
          {starting ? <Loading label="Preparing questions for this role…" /> : (
            <div className="stack">
              <Segmented value={mode} onChange={setMode} options={[{ value: 'job', label: 'For a job' }, { value: 'role', label: 'For a role' }]} />
              {mode === 'job' ? (
                jobs.length ? (
                  <Field label="Job">
                    <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                      <option value="">Choose a job…</option>
                      {Object.entries(groups).map(([g, list]) => <optgroup key={g} label={g}>{list.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}</optgroup>)}
                      {jobId && !jobs.some((j) => String(j.id) === String(jobId)) && <option value={jobId}>Selected job</option>}
                    </Select>
                  </Field>
                ) : <p className="small muted">No saved jobs yet — switch to “For a role”, or save jobs from the Job board.</p>
              ) : (
                <div className="grid-2">
                  <Field label="Role"><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Registered Nurse, Research Associate" /></Field>
                  <Field label="Company" optional><Input value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
                </div>
              )}
              <div className="grid-2">
                <Field label="Question style">
                  <Select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="mixed">Mixed (recommended)</option>
                    <option value="behavioral">Behavioral (tell me about a time…)</option>
                    <option value="technical">Role-specific knowledge</option>
                  </Select>
                </Field>
                <Field label="Questions">
                  <Select value={count} onChange={(e) => setCount(e.target.value)}>
                    {['3', '5', '8'].map((n) => <option key={n} value={n}>{n} questions</option>)}
                  </Select>
                </Field>
              </div>
              <Button variant="primary" icon="play" onClick={start}>Start interview</Button>
            </div>
          )}
        </Card>

        <Card title="Past interviews" pad={false}>
          {!past ? <SkeletonRows rows={3} /> : past.length === 0 ? (
            <EmptyState icon="message" title="No practice yet" description="Your interviews and scores will show up here so you can see yourself improve." />
          ) : (
            <div className="list">
              {past.map((s) => (
                <div key={s.id} className="list-row clickable" onClick={() => navigate(`/interview/${s.id}`)}>
                  <div className="list-icon"><Icon name="message" size={15} /></div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 500 }}>{s.role}{s.company ? ` · ${s.company}` : ''}</div>
                    <div className="tiny subtle">{s.answered}/{s.total} answered · {timeAgo(s.created_at)}</div>
                  </div>
                  {s.score != null ? <Badge tone={s.score >= 75 ? 'success' : s.score >= 55 ? 'accent' : 'warning'}>{s.score}%</Badge> : <Badge>In progress</Badge>}
                  <Button size="sm" variant="ghost" icon="trash" aria-label="Delete interview" onClick={(e) => { e.stopPropagation(); setToDelete(s); }} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <ConfirmDialog open={!!toDelete} title="Delete this practice interview?" onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
