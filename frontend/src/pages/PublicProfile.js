import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import PublicLayout from '../components/growth/PublicLayout';
import { Avatar, Badge, Button, EmptyState, Icon, Loading, Progress, formatDate } from '../components/ui';
import { shareLink, siteUrl } from '../lib/growth';
import { useToast } from '../components/Toast';

const range = (e) => [e.start, e.current ? 'Present' : e.end].filter(Boolean).join(' – ');
const LINKS = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'user' },
  { key: 'github', label: 'GitHub', icon: 'file' },
  { key: 'website', label: 'Website', icon: 'link' },
];

function Section({ title, children }) {
  return (
    <section className="pub-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function PublicProfile() {
  const { username } = useParams();
  const toast = useToast();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setP(null); setError('');
    api.get(`/public/u/${encodeURIComponent(username)}`, { noCache: true })
      .then((r) => { setP(r.data); document.title = `${r.data.name} · Learnvoy`; })
      .catch((e) => setError(errorMessage(e, 'This profile doesn’t exist or is private.')));
    return () => { document.title = 'Learnvoy'; };
  }, [username]);

  const share = async () => {
    const r = await shareLink({ title: `${p.name} on Learnvoy`, text: p.headline || 'My learning portfolio', url: siteUrl(`/u/${p.username}`) });
    if (r === 'copied') toast.success('Link copied');
  };

  if (error) return <PublicLayout><EmptyState icon="user" title="Profile not found" description={error} action={<Link className="btn btn-primary" to="/">Go to Learnvoy</Link>} /></PublicLayout>;
  if (!p) return <PublicLayout><Loading /></PublicLayout>;
  const links = LINKS.filter((l) => p.links?.[l.key]);
  const r = p.resume;

  return (
    <PublicLayout cta="Make your own">
      <div className="pub-hero">
        <Avatar name={p.name} src={p.photo} size="lg" />
        <div className="grow" style={{ minWidth: 0 }}>
          <h1>{p.name}</h1>
          {p.headline && <div className="pub-headline">{p.headline}</div>}
          {p.bio && <p className="muted mt-1">{p.bio}</p>}
          <div className="row row-wrap mt-2" style={{ gap: 8 }}>
            {links.map((l) => (
              <a key={l.key} className="btn btn-secondary btn-sm" href={p.links[l.key]} target="_blank" rel="noopener noreferrer nofollow">
                <Icon name={l.icon} size={14} />{l.label}
              </a>
            ))}
            <Button size="sm" variant="ghost" icon="send" onClick={share}>Share</Button>
          </div>
        </div>
      </div>

      {p.stats && (
        <div className="pub-stats">
          <div><strong>{p.stats.streak}</strong><span>day streak</span></div>
          <div><strong>{p.stats.tasks_done}</strong><span>tasks finished</span></div>
          <div><strong>{p.certificates?.length ?? 0}</strong><span>certificates</span></div>
          <div><strong>{p.stats.badges}</strong><span>badges</span></div>
        </div>
      )}

      {p.skills?.length > 0 && (
        <Section title="Skills">
          <div className="row row-wrap" style={{ gap: 6 }}>{p.skills.map((s) => <span key={s} className="skill">{s}</span>)}</div>
        </Section>
      )}

      {p.roadmaps?.length > 0 && (
        <Section title="Learning roadmaps">
          <div className="pub-grid">
            {p.roadmaps.map((rm, i) => (
              <div key={i} className="card pub-card">
                <div className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <strong className="pub-card-title">{rm.title}</strong>
                  {rm.progress === 100 ? <Badge tone="success">Done</Badge> : <span className="tiny subtle nowrap">{rm.progress}%</span>}
                </div>
                {rm.description && <p className="small muted mt-1 clamp-2">{rm.description}</p>}
                <div className="mt-2"><Progress value={rm.progress} size="sm" tone={rm.progress === 100 ? 'success' : undefined} /></div>
                {rm.share_slug && (
                  <Link to={`/r/${rm.share_slug}`} className="small mt-2" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <Icon name="copy" size={13} /> Use this roadmap{rm.copies ? ` · ${rm.copies} copied` : ''}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {p.certificates?.length > 0 && (
        <Section title="Certificates">
          <div className="list card" style={{ padding: 0 }}>
            {p.certificates.map((c) => (
              <Link key={c.certificate_id} to={`/verify/${c.certificate_id}`} className="list-row clickable" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="list-icon"><Icon name="award" size={15} /></div>
                <div className="grow"><div style={{ fontWeight: 500 }}>{c.roadmap_title}</div><div className="tiny subtle">Issued {formatDate(c.issued_at, { month: 'short', year: 'numeric' })} · {c.certificate_id}</div></div>
                <Badge tone="success" dot>Verified</Badge>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {r && (
        <>
          {r.summary && <Section title="About"><p className="pub-prose">{r.summary}</p></Section>}
          {r.experience?.length > 0 && (
            <Section title="Experience">
              {r.experience.map((e, i) => (
                <div key={i} className="pub-entry">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}><strong>{[e.title, e.company].filter(Boolean).join(' · ')}</strong><span className="tiny subtle nowrap">{range(e)}</span></div>
                  {e.bullets?.length > 0 && <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
                </div>
              ))}
            </Section>
          )}
          {r.projects?.length > 0 && (
            <Section title="Projects">
              {r.projects.map((e, i) => (
                <div key={i} className="pub-entry">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <strong>{e.name}{e.tech ? <span className="muted" style={{ fontWeight: 400 }}> — {e.tech}</span> : null}</strong>
                    <span className="tiny subtle nowrap">{range(e)}</span>
                  </div>
                  {/^https?:\/\//i.test(e.link || '') && <a className="small" href={e.link} target="_blank" rel="noopener noreferrer nofollow">{e.link.replace(/^https?:\/\//, '')}</a>}
                  {e.bullets?.length > 0 && <ul>{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
                </div>
              ))}
            </Section>
          )}
          {r.education?.length > 0 && (
            <Section title="Education">
              {r.education.map((e, i) => (
                <div key={i} className="pub-entry row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <strong>{[e.degree, e.school].filter(Boolean).join(' · ')}</strong><span className="tiny subtle nowrap">{range(e)}</span>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      <div className="pub-cta card">
        <div className="grow">
          <strong>Build a portfolio like this</strong>
          <div className="small muted">Free roadmaps, AI study help, a resume builder and job matching — all in one place.</div>
        </div>
        <Link className="btn btn-primary" to="/signup">Start free</Link>
      </div>
      <div className="tiny subtle center mt-2">Member since {formatDate(p.member_since, { month: 'long', year: 'numeric' })}</div>
    </PublicLayout>
  );
}
