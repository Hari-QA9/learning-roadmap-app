import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../Toast';
import { Card, Button, Icon, SkeletonRows, timeAgo } from '../ui';
import { copyText, shareLink, siteUrl } from '../../lib/growth';

/** Profile → Invite friends: personal link, share sheet and who joined. */
export default function InviteCard() {
  const toast = useToast();
  const [d, setD] = useState(null);

  useEffect(() => { api.get('/growth/invite', { noCache: true }).then((r) => setD(r.data)).catch(() => setD({ error: true })); }, []);

  if (d?.error) return null;
  const url = d ? siteUrl(`/join/${d.code}`) : '';
  const share = async () => {
    const r = await shareLink({ title: 'Join me on LearnMap', text: 'I plan what I learn and track it with LearnMap — free roadmaps, AI help, resume builder and job matching.', url });
    if (r === 'copied') toast.success('Invite link copied');
  };
  const copy = async () => { if (await copyText(url)) toast.success('Invite link copied'); };

  return (
    <Card title="Invite friends" description="Learning is easier together. You get 50 XP for every friend who joins — and the Ambassador badge for the first.">
      {!d ? <SkeletonRows rows={2} /> : (
        <div className="stack-sm">
          <div className="share-box">
            <Icon name="link" size={14} className="subtle" />
            <span className="truncate grow mono small">{url.replace(/^https?:\/\//, '')}</span>
            <Button size="sm" icon="copy" onClick={copy} aria-label="Copy invite link">Copy</Button>
          </div>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <Button variant="primary" icon="send" onClick={share}>Share invite</Button>
            <a className="btn btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(`Join me on LearnMap: ${url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn btn-secondary" href={`mailto:?subject=${encodeURIComponent('Join me on LearnMap')}&body=${encodeURIComponent(`I'm using LearnMap to plan what I learn and track it. Join me (it's free): ${url}`)}`}>Email</a>
          </div>
          <div className="small muted">
            {d.count ? <><strong style={{ color: 'var(--text)' }}>{d.count}</strong> {d.count === 1 ? 'friend has' : 'friends have'} joined</> : 'No one has joined with your link yet.'}
          </div>
          {d.joined.length > 0 && (
            <div className="row row-wrap" style={{ gap: 6 }}>
              {d.joined.slice(0, 12).map((j, i) => <span key={i} className="badge" title={`Joined ${timeAgo(j.created_at)}`}>{j.name}</span>)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
