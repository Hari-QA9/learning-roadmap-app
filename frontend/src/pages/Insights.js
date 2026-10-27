import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Stat, Input, Button, Icon, EmptyState, SkeletonRows, Badge } from '../components/ui';

/** Which skills employers ask for most, from the live job board — and which ones you already have. */
export default function Insights() {
  const navigate = useNavigate();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [role, setRole] = useState('');
  const first = useRef(true);

  const load = (r) => {
    setD(null);
    api.get('/career/insights', { params: r ? { role: r } : {}, noCache: true })
      .then((res) => { setD(res.data); if (first.current) { setRole(res.data.role || ''); first.current = false; } })
      .catch((e) => { toast.error(errorMessage(e, 'Could not load insights')); setD({ error: true, skills: [] }); });
  };
  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const learn = (skill) => navigate(`/ai-generator?topic=${encodeURIComponent(skill)}`);
  const max = Math.max(1, ...(d?.skills || []).map((s) => s.share));

  return (
    <>
      <PageHeader eyebrow="Career" title="Skill insights" description="What employers are asking for right now, from the jobs on LearnMap’s board — and how your skills compare." />
      <Card className="mb-3">
        <form className="row row-wrap" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); load(role.trim()); }}>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role, e.g. Data Analyst, Registered Nurse" aria-label="Target role" style={{ flex: 1, minWidth: 220 }} />
          <Button type="submit" variant="primary" icon="search">Analyse</Button>
        </form>
        {d?.broad && <div className="small muted mt-2">Not many current jobs match “{d.role}” yet, so this shows the whole job board. Results sharpen as more jobs come in.</div>}
      </Card>

      {!d ? <Card><SkeletonRows rows={6} /></Card> : d.error ? null : d.jobs === 0 ? (
        <Card><EmptyState icon="briefcase" title="No job data yet" description="The job board fills up within a few hours of the server starting. Check back soon." /></Card>
      ) : (
        <>
          <div className="grid-4 mb-3">
            <Stat label="Jobs analysed" icon="briefcase" value={d.jobs} note="Last 45 days" />
            <Stat label="Your match" icon="target" value={`${d.coverage}%`} note="of the top 10 skills" />
            <Stat label="Remote" icon="home" value={`${d.remote_share}%`} note="of these jobs" />
            <Stat label="Your skills" icon="checkCircle" value={d.your_skills} note={d.your_skills ? 'from your profile/resume' : 'Add them on the Job board'} />
          </div>
          <div className="split">
            <Card title="Most requested skills" description="Share of jobs that mention each skill" pad={false}>
              <div className="list">
                {d.skills.map((s) => (
                  <div key={s.skill} className="list-row skill-row">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
                        <span className="row" style={{ gap: 6 }}>
                          <strong style={{ color: 'var(--text)' }}>{s.skill}</strong>
                          {s.have ? <Badge tone="success">You have it</Badge> : null}
                          {s.trend >= 3 ? <span className="tiny text-success">▲ {s.trend}%</span> : s.trend <= -3 ? <span className="tiny subtle">▼ {Math.abs(s.trend)}%</span> : null}
                        </span>
                        <span className="tiny subtle nowrap">{s.share}% · {s.jobs} job{s.jobs === 1 ? "" : "s"}</span>
                      </div>
                      <div className="skill-bar"><span className={s.have ? 'have' : ''} style={{ width: `${(s.share / max) * 100}%` }} /></div>
                    </div>
                    {!s.have && <Button size="sm" variant="ghost" onClick={() => learn(s.skill)}>Learn</Button>}
                  </div>
                ))}
              </div>
            </Card>
            <div className="stack-lg">
              {d.next_skill && (
                <Card>
                  <div className="section-label" style={{ margin: 0 }}>Best next skill to learn</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: '4px 0' }}>{d.next_skill.skill}</div>
                  <div className="small muted">Asked for in {d.next_skill.share}% of {d.role ? `“${d.role}”` : 'these'} jobs — and it’s not on your profile yet.</div>
                  <Button className="mt-2" variant="primary" icon="wand" onClick={() => learn(d.next_skill.skill)}>Make a roadmap for it</Button>
                </Card>
              )}
              {d.rising.length > 0 && (
                <Card title="Rising this fortnight">
                  <div className="row row-wrap" style={{ gap: 6 }}>{d.rising.map((s) => <span key={s.skill} className="skill">{s.skill} <span className="text-success">▲{s.trend}%</span></span>)}</div>
                </Card>
              )}
              {d.companies.length > 0 && (
                <Card title="Who’s hiring" pad={false}>
                  <div className="list">{d.companies.map((c) => <div key={c.name} className="list-row small"><Icon name="briefcase" size={14} className="subtle" /><span className="grow truncate">{c.name}</span><strong>{c.jobs}</strong></div>)}</div>
                </Card>
              )}
              {d.salary_examples.length > 0 && (
                <Card title="Salary examples" description={`${d.with_salary} jobs list pay`}>
                  <div className="stack-sm small">{d.salary_examples.map((s, i) => <div key={i}>{s}</div>)}</div>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
