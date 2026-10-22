import React, { useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { PageHeader, Card, Stat, Badge, Icon, Input, EmptyState, SkeletonRows, Button, timeAgo, formatDate } from '../components/ui';
import { SOURCE_LABEL } from '../components/JobRow';

const Check = ({ on, label }) => (
  <div className="row small" style={{ gap: 6 }}>
    <Icon name={on ? 'checkCircle' : 'circle'} size={14} className={on ? 'text-success' : 'subtle'} />
    <span style={{ color: on ? 'var(--text)' : 'var(--text-3)' }}>{label}</span>
  </div>
);

/** Admin dashboard (only for emails listed in ADMIN_EMAILS). */
export default function Admin() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState('');
  const timer = useRef();
  const latest = useRef('');

  const load = () => api.get('/admin/overview', { noCache: true }).then((r) => setD(r.data)).catch((e) => setError(errorMessage(e, 'Could not load the dashboard')));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    latest.current = query;
    clearTimeout(timer.current);
    const asked = query;
    timer.current = setTimeout(() => api.get('/admin/users', { params: { q: asked }, noCache: true })
      .then((r) => { if (latest.current === asked) setUsers(r.data); })   // ignore answers to older searches
      .catch(() => { if (latest.current === asked) setUsers([]); }), 250);
  }, [query]);

  if (error) return <EmptyState icon="lock" title="Admins only" description={error} />;
  if (!d) return <Card><SkeletonRows rows={6} /></Card>;

  const max = Math.max(1, ...d.signups.map((s) => s.count));
  const verifiedPct = d.users.total ? Math.round((d.users.verified / d.users.total) * 100) : 0;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Dashboard" description="Growth, engagement, AI usage and health — at a glance." actions={<Button icon="refresh" onClick={load}>Refresh</Button>} />

      <div className="grid-4 mb-3">
        <Stat label="Members" icon="user" value={d.users.total} note={`+${d.users.new7} this week · +${d.users.new30} this month`} />
        <Stat label="Active this week" icon="flame" value={d.users.active7} note={d.users.total ? `${Math.round((d.users.active7 / d.users.total) * 100)}% of members finished a task` : undefined} />
        <Stat label="AI requests" icon="sparkles" value={d.ai.today} note={`today · ${d.ai.week} this week · ${d.ai.month} this month`} />
        <Stat label="Tasks finished" icon="checkCircle" value={d.learning.tasksDone7} note={`last 7 days · ${d.learning.roadmaps} roadmaps · ${d.learning.interviews} mock interviews`} />
      </div>

      <div className="split">
        <div className="stack-lg">
          <Card title="Sign-ups" description="Last 14 days">
            <div className="admin-bars">
              {d.signups.map((s) => (
                <div key={s.day} className="admin-bar" title={`${s.day}: ${s.count}`}>
                  <span style={{ height: `${Math.max(3, (s.count / max) * 100)}%`, opacity: s.count ? 1 : 0.25 }} />
                  <em>{new Date(`${s.day}T12:00:00`).getDate()}</em>
                </div>
              ))}
            </div>
            <div className="row row-wrap mt-2 small muted" style={{ gap: 16 }}>
              <span>{verifiedPct}% confirmed their email</span>
              <span>{d.users.onboarded} finished the welcome setup</span>
            </div>
          </Card>

          <Card title="Members" pad={false} actions={<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" style={{ width: 220, height: 32 }} aria-label="Search members" />}>
            {!users ? <SkeletonRows rows={4} /> : users.length === 0 ? <EmptyState icon="user" title="No members found" /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Last visit</th><th>Roadmaps</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td className="truncate" style={{ maxWidth: 220 }}>{u.email} {!u.email_verified && <Badge tone="warning">unconfirmed</Badge>}</td>
                        <td className="nowrap">{u.created_at ? formatDate(u.created_at, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                        <td className="nowrap">{u.last_active ? formatDate(u.last_active, { month: 'short', day: 'numeric' }) : '—'}</td>
                        <td>{u.roadmaps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Recent feedback" pad={false}>
            {d.feedback.length === 0 ? <EmptyState icon="feedback" title="No feedback yet" /> : (
              <div className="list">
                {d.feedback.map((f) => (
                  <div key={f.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="grow"><div className="small" style={{ color: 'var(--text)' }}>{f.message}</div><div className="tiny subtle mt-1">{f.user} · {timeAgo(f.created_at)}</div></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="stack-lg">
          <Card title="System">
            <div className="stack-sm">
              <Check on={d.system.email} label="Email sending (SMTP)" />
              <Check on={d.system.scheduler} label="Reminders & alerts scheduler" />
              <Check on={d.system.googleSignIn} label="Sign in with Google" />
              <Check on={d.system.adzuna} label="Adzuna jobs" />
              <Check on={d.system.jsearch} label="JSearch (LinkedIn/Indeed) jobs" />
              <Check on={d.system.youtube} label="YouTube video resources" />
              <div className="tiny subtle mt-1">Node {d.system.node} · up {d.system.uptimeMin < 120 ? `${d.system.uptimeMin} min` : `${Math.round(d.system.uptimeMin / 60)} h`}</div>
            </div>
          </Card>

          <Card title="AI usage" description="Last 7 days" pad={false}>
            <div className="list">
              {d.ai.byKind.length === 0 && <div className="list-row small muted">No AI requests yet.</div>}
              {d.ai.byKind.map((k) => <div key={k.kind} className="list-row small"><span className="grow">{k.kind}</span><strong>{k.n}</strong></div>)}
            </div>
            {d.ai.topUsers.length > 0 && (
              <>
                <div className="section-label" style={{ padding: '0 20px' }}>Heaviest users</div>
                <div className="list">{d.ai.topUsers.map((u) => <div key={u.id} className="list-row small"><span className="grow truncate">{u.name} <span className="subtle">{u.email}</span></span><strong>{u.n}</strong></div>)}</div>
              </>
            )}
          </Card>

          <Card title="Job board" description={`${d.jobs.total} jobs · ${d.jobs.custom} added by members`} pad={false}>
            <div className="list">
              {d.jobs.bySource.map((s) => <div key={s.source} className="list-row small"><span className="grow">{SOURCE_LABEL[s.source] || s.source}</span><span className="tiny subtle">{s.last ? timeAgo(s.last) : ''}</span><strong style={{ width: 44, textAlign: 'right' }}>{s.n}</strong></div>)}
            </div>
            {d.applications.length > 0 && <div className="tiny subtle" style={{ padding: '10px 20px' }}>Applications: {d.applications.map((a) => `${a.n} ${a.status}`).join(' · ')}</div>}
          </Card>

          <Card title="Recent errors" description="Since the server last started" pad={false}>
            {d.errors.length === 0 ? <div className="list-row small text-success"><Icon name="checkCircle" size={14} /> No errors</div> : (
              <div className="list">
                {d.errors.map((e, i) => <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}><div className="grow"><div className="tiny mono" style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{e.message}</div><div className="tiny subtle">{timeAgo(e.at)}</div></div></div>)}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
