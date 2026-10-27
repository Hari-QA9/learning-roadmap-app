import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Badge, Icon, Avatar, EmptyState, SkeletonRows, Progress, Modal, Field, Input, Textarea, ConfirmDialog, Dropdown, timeAgo } from '../components/ui';
import { copyText, shareLink, siteUrl } from '../lib/growth';

function Chat({ groupId, isOwner }) {
  const toast = useToast();
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const box = useRef(null);
  const lastId = useRef(0);

  const scrollDown = () => setTimeout(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, 30);
  const poll = useCallback(() => {
    api.get(`/community/groups/${groupId}/messages`, { params: lastId.current ? { after: lastId.current } : {}, noCache: true })
      .then((r) => {
        if (!r.data.length) { setMsgs((m) => m || []); return; }
        lastId.current = r.data[r.data.length - 1].id;
        setMsgs((m) => [...(m || []), ...r.data.filter((x) => !(m || []).some((y) => y.id === x.id))]);
        scrollDown();
      }).catch(() => setMsgs((m) => m || []));
  }, [groupId]);

  useEffect(() => {
    lastId.current = 0; setMsgs(null); poll();
    const id = setInterval(() => { if (!document.hidden) poll(); }, 8000);
    return () => clearInterval(id);
  }, [poll]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await api.post(`/community/groups/${groupId}/messages`, { body });
      setText('');
      poll();
    } catch (err) { toast.error(errorMessage(err, 'Could not send')); } finally { setSending(false); }
  };
  const remove = async (m) => {
    try { await api.delete(`/community/groups/${groupId}/messages/${m.id}`); setMsgs((l) => l.filter((x) => x.id !== m.id)); } catch (err) { toast.error(errorMessage(err, 'Could not delete')); }
  };

  return (
    <Card title="Group chat" pad={false}>
      <div className="chat-box" ref={box}>
        {!msgs ? <SkeletonRows rows={3} /> : msgs.length === 0 ? (
          <div className="small muted center" style={{ padding: 24 }}>No messages yet. Say hi and share what you’re working on this week!</div>
        ) : msgs.map((m) => (
          <div key={m.id} className={`chat-msg ${m.mine ? 'mine' : ''}`}>
            {!m.mine && <div className="tiny subtle">{m.name}</div>}
            <div className="chat-bubble">{m.body}</div>
            <div className="tiny subtle row" style={{ gap: 8, justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
              {timeAgo(m.created_at)}
              {(m.mine || isOwner) && <button type="button" className="link-btn tiny" onClick={() => remove(m)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={send}>
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a message…" aria-label="Message" />
        <Button type="submit" variant="primary" icon="send" loading={sending} disabled={!text.trim()} aria-label="Send">Send</Button>
      </form>
    </Card>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [g, setG] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => api.get(`/community/groups/${id}`, { noCache: true }).then((r) => setG(r.data)).catch((e) => setError(errorMessage(e, 'Group not found'))), [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <EmptyState icon="user" title="Group not found" description={error} action={<Button onClick={() => navigate('/groups')}>Back to groups</Button>} />;
  if (!g) return <Card><SkeletonRows rows={5} /></Card>;

  if (!g.member) {
    return (
      <>
        <PageHeader back="/groups" title={g.name} description={g.goal} />
        <Card><EmptyState icon="user" title={`${g.members} member${g.members === 1 ? '' : 's'}`} description={g.description || 'A public study group.'}
          action={<Button variant="primary" onClick={() => api.post('/community/groups/join', { group_id: g.id }).then(load).catch((e) => toast.error(errorMessage(e, 'Could not join')))}>Join group</Button>} /></Card>
      </>
    );
  }

  const isOwner = g.role === 'owner';
  const inviteUrl = siteUrl(`/g/${g.invite_code}`);
  const pct = Math.round((g.week.tasks / Math.max(1, g.week.goal)) * 100);
  const invite = async () => {
    const r = await shareLink({ title: `Join ${g.name} on LearnMap`, text: `Join my study group “${g.name}” on LearnMap${g.goal ? ` — ${g.goal}` : ''}:`, url: inviteUrl });
    if (r === 'copied') toast.success('Invite link copied');
  };
  const askBuddy = async (m) => {
    try { const r = await api.post('/community/buddies', { user_id: m.id }); toast.success(r.data.message); load(); } catch (e) { toast.error(errorMessage(e, 'Could not send')); }
  };
  const doConfirm = async () => {
    try {
      if (confirm.kind === 'leave') { await api.post(`/community/groups/${g.id}/leave`); toast.success('You left the group'); navigate('/groups'); }
      if (confirm.kind === 'delete') { await api.delete(`/community/groups/${g.id}`); toast.success('Group deleted'); navigate('/groups'); }
      if (confirm.kind === 'remove') { await api.delete(`/community/groups/${g.id}/members/${confirm.member.id}`); toast.success('Member removed'); setConfirm(null); load(); }
    } catch (e) { toast.error(errorMessage(e, 'Something went wrong')); setConfirm(null); }
  };
  const saveEdit = async (newInvite = false) => {
    try {
      await api.put(`/community/groups/${g.id}`, { ...edit, weekly_goal: Number(edit.weekly_goal), new_invite: newInvite });
      toast.success(newInvite ? 'New invite link made — the old one stops working' : 'Group updated');
      setEdit(null); load();
    } catch (e) { toast.error(errorMessage(e, 'Could not save')); }
  };

  return (
    <>
      <PageHeader back="/groups" title={g.name} description={g.goal || g.description}
        actions={<>
          <Button variant="primary" icon="send" onClick={invite}>Invite</Button>
          <Dropdown trigger={({ toggle }) => <Button variant="ghost" icon="more" onClick={toggle} aria-label="Group options" />}>
            <button className="menu-item" onClick={async () => { if (await copyText(inviteUrl)) toast.success('Invite link copied'); }}><Icon name="link" size={15} /> Copy invite link</button>
            <button className="menu-item" onClick={() => navigate(`/challenges?scope=group:${g.id}`)}><Icon name="trophy" size={15} /> Group leaderboard</button>
            {isOwner && <button className="menu-item" onClick={() => setEdit({ name: g.name, goal: g.goal || '', description: g.description || '', weekly_goal: String(g.weekly_goal), is_public: g.is_public })}><Icon name="settings" size={15} /> Group settings</button>}
            <div className="menu-sep" />
            <button className="menu-item danger" onClick={() => setConfirm({ kind: 'leave' })}><Icon name="logout" size={15} /> Leave group</button>
            {isOwner && <button className="menu-item danger" onClick={() => setConfirm({ kind: 'delete' })}><Icon name="trash" size={15} /> Delete group</button>}
          </Dropdown>
        </>} />

      <div className="split">
        <div className="stack-lg">
          <Card>
            <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="section-label" style={{ margin: 0 }}>Group goal this week</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{g.week.tasks} <span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>/ {g.week.goal} tasks</span></div>
              </div>
              <span className="small muted">{g.week.days_left === 0 ? 'Last day!' : `${g.week.days_left} day${g.week.days_left === 1 ? '' : 's'} left`}</span>
            </div>
            <div className="mt-2"><Progress value={pct} tone={pct >= 100 ? 'success' : undefined} /></div>
            {pct >= 100 && <div className="small text-success mt-1">Goal reached — amazing teamwork! 🎉</div>}
          </Card>
          <Chat groupId={g.id} isOwner={isOwner} />
        </div>

        <Card title={`Members · ${g.members.length}`} description="This week’s progress" pad={false}>
          <div className="list">
            {g.members.map((m, i) => (
              <div key={m.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className="tiny subtle" style={{ width: 16, paddingTop: 10 }}>{i + 1}</span>
                <Avatar name={m.name} src={m.photo} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{m.username ? <Link to={`/u/${m.username}`} style={{ color: 'inherit' }}>{m.short_name}</Link> : m.short_name}{m.me ? ' (you)' : ''}</span>
                    {m.role === 'owner' && <Badge>Owner</Badge>}
                    {m.done_today && <span title="Hit today’s goal">✅</span>}
                  </div>
                  <div className="tiny subtle">{m.week.tasks} tasks · {m.week.focus} min focus · 🔥 {m.streak}{m.last_active ? ` · active ${timeAgo(m.last_active)}` : ''}</div>
                </div>
                <strong className="small" title="Points this week">{m.week.points}</strong>
                {!m.me && (
                  <Dropdown trigger={({ toggle }) => <Button variant="ghost" size="sm" icon="more" onClick={toggle} aria-label={`Options for ${m.short_name}`} />}>
                    {!m.is_buddy && <button className="menu-item" onClick={() => askBuddy(m)}><Icon name="user" size={15} /> Ask to be buddies</button>}
                    {m.is_buddy && <span className="menu-item" style={{ cursor: 'default' }}><Icon name="check" size={15} /> Buddies / request sent</span>}
                    {isOwner && <button className="menu-item danger" onClick={() => setConfirm({ kind: 'remove', member: m })}><Icon name="x" size={15} /> Remove from group</button>}
                  </Dropdown>
                )}
              </div>
            ))}
          </div>
          <div className="tiny subtle" style={{ padding: '10px 20px' }}>Points: 10 per task, 1 per focus minute, 1 per card reviewed, 50 per challenge.</div>
        </Card>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Group settings"
        footer={<><Button variant="ghost" onClick={() => saveEdit(true)}>New invite link</Button><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => saveEdit(false)}>Save</Button></>}>
        {edit && (
          <div className="stack-sm">
            <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={80} /></Field>
            <Field label="Shared goal" optional><Input value={edit.goal} onChange={(e) => setEdit({ ...edit, goal: e.target.value })} maxLength={160} /></Field>
            <Field label="About" optional><Textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Weekly group goal (tasks)"><Input type="number" min={1} max={500} value={edit.weekly_goal} onChange={(e) => setEdit({ ...edit, weekly_goal: e.target.value })} /></Field>
            <label className="row small" style={{ gap: 10 }}><input type="checkbox" checked={edit.is_public} onChange={(e) => setEdit({ ...edit, is_public: e.target.checked })} /> Public — anyone can find and join</label>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!confirm} onCancel={() => setConfirm(null)} onConfirm={doConfirm} danger
        title={confirm?.kind === 'delete' ? 'Delete this group?' : confirm?.kind === 'remove' ? `Remove ${confirm.member.short_name}?` : 'Leave this group?'}
        description={confirm?.kind === 'delete' ? 'The group and its chat are deleted for everyone.' : confirm?.kind === 'remove' ? 'They can rejoin only with a new invite.' : isOwner ? 'The group passes to the longest-standing member.' : 'You can rejoin with an invite link.'}
        confirmLabel={confirm?.kind === 'delete' ? 'Delete group' : confirm?.kind === 'remove' ? 'Remove' : 'Leave'} />
    </>
  );
}
