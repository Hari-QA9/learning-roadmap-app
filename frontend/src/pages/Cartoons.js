import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Input, EmptyState, SkeletonRows, Icon, timeAgo } from '../components/ui';
import { Vo, Pip } from '../components/cartoon/Characters';

const IDEAS = ['What is an API?', 'How does the internet work?', 'Photosynthesis', 'Compound interest', 'How vaccines work', 'What is machine learning?'];

/** Cartoon lessons: make one about any topic, and see the ones you've watched. */
export default function Cartoons() {
  const navigate = useNavigate();
  const toast = useToast();
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(null);

  useEffect(() => { api.get('/cartoons', { noCache: true }).then((r) => setList(r.data)).catch(() => setList([])); }, []);

  const make = async (t = topic) => {
    if (t.trim().length < 2) return;
    setBusy(true);
    try { const r = await api.post('/cartoons', { topic: t.trim() }, { timeout: 120000 }); navigate(`/cartoons/${r.data.id}`); }
    catch (e) { toast.error(errorMessage(e, 'Could not draw this cartoon')); setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Cartoon lessons" description="Any topic, explained as a short comic with Vo and Pip — with an everyday comparison, read aloud if you like." />
      <Card className="cartoon-hero">
        <div className="cartoon-hero-cast" aria-hidden="true"><Vo mood="explaining" size={92} /><Pip mood="confused" size={70} /></div>
        <form className="grow stack-sm" onSubmit={(e) => { e.preventDefault(); make(); }}>
          <label className="small" htmlFor="cartoon-topic" style={{ fontWeight: 600, color: 'var(--text)' }}>What should Vo explain?</label>
          <div className="row" style={{ gap: 8 }}>
            <Input id="cartoon-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. What is an API?" maxLength={200} />
            <Button type="submit" variant="primary" icon="sparkles" loading={busy} disabled={topic.trim().length < 2}>Make cartoon</Button>
          </div>
          <div className="row row-wrap" style={{ gap: 6 }}>{IDEAS.map((i) => <button key={i} type="button" className="chip" onClick={() => { setTopic(i); make(i); }} disabled={busy}>{i}</button>)}</div>
          <div className="tiny subtle">Tip: every task in your roadmaps has a “Cartoon” button too.</div>
        </form>
      </Card>

      <Card title="Your cartoon lessons" pad={false} className="mt-3">
        {!list ? <SkeletonRows rows={3} /> : list.length === 0 ? (
          <EmptyState icon="play" title="No cartoons yet" description="Pick a topic above, or press “Cartoon” on any task." />
        ) : (
          <div className="list">
            {list.map((c) => (
              <button key={c.id} type="button" className="list-row clickable" onClick={() => navigate(`/cartoons/${c.id}`)}>
                <div className="list-icon"><Icon name="play" size={15} /></div>
                <div className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                  <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{c.title}</div>
                  <div className="tiny subtle truncate">{c.analogy || c.topic} · {c.panels} panels</div>
                </div>
                <span className="tiny subtle nowrap">{timeAgo(c.viewed_at)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
