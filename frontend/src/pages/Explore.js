import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import PublicLayout from '../components/growth/PublicLayout';
import { PageHeader, Card, Input, Segmented, Icon, EmptyState, SkeletonRows, Button } from '../components/ui';

const IDEAS = ['Python', 'Data', 'Nursing', 'AWS', 'Design', 'Biology', 'Excel', 'Testing'];

function Grid({ term, setTerm, sort, setSort, list, more, loadMore }) {
  return (
    <>
      <div className="row row-wrap mb-3" style={{ gap: 10 }}>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search roadmaps — e.g. SQL, NCLEX, React" aria-label="Search roadmaps" style={{ flex: 1, minWidth: 220 }} />
        <Segmented value={sort} onChange={setSort} options={[{ value: 'popular', label: 'Most used' }, { value: 'new', label: 'Newest' }]} />
      </div>
      {!term && <div className="row row-wrap mb-3" style={{ gap: 6 }}>{IDEAS.map((i) => <button key={i} type="button" className="chip" onClick={() => setTerm(i)}>{i}</button>)}</div>}
      {!list ? <Card><SkeletonRows rows={4} /></Card> : list.length === 0 ? (
        <Card><EmptyState icon="map" title={term ? `No roadmaps match “${term}” yet` : 'No roadmaps listed yet'} description="Share one of your roadmaps and switch on “List on Explore” to be the first." /></Card>
      ) : (
        <>
          <div className="explore-grid">
            {list.map((r) => (
              <Link key={r.slug} to={`/r/${r.slug}`} className="card explore-card">
                <strong className="explore-title">{r.title}</strong>
                {r.description && <p className="small muted clamp-2" style={{ margin: '6px 0 0' }}>{r.description}</p>}
                <div className="row row-wrap tiny subtle mt-2" style={{ gap: 12 }}>
                  <span className="row" style={{ gap: 4 }}><Icon name="layers" size={12} />{r.modules} modules</span>
                  <span className="row" style={{ gap: 4 }}><Icon name="checkCircle" size={12} />{r.tasks} tasks</span>
                  {r.duration && <span className="row" style={{ gap: 4 }}><Icon name="calendar" size={12} />{r.duration}</span>}
                </div>
                <div className="row tiny mt-2" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <span className="subtle truncate">by {r.author}</span>
                  {r.copies > 0 && <span className="text-accent nowrap"><Icon name="copy" size={12} /> {r.copies} using it</span>}
                </div>
              </Link>
            ))}
          </div>
          {more && <div className="center mt-3"><Button onClick={loadMore}>Show more</Button></div>}
        </>
      )}
    </>
  );
}

/** Explore: roadmaps members have shared publicly. Works logged out (public page) and inside the app. */
export default function Explore({ inApp = false }) {
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState('popular');
  const [list, setList] = useState(null);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(0);
  const timer = useRef();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setList(null); setPage(0);
      api.get('/public/explore', { params: { q: term, sort }, noCache: true }).then((r) => { setList(r.data.roadmaps); setMore(r.data.more); }).catch(() => setList([]));
    }, 250);
  }, [term, sort]);
  const loadMore = () => {
    const next = page + 1;
    api.get('/public/explore', { params: { q: term, sort, page: next }, noCache: true }).then((r) => { setList((l) => [...l, ...r.data.roadmaps]); setMore(r.data.more); setPage(next); }).catch(() => {});
  };

  const body = <Grid {...{ term, setTerm, sort, setSort, list, more, loadMore }} />;
  if (inApp) return (<><PageHeader title="Explore roadmaps" description="Roadmaps other learners made and shared. Open one to see every step, then copy it to your account in one click." />{body}</>);
  return (
    <PublicLayout cta="Join free">
      <div className="pub-roadmap-head">
        <h1>Explore learning roadmaps</h1>
        <p className="muted">Step-by-step plans made and shared by learners — for tech, healthcare, science, business and more. Copy any of them for free.</p>
      </div>
      <div className="mt-2">{body}</div>
    </PublicLayout>
  );
}
