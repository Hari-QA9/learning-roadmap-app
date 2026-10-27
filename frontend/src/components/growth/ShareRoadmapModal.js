import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useToast } from '../Toast';
import { Modal, Button, Icon, Spinner } from '../ui';
import { copyText, shareLink, siteUrl } from '../../lib/growth';

/** Share a roadmap: anyone with the link can see the outline and copy it into their own account. */
export default function ShareRoadmapModal({ roadmap, open, onClose, onChange }) {
  const toast = useToast();
  const [slug, setSlug] = useState(roadmap?.share_slug || null);
  const [busy, setBusy] = useState(false);
  const [listed, setListed] = useState(!!Number(roadmap?.listed));
  const toggleListed = async (on) => {
    setListed(on);
    try {
      const r = await api.put(`/growth/roadmaps/${roadmap.id}/listing`, { listed: on });
      onChange?.({ listed: on ? 1 : 0 });
      toast.success(r.data.message);
    } catch (e) { setListed(!on); toast.error(errorMessage(e, 'Could not update')); }
  };

  useEffect(() => {
    if (!open || !roadmap) return;
    if (roadmap.share_slug) { setSlug(roadmap.share_slug); return; }
    setBusy(true);
    api.post(`/growth/roadmaps/${roadmap.id}/share`)
      .then((r) => { setSlug(r.data.slug); onChange?.({ share_slug: r.data.slug }); })
      .catch((e) => toast.error(errorMessage(e, 'Could not create a share link')))
      .finally(() => setBusy(false));
  }, [open, roadmap?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const url = slug ? siteUrl(`/r/${slug}`) : '';
  const copy = async () => { if (await copyText(url)) toast.success('Link copied'); };
  const share = async () => {
    const r = await shareLink({ title: roadmap.title, text: `My learning roadmap for ${roadmap.title} — copy it and learn along:`, url });
    if (r === 'copied') toast.success('Link copied');
  };
  const stop = async () => {
    setBusy(true);
    try {
      await api.delete(`/growth/roadmaps/${roadmap.id}/share`);
      setSlug(null); setListed(false); onChange?.({ share_slug: null, listed: 0 });
      toast.success('Sharing turned off');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not turn sharing off'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share this roadmap"
      description="Anyone with the link can see the modules, tasks and resources (not your progress or notes) and copy it to their own LearnMap."
      footer={<>
        {slug && <Button variant="ghost" onClick={stop} disabled={busy}>Stop sharing</Button>}
        <Button variant="primary" icon="send" onClick={share} disabled={!slug}>Share</Button>
      </>}>
      {busy && !slug ? <div className="row" style={{ gap: 8 }}><Spinner /> Creating link…</div> : slug && (
        <div className="stack-sm">
          <div className="share-box">
            <Icon name="link" size={14} className="subtle" />
            <span className="truncate grow mono small">{url.replace(/^https?:\/\//, '')}</span>
            <Button size="sm" icon="copy" onClick={copy}>Copy</Button>
          </div>
          <label className="row small" style={{ gap: 10, justifyContent: 'space-between', cursor: 'pointer' }}>
            <span><strong style={{ color: 'var(--text)' }}>List on Explore</strong><span className="muted" style={{ display: 'block' }}>Let anyone discover it on LearnMap’s public Explore page.</span></span>
            <input type="checkbox" className="switch" checked={listed} onChange={(e) => toggleListed(e.target.checked)} aria-label="List on Explore" />
          </label>
          {roadmap.copies > 0 && <div className="small muted">{roadmap.copies} {roadmap.copies === 1 ? 'person has' : 'people have'} copied it so far.</div>}
          <a className="small" href={url} target="_blank" rel="noreferrer">Preview the public page ↗</a>
        </div>
      )}
    </Modal>
  );
}
