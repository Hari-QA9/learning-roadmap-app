import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import JobPrefsModal from '../components/JobPrefsModal';
import { STATUS, matchTone, sourceName } from '../components/JobRow';
import {
  PageHeader, Button, Card, Badge, Icon, Ring, Tabs, EmptyState, Loading, SkeletonRows, Select, timeAgo,
} from '../components/ui';

const VERDICT_TONE = { 'apply now': 'success', 'apply after quick prep': 'accent', 'build skills first': 'warning' };

function CopyButton({ text, label = 'Copy' }) {
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="ghost"
      icon="copy"
      onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => toast.error('Could not copy'))}
    >
      {label}
    </Button>
  );
}

function Description({ text }) {
  const [open, setOpen] = useState(false);
  const long = (text || '').length > 1400;
  return (
    <div>
      <div className={`job-desc ${long && !open ? 'clamped' : ''}`}>{text || 'No description provided.'}</div>
      {long && <Button size="sm" variant="ghost" className="mt-1" iconRight={open ? undefined : 'chevronDown'} onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Show full description'}</Button>}
    </div>
  );
}

function Analysis({ a }) {
  return (
    <div className="stack-lg fade-in">
      <div className="row" style={{ gap: 18, alignItems: 'center' }}>
        <Ring value={a.fit_score} size={84} tone={matchTone(a.fit_score) === 'warning' ? 'warning' : matchTone(a.fit_score) === 'success' ? 'success' : 'accent'} />
        <div className="grow">
          {a.verdict && <Badge tone={VERDICT_TONE[String(a.verdict).toLowerCase()] || 'accent'}>{a.verdict}</Badge>}
          <p className="mt-1" style={{ color: 'var(--text)' }}>{a.summary}</p>
        </div>
      </div>
      {a.strengths?.length > 0 && (
        <div>
          <div className="section-label">Why you fit</div>
          <ul className="check-list">{a.strengths.map((s, i) => <li key={i}><Icon name="checkCircle" size={14} className="text-success" />{s}</li>)}</ul>
        </div>
      )}
      {a.gaps?.length > 0 && (
        <div>
          <div className="section-label">Gaps to close</div>
          <div className="stack-sm">
            {a.gaps.map((g, i) => (
              <div key={i} className="gap-item">
                <div className="row-between">
                  <strong>{g.skill}</strong>
                  <div className="row" style={{ gap: 6 }}>
                    <Badge tone={g.importance === 'must-have' ? 'danger' : undefined}>{g.importance}</Badge>
                    {g.time && <span className="tiny subtle nowrap">{g.time}</span>}
                  </div>
                </div>
                <div className="small muted mt-1">{g.how_to_close}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {a.talking_points?.length > 0 && (
        <div>
          <div className="section-label">How to position yourself</div>
          <ul className="check-list">{a.talking_points.map((s, i) => <li key={i}><Icon name="message" size={14} />{s}</li>)}</ul>
        </div>
      )}
      {a.red_flags?.length > 0 && (
        <div>
          <div className="section-label">Check before applying</div>
          <ul className="check-list">{a.red_flags.map((s, i) => <li key={i}><Icon name="alert" size={14} className="text-warning" />{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Kit({ kit }) {
  const [tab, setTab] = useState('letter');
  const resumeText = [kit.headline, '', kit.summary, '', ...(kit.bullets || []).map((b) => `• ${b.improved}`)].join('\n');
  return (
    <div className="fade-in">
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'letter', label: 'Cover letter' }, { value: 'resume', label: 'Resume tweaks' }, { value: 'answers', label: 'Q&A' }, { value: 'steps', label: 'Checklist' }]} />
      <div className="mt-3">
        {tab === 'letter' && (
          <>
            <div className="row-between mb-2"><span className="tiny subtle">Fill in any [placeholders] before sending.</span><CopyButton text={kit.cover_letter || ''} /></div>
            <div className="job-desc letter">{kit.cover_letter}</div>
          </>
        )}
        {tab === 'resume' && (
          <div className="stack">
            <div className="row-between"><div className="section-label" style={{ margin: 0 }}>Headline & summary</div><CopyButton text={resumeText} label="Copy all" /></div>
            <div className="callout"><strong>{kit.headline}</strong><p className="small mt-1" style={{ color: 'var(--text)' }}>{kit.summary}</p></div>
            {kit.bullets?.length > 0 && (
              <>
                <div className="section-label">Stronger bullet points</div>
                {kit.bullets.map((b, i) => (
                  <div key={i} className="gap-item">
                    <div className="tiny subtle">{b.original_hint}</div>
                    <div className="small mt-1" style={{ color: 'var(--text)' }}>{b.improved}</div>
                  </div>
                ))}
              </>
            )}
            {kit.keywords?.length > 0 && (
              <>
                <div className="section-label">Keywords for applicant tracking systems</div>
                <div className="chip-row">{kit.keywords.map((k) => <span key={k} className="skill">{k}</span>)}</div>
              </>
            )}
          </div>
        )}
        {tab === 'answers' && (
          <div className="stack">
            {(kit.answers || []).map((a, i) => (
              <div key={i} className="gap-item">
                <div className="row-between"><strong className="small">{a.question}</strong><CopyButton text={a.answer} /></div>
                <div className="small mt-1" style={{ color: 'var(--text)' }}>{a.answer}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'steps' && (
          <ul className="check-list">{(kit.checklist || []).map((s, i) => <li key={i}><Icon name="circle" size={14} />{s}</li>)}</ul>
        )}
      </div>
    </div>
  );
}

function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);

  const load = () =>
    api.get(`/jobs/${id}`, { noCache: true })
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load this job')));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const run = async (kind) => {
    setBusy(kind);
    try {
      if (kind === 'analyze') {
        const r = await api.post(`/jobs/${id}/analyze`);
        setData((d) => ({ ...d, analysis: r.data.analysis }));
      } else if (kind === 'prepare') {
        const r = await api.post(`/jobs/${id}/prepare`);
        setData((d) => ({ ...d, kit: r.data.kit, job: { ...d.job, status: d.job.status || 'saved' } }));
        toast.success('Application kit ready — saved to your tracker');
      } else if (kind === 'roadmap') {
        const r = await api.post(`/jobs/${id}/gap-roadmap`, { duration: '4 weeks', hoursPerWeek: 8 });
        toast.success('Your gap roadmap is ready');
        navigate(`/roadmaps/${r.data.roadmapId}`);
      }
    } catch (e) {
      toast.error(errorMessage(e, 'The AI could not finish that — please try again'));
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (status) => {
    try {
      if (data.job.application_id) await api.put(`/applications/${data.job.application_id}`, { status });
      else {
        const r = await api.post('/applications', { job_id: data.job.id, status });
        setData((d) => ({ ...d, job: { ...d.job, application_id: r.data.id } }));
      }
      setData((d) => ({ ...d, job: { ...d.job, status } }));
      toast.success(status === 'applied' ? 'Marked as applied — good luck!' : `Moved to ${STATUS[status].label}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update'));
    }
  };

  const applyNow = () => {
    if (data.job.url) window.open(data.job.url, '_blank', 'noopener,noreferrer');
    if (!data.job.status || data.job.status === 'saved') setStatus('applied');
  };

  if (error) return <EmptyState icon="briefcase" title="Job not available" description={error} action={<Button onClick={() => navigate('/jobs')}>Back to jobs</Button>} />;
  if (!data) return <Card><SkeletonRows rows={6} /></Card>;

  const { job, analysis, kit, roadmap_id: roadmapId } = data;
  const noProfile = !data.profile?.skills?.length && !data.profile?.target_roles?.length;

  return (
    <>
      <PageHeader
        back="/jobs"
        eyebrow={[job.company, job.source !== 'custom' && `via ${sourceName(job)}`].filter(Boolean).join(' · ')}
        title={job.title}
        description={[job.location, job.remote && !/remote/i.test(job.location || '') ? 'Remote' : null, job.job_type, job.salary, job.posted_at && `Posted ${timeAgo(job.posted_at)}`].filter(Boolean).join(' · ')}
        actions={
          <>
            {job.status ? (
              <Select value={job.status} onChange={(e) => setStatus(e.target.value)} aria-label="Application status" style={{ width: 150 }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            ) : (
              <Button icon="star" onClick={() => setStatus('saved')}>Save</Button>
            )}
            {job.url && <Button variant="primary" iconRight="arrowUpRight" onClick={applyNow}>{job.publisher ? `Apply on ${job.publisher}` : 'Apply on company site'}</Button>}
          </>
        }
      />

      <div className="split">
        <div className="stack-lg">
          <Card title="Your match" description="Based on the skills this posting mentions" actions={<Button size="sm" variant="ghost" icon="settings" onClick={() => setPrefsOpen(true)}>Edit skills</Button>}>
            {noProfile ? (
              <EmptyState icon="target" title="Add your skills to see your match" action={<Button variant="primary" onClick={() => setPrefsOpen(true)}>Set preferences</Button>} />
            ) : (
              <div className="row match-summary" style={{ gap: 20, alignItems: 'flex-start' }}>
                <Ring value={job.match || 0} size={88} tone={matchTone(job.match) === 'warning' ? 'warning' : matchTone(job.match) === 'success' ? 'success' : 'accent'} />
                <div className="grow stack-sm">
                  {job.have.length > 0 && (
                    <div>
                      <div className="section-label" style={{ marginTop: 0 }}>You have</div>
                      <div className="chip-row">{job.have.map((s) => <span key={s} className="skill have"><Icon name="check" size={11} />{s}</span>)}</div>
                    </div>
                  )}
                  {job.missing.length > 0 ? (
                    <div>
                      <div className="section-label">To learn</div>
                      <div className="chip-row">{job.missing.map((s) => <span key={s} className="skill gap">{s}</span>)}</div>
                    </div>
                  ) : (
                    <p className="small">You have every skill this posting lists. Prepare your application and apply.</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card
            title="AI fit analysis"
            description="An honest read on your chances, the must-have gaps, and how to pitch yourself"
            actions={analysis && <Button size="sm" variant="ghost" icon="refresh" loading={busy === 'analyze'} onClick={() => run('analyze')}>Redo</Button>}
          >
            {busy === 'analyze' && !analysis ? <Loading label="Reading the posting and your profile…" />
              : analysis ? <Analysis a={analysis} />
                : <div className="agent-cta"><p className="small">Compares the full job description with your skills, resume and experience.</p><Button variant="primary" icon="sparkles" onClick={() => run('analyze')}>Analyse my fit</Button></div>}
          </Card>

          <Card
            title="Application kit"
            description="A tailored cover letter, resume bullets, ATS keywords and answers to common questions"
            actions={
              <div className="row" style={{ gap: 4 }}>
                <Button size="sm" variant="ghost" icon="file" onClick={() => navigate(`/resume-builder?job=${job.id}`)}>Tailor my resume</Button>
                {kit && <Button size="sm" variant="ghost" icon="refresh" loading={busy === 'prepare'} onClick={() => run('prepare')}>Rewrite</Button>}
              </div>
            }
          >
            {busy === 'prepare' && !kit ? <Loading label="Writing your application…" />
              : kit ? <Kit kit={kit} />
                : <div className="agent-cta"><p className="small">Written from your own resume — nothing invented. You review it and apply yourself.</p><Button variant="primary" icon="wand" onClick={() => run('prepare')}>Prepare my application</Button></div>}
          </Card>

          <Card title="Job description" description={job.source === 'adzuna' ? 'Preview — open the full posting for every requirement' : job.url ? 'Full posting on the employer’s site' : undefined} actions={job.url && <a className="btn btn-ghost btn-sm" href={job.url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} />Open</a>}>
            <Description text={job.description} />
          </Card>
        </div>

        <div className="stack-lg">
          <Card title="Close the gap" description="Turn what’s missing into a step-by-step learning plan">
            {roadmapId ? (
              <div className="stack-sm">
                <p className="small">Your 4-week plan for this role is ready.</p>
                <Button variant="primary" iconRight="arrowRight" onClick={() => navigate(`/roadmaps/${roadmapId}`)}>Open roadmap</Button>
                <Button size="sm" variant="ghost" loading={busy === 'roadmap'} onClick={() => run('roadmap')}>Build a new one</Button>
              </div>
            ) : (
              <div className="stack-sm">
                <p className="small">
                  {job.missing.length
                    ? <>We’ll build a 4-week roadmap covering <strong>{job.missing.slice(0, 4).join(', ')}{job.missing.length > 4 ? '…' : ''}</strong> with projects that match this job.</>
                    : 'Run the fit analysis first to find hidden gaps, or build a plan to sharpen your skills for this role.'}
                </p>
                <Button variant="primary" icon="map" loading={busy === 'roadmap'} onClick={() => run('roadmap')}>Build gap roadmap</Button>
                {busy === 'roadmap' && <span className="tiny subtle">This takes about 30 seconds.</span>}
              </div>
            )}
          </Card>

          <Card title="How to apply" pad>
            <ol className="steps-plain">
              <li className={analysis ? 'done' : ''}>Analyse your fit</li>
              <li className={kit ? 'done' : ''}>Prepare your application</li>
              <li className={['applied', 'interviewing', 'offer'].includes(job.status) ? 'done' : ''}>Apply on the company site</li>
              <li className={['interviewing', 'offer'].includes(job.status) ? 'done' : ''}>Track it until you hear back</li>
            </ol>
            <div className="row row-wrap mt-2" style={{ gap: 6 }}>
              <Button size="sm" icon="message" onClick={() => navigate(`/interview?job=${job.id}`)}>Practice the interview</Button>
              <Button size="sm" icon="file" onClick={() => navigate(`/cover-letters?job=${job.id}`)}>Cover letter</Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" iconRight="arrowRight" onClick={() => navigate('/applications')}>Open tracker</Button>
          </Card>
        </div>
      </div>

      <JobPrefsModal open={prefsOpen} onClose={() => setPrefsOpen(false)} onSaved={load} />
    </>
  );
}

export default JobDetail;
