import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, isLoggedIn } from '../lib/api';
import PublicLayout from '../components/growth/PublicLayout';
import { Badge, Button, EmptyState, Icon, Loading, formatMinutes } from '../components/ui';
import { useToast } from '../components/Toast';
import { shareLink, siteUrl } from '../lib/growth';

const TYPE_ICON = { learn: 'book', practice: 'target', build: 'wand', review: 'refresh' };

export default function SharedRoadmap() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [copying, setCopying] = useState(false);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    api.get(`/public/roadmaps/${encodeURIComponent(slug)}`, { noCache: true })
      .then((res) => { setR(res.data); document.title = `${res.data.title} · LearnMap roadmap`; })
      .catch((e) => setError(errorMessage(e, 'This roadmap is no longer shared.')));
    return () => { document.title = 'LearnMap'; };
  }, [slug]);

  const copy = async () => {
    if (!isLoggedIn()) {
      // Come back here after signing up and copy it then.
      try { sessionStorage.setItem('learnmap.afterAuth', `/r/${slug}?copy=1`); } catch {}
      navigate('/signup');
      return;
    }
    setCopying(true);
    try {
      const res = await api.post(`/growth/roadmaps/copy/${encodeURIComponent(slug)}`);
      toast.success('Added to your roadmaps');
      navigate(`/roadmaps/${res.data.roadmapId}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not copy this roadmap'));
      setCopying(false);
    }
  };

  // Arrived back from sign-up with ?copy=1 → copy straight away.
  useEffect(() => {
    if (r && isLoggedIn() && new URLSearchParams(window.location.search).get('copy') === '1') {
      window.history.replaceState(null, '', `/r/${slug}`);
      copy();
    }
  }, [r]); // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    const res = await shareLink({ title: r.title, text: `A learning roadmap: ${r.title}`, url: siteUrl(`/r/${slug}`) });
    if (res === 'copied') toast.success('Link copied');
  };

  if (error) return <PublicLayout><EmptyState icon="map" title="Roadmap not available" description={error} action={<Link className="btn btn-primary" to="/">Go to LearnMap</Link>} /></PublicLayout>;
  if (!r) return <PublicLayout><Loading /></PublicLayout>;

  return (
    <PublicLayout cta="Join free">
      <div className="pub-roadmap-head">
        <div className="tiny subtle" style={{ letterSpacing: '.12em', textTransform: 'uppercase' }}>Learning roadmap</div>
        <h1>{r.title}</h1>
        {r.description && <p className="muted">{r.description}</p>}
        <div className="row row-wrap mt-2 small muted" style={{ gap: 14 }}>
          <span className="row" style={{ gap: 6 }}><Icon name="layers" size={14} />{r.modules.length} modules</span>
          <span className="row" style={{ gap: 6 }}><Icon name="checkCircle" size={14} />{r.total_tasks} tasks</span>
          {r.total_hours > 0 && <span className="row" style={{ gap: 6 }}><Icon name="clock" size={14} />about {r.total_hours} h</span>}
          {r.duration && <span className="row" style={{ gap: 6 }}><Icon name="calendar" size={14} />{r.duration}</span>}
          {r.copies > 0 && <span className="row" style={{ gap: 6 }}><Icon name="copy" size={14} />{r.copies} {r.copies === 1 ? 'person uses' : 'people use'} this</span>}
        </div>
        {r.author && (
          <div className="small mt-2">
            Shared by {r.author.username ? <Link to={`/u/${r.author.username}`}>{r.author.name}</Link> : r.author.name}
          </div>
        )}
        <div className="row row-wrap mt-3" style={{ gap: 8 }}>
          <Button variant="primary" icon="copy" loading={copying} onClick={copy}>{isLoggedIn() ? 'Copy to my roadmaps' : 'Use this roadmap — free'}</Button>
          <Button icon="send" onClick={share}>Share</Button>
        </div>
      </div>

      <div className="stack-sm mt-3">
        {r.modules.map((m, i) => (
          <div key={i} className="card pub-module">
            <button type="button" className="pub-module-head" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span className="pub-step">{i + 1}</span>
              <span className="grow" style={{ textAlign: 'left' }}>
                <strong>{m.title}</strong>
                <span className="tiny subtle" style={{ display: 'block' }}>{m.tasks.length} tasks</span>
              </span>
              <Icon name="chevronDown" size={16} style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
            {open === i && (
              <div className="pub-module-body fade-in">
                {m.description && <p className="small muted mb-2">{m.description}</p>}
                {m.tasks.map((t, j) => (
                  <div key={j} className="row small" style={{ gap: 10, padding: '7px 0', borderTop: j ? '1px solid var(--border)' : 'none' }}>
                    <Icon name={TYPE_ICON[t.type] || 'circle'} size={14} className="subtle" />
                    <span className="grow">{t.title}</span>
                    {t.minutes ? <span className="tiny subtle nowrap">{formatMinutes(t.minutes)}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {r.resources.length > 0 && (
        <section className="pub-section">
          <h2>Resources</h2>
          <div className="list card" style={{ padding: 0 }}>
            {r.resources.map((x, i) => (
              <a key={i} className="list-row clickable" href={x.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="list-icon"><Icon name={x.type === 'video' ? 'video' : 'book'} size={15} /></div>
                <div className="grow truncate">{x.title}</div>
                {x.is_free ? <Badge tone="success">Free</Badge> : null}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="pub-cta card">
        <div className="grow">
          <strong>Track this roadmap step by step</strong>
          <div className="small muted">Tick off tasks, keep a streak, get AI explanations and earn a certificate at the end.</div>
        </div>
        <Button variant="primary" loading={copying} onClick={copy}>{isLoggedIn() ? 'Copy to my roadmaps' : 'Start free'}</Button>
      </div>
    </PublicLayout>
  );
}
