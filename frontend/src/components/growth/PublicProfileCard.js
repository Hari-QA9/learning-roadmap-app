import React, { useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useToast } from '../Toast';
import { Card, Button, Field, Input, SkeletonRows, Icon } from '../ui';
import { copyText, siteUrl } from '../../lib/growth';

const SHOW = [
  ['show_roadmaps', 'Roadmaps and progress'],
  ['show_certificates', 'Certificates'],
  ['show_resume', 'Resume (summary, experience, projects, education — never your email or phone)'],
  ['show_stats', 'Streak, tasks finished and badges'],
];

/** Profile → Public profile: a shareable portfolio page at /u/username. Off until turned on. */
export default function PublicProfileCard() {
  const toast = useToast();
  const [f, setF] = useState(null);
  const [saved, setSaved] = useState(null);
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef();

  useEffect(() => {
    api.get('/growth/profile', { noCache: true })
      .then((r) => { setF(r.data); setSaved(r.data.exists ? r.data : null); })
      .catch((e) => toast.error(errorMessage(e, 'Could not load public profile settings')));
  }, [toast]);

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setLink = (k) => (e) => setF((x) => ({ ...x, links: { ...x.links, [k]: e.target.value } }));

  const onUsername = (e) => {
    const u = e.target.value.toLowerCase().replace(/\s+/g, '-');
    set({ username: u });
    clearTimeout(timer.current);
    if (saved && u === saved.username) { setCheck(null); return; }
    timer.current = setTimeout(() => {
      api.get('/growth/username-check', { params: { u }, noCache: true }).then((r) => setCheck(r.data)).catch(() => setCheck(null));
    }, 300);
  };

  const save = async (nextPublic = f.is_public) => {
    const before = f.is_public;
    set({ is_public: nextPublic }); // flip the switch right away
    setSaving(true);
    try {
      const r = await api.put('/growth/profile', { ...f, is_public: nextPublic });
      const next = { ...f, is_public: nextPublic, username: r.data.username, links: { ...f.links, ...r.data.links }, exists: true };
      setF(next); setSaved(next); setCheck(null);
      toast.success(r.data.message);
    } catch (e) {
      set({ is_public: before });
      toast.error(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const url = saved ? siteUrl(`/u/${saved.username}`) : '';
  const copy = async () => { if (await copyText(url)) toast.success('Profile link copied'); };

  return (
    <Card title="Public profile" description="A portfolio page you can put on LinkedIn, your resume or email signature.">
      {!f ? <SkeletonRows rows={3} /> : (
        <div className="stack-sm">
          <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)' }}>{f.is_public ? 'Your profile is public' : 'Your profile is private'}</div>
              <div className="tiny subtle">{f.is_public ? 'Anyone with the link can see it.' : 'Only you can see your data.'}</div>
            </div>
            <input type="checkbox" className="switch" checked={!!f.is_public} disabled={!!(check && !check.available)} onChange={(e) => save(e.target.checked)} aria-label="Make my profile public" />
          </div>

          {saved?.is_public && (
            <div className="share-box">
              <Icon name="link" size={14} className="subtle" />
              <a href={url} target="_blank" rel="noreferrer" className="truncate grow">{url.replace(/^https?:\/\//, '')}</a>
              <Button size="sm" icon="copy" onClick={copy}>Copy</Button>
            </div>
          )}

          <Field label="Username" hint={check ? <span style={{ color: check.available ? 'var(--success)' : 'var(--danger)' }}>{check.message}</span> : `Your link: ${siteUrl('/u/')}${f.username || '…'}`}>
            <Input value={f.username} onChange={onUsername} maxLength={30} autoCapitalize="none" spellCheck={false} aria-label="Username" />
          </Field>
          <Field label="Headline" optional>
            <Input value={f.headline} onChange={(e) => set({ headline: e.target.value })} maxLength={160} placeholder="e.g. Aspiring QA Automation Engineer · MS CS @ LIU" />
          </Field>
          <div className="grid-3" style={{ gap: 10 }}>
            <Field label="LinkedIn" optional><Input value={f.links.linkedin} onChange={setLink('linkedin')} placeholder="linkedin.com/in/…" /></Field>
            <Field label="GitHub" optional><Input value={f.links.github} onChange={setLink('github')} placeholder="github.com/…" /></Field>
            <Field label="Website" optional><Input value={f.links.website} onChange={setLink('website')} placeholder="yoursite.com" /></Field>
          </div>
          <div className="section-label" style={{ margin: '6px 0 0' }}>Show on my page</div>
          {SHOW.map(([k, label]) => (
            <label key={k} className="row small" style={{ gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f[k]} onChange={(e) => set({ [k]: e.target.checked })} />
              <span>{label}</span>
            </label>
          ))}
          <div className="row mt-1" style={{ justifyContent: 'flex-end', gap: 8 }}>
            {saved?.is_public && <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">View page</a>}
            <Button variant="primary" loading={saving} disabled={check && !check.available} onClick={() => save()}>Save public profile</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
