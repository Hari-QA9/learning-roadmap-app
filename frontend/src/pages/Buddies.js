import React, { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Avatar, EmptyState, SkeletonRows, Icon, Ring, timeAgo } from '../components/ui';
import { copyText, shareLink, siteUrl } from '../lib/growth';

/** Accountability buddies: see each other's streak and weekly progress, send a nudge or a high five. */
export default function Buddies() {
  const toast = useToast();
  const [d, setD] = useState(null);
  const load = useCallback(() => api.get('/community/buddies', { noCache: true }).then((r) => setD(r.data)).catch(() => setD({ buddies: [], incoming: [], outgoing: [], error: true })), []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    try { const r = await fn(); toast.success(r.data?.message || okMsg); load(); } catch (e) { toast.error(errorMessage(e, 'Something went wrong')); }
  };
  const link = d?.code ? siteUrl(`/buddy/${d.code}`) : '';
  const share = async () => {
    const r = await shareLink({ title: 'Be my study buddy on Learnvoy', text: 'Let’s keep each other on track — be my study buddy on Learnvoy:', url: link });
    if (r === 'copied') toast.success('Buddy link copied');
  };

  return (
    <>
      <PageHeader title="Study buddies" description="People who learn with a partner stick with it. Buddies see each other’s streak and weekly progress (never your notes or tasks) and can send a nudge." />
      {!d ? <Card><SkeletonRows rows={4} /></Card> : (
        <div className="split">
          <div className="stack-lg">
            {d.incoming.length > 0 && (
              <Card title="Buddy requests" pad={false}>
                <div className="list">
                  {d.incoming.map((r) => (
                    <div key={r.id} className="list-row">
                      <Avatar name={r.name} />
                      <div className="grow"><strong>{r.name}</strong><div className="tiny subtle">wants to be your study buddy</div></div>
                      <Button size="sm" variant="primary" onClick={() => act(() => api.post(`/community/buddies/${r.id}/accept`))}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(() => api.delete(`/community/buddies/${r.id}`), 'Request declined')}>Decline</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {d.buddies.length === 0 ? (
              <Card><EmptyState icon="user" title="No buddies yet" description="Send your buddy link to a friend or classmate, or ask someone in one of your study groups." action={<Button variant="primary" icon="send" onClick={share}>Share my buddy link</Button>} /></Card>
            ) : d.buddies.map((b) => (
              <Card key={b.id}>
                <div className="buddy">
                  <Ring value={Math.min(100, Math.round((b.today / Math.max(1, b.goal)) * 100))} size={64} stroke={6} tone={b.done_today ? 'success' : 'accent'} label={`${b.today}/${b.goal}`} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}><Avatar name={b.name} src={b.photo} /><strong style={{ fontSize: 16 }}>{b.name}</strong></div>
                    <div className="small muted mt-1">
                      {b.done_today ? 'Hit today’s goal ✅' : 'Hasn’t hit today’s goal yet'} · 🔥 {b.streak}-day streak{b.last_active ? ` · last active ${timeAgo(b.last_active)}` : ''}
                    </div>
                    <div className="buddy-week">
                      <span><strong>{b.week.tasks}</strong> tasks</span>
                      <span><strong>{b.week.focus}</strong> min focus</span>
                      <span><strong>{b.week.reviews}</strong> cards</span>
                      <span><strong>{b.week.active_days}</strong>/7 days</span>
                    </div>
                  </div>
                </div>
                <div className="row row-wrap mt-2" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  <Button size="sm" variant="ghost" onClick={() => act(() => api.delete(`/community/buddies/${b.id}`), 'Buddy removed')}>Remove</Button>
                  {b.done_today
                    ? <Button size="sm" variant="primary" disabled={!b.can_nudge} onClick={() => act(() => api.post(`/community/buddies/${b.id}/nudge`, { kind: 'cheer' }))}>🙌 High five</Button>
                    : <Button size="sm" variant="primary" disabled={!b.can_nudge} onClick={() => act(() => api.post(`/community/buddies/${b.id}/nudge`, { kind: 'nudge' }))}>👋 Nudge</Button>}
                </div>
                {!b.can_nudge && <div className="tiny subtle" style={{ textAlign: 'right' }}>You can nudge again in a few hours.</div>}
              </Card>
            ))}
          </div>
          <div className="stack-lg">
            <Card title="Your buddy link" description="Anyone who opens it can send you a buddy request.">
              <div className="share-box">
                <Icon name="link" size={14} className="subtle" />
                <span className="truncate grow mono small">{link.replace(/^https?:\/\//, '')}</span>
                <Button size="sm" icon="copy" onClick={async () => { if (await copyText(link)) toast.success('Copied'); }}>Copy</Button>
              </div>
              <Button className="mt-2" variant="primary" icon="send" onClick={share}>Share</Button>
            </Card>
            {d.outgoing.length > 0 && (
              <Card title="Waiting for an answer" pad={false}>
                <div className="list">
                  {d.outgoing.map((r) => (
                    <div key={r.id} className="list-row">
                      <span className="grow">{r.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => act(() => api.delete(`/community/buddies/${r.id}`), 'Request cancelled')}>Cancel</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
