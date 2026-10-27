import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Badge, Icon, EmptyState, SkeletonRows, Modal, Field, Input, Textarea } from '../components/ui';

/** Study groups: the ones you're in, plus public groups you can join. */
export default function Groups() {
  const navigate = useNavigate();
  const toast = useToast();
  const [mine, setMine] = useState(null);
  const [found, setFound] = useState(null);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', goal: '', description: '', weekly_goal: '20', is_public: false });
  const [saving, setSaving] = useState(false);
  const timer = useRef();

  useEffect(() => { api.get('/community/groups', { noCache: true }).then((r) => setMine(r.data)).catch(() => setMine([])); }, []);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api.get('/community/groups/discover', { params: { q: term }, noCache: true }).then((r) => setFound(r.data)).catch(() => setFound([])), 250);
  }, [term]);

  const create = async () => {
    setSaving(true);
    try {
      const r = await api.post('/community/groups', { ...form, weekly_goal: Number(form.weekly_goal) });
      navigate(`/groups/${r.data.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not create the group'));
      setSaving(false);
    }
  };
  const join = async (g) => {
    try {
      const r = await api.post('/community/groups/join', { group_id: g.id });
      toast.success(r.data.message);
      navigate(`/groups/${r.data.id}`);
    } catch (e) { toast.error(errorMessage(e, 'Could not join')); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <PageHeader title="Study groups" description="Learn with people working toward the same goal. Share progress, cheer each other on and chat."
        actions={<Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Create a group</Button>} />

      <div className="split">
        <Card title="Your groups" pad={false}>
          {!mine ? <SkeletonRows rows={3} /> : mine.length === 0 ? (
            <EmptyState icon="user" title="You’re not in a group yet" description="Create one and invite friends or classmates — or join a public group." action={<Button variant="primary" onClick={() => setOpen(true)}>Create a group</Button>} />
          ) : (
            <div className="list">
              {mine.map((g) => (
                <button key={g.id} type="button" className="list-row clickable group-row" onClick={() => navigate(`/groups/${g.id}`)}>
                  <div className="group-avatar">{g.name.slice(0, 1).toUpperCase()}</div>
                  <div className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                    <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{g.name}</div>
                    <div className="tiny subtle truncate">{g.members} member{g.members === 1 ? '' : 's'}{g.goal ? ` · ${g.goal}` : ''}{g.role === 'owner' ? ' · You run this group' : ''}</div>
                  </div>
                  {g.unread > 0 && <Badge tone="accent">{g.unread} new</Badge>}
                  <Icon name="chevronRight" size={15} style={{ color: 'var(--text-3)' }} />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Find a public group" pad={false} actions={<Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search e.g. AWS, NCLEX, Python" aria-label="Search public groups" style={{ width: 230, height: 32 }} />}>
          {!found ? <SkeletonRows rows={3} /> : found.length === 0 ? (
            <div className="list-row small muted">{term ? 'No public groups match. Why not start one?' : 'No public groups yet — create the first!'}</div>
          ) : (
            <div className="list">
              {found.map((g) => (
                <div key={g.id} className="list-row">
                  <div className="group-avatar">{g.name.slice(0, 1).toUpperCase()}</div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{g.name}</div>
                    <div className="tiny subtle truncate">{g.members} member{g.members === 1 ? '' : 's'}{g.goal ? ` · ${g.goal}` : ''}</div>
                  </div>
                  <Button size="sm" onClick={() => join(g)}>Join</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create a study group"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} disabled={form.name.trim().length < 3} onClick={create}>Create group</Button></>}>
        <div className="stack-sm">
          <Field label="Group name"><Input value={form.name} onChange={set('name')} maxLength={80} placeholder="e.g. AWS Cert by December" autoFocus /></Field>
          <Field label="Shared goal" optional><Input value={form.goal} onChange={set('goal')} maxLength={160} placeholder="e.g. Pass the AWS Cloud Practitioner exam" /></Field>
          <Field label="About" optional><Textarea rows={2} value={form.description} onChange={set('description')} placeholder="Who it’s for, how often you check in…" /></Field>
          <Field label="Weekly group goal (tasks)" hint="Everyone’s finished tasks add up toward it."><Input type="number" min={1} max={500} value={form.weekly_goal} onChange={set('weekly_goal')} /></Field>
          <label className="row small" style={{ gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_public} onChange={set('is_public')} />
            <span>Public — anyone can find and join it. Otherwise people join with your invite link.</span>
          </label>
        </div>
      </Modal>
    </>
  );
}
