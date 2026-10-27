import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Badge, Icon, EmptyState, SkeletonRows, Progress, Modal, Field, Input, Textarea, Select, Segmented, ConfirmDialog, Dropdown, timeAgo, formatDate } from '../components/ui';
import { copyText, siteUrl } from '../lib/growth';

const day = (d) => (d ? String(d instanceof Date ? d.toISOString() : d).slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);
const pctTone = (p) => (p === 100 ? 'success' : p >= 50 ? 'accent' : p > 0 ? 'warning' : 'danger');

function Posts({ posts, canPost, classId, onChange }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const post = async () => {
    try { await api.post(`/classes/${classId}/posts`, { body: text }); setText(''); onChange(); } catch (e) { toast.error(errorMessage(e, 'Could not post')); }
  };
  const remove = async (p) => { try { await api.delete(`/classes/${classId}/posts/${p.id}`); onChange(); } catch (e) { toast.error(errorMessage(e, 'Could not remove')); } };
  return (
    <Card title="Announcements" pad={false}>
      {canPost && (
        <div className="stack-sm" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Post an update — students get a notification" aria-label="Announcement" />
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button size="sm" variant="primary" icon="send" disabled={!text.trim()} onClick={post}>Post</Button></div>
        </div>
      )}
      {posts.length === 0 ? <div className="list-row small muted">No announcements yet.</div> : (
        <div className="list">
          {posts.map((p) => (
            <div key={p.id} className="list-row" style={{ alignItems: 'flex-start' }}>
              <div className="grow"><div className="small" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{p.body}</div><div className="tiny subtle mt-1">{p.name} · {timeAgo(p.created_at)}</div></div>
              {canPost && <Button size="sm" variant="ghost" icon="trash" aria-label="Remove announcement" onClick={() => remove(p)} />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StudentView({ c, reload }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <PageHeader back="/classes" eyebrow={`Class · with ${c.teacher}`} title={c.name} description={c.description}
        actions={<Button variant="ghost" icon="logout" onClick={() => setLeaving(true)}>Leave class</Button>} />
      <div className="split">
        <Card title="Your assignments" pad={false}>
          {c.assignments.length === 0 ? <EmptyState icon="list" title="No assignments yet" description="When your teacher assigns a roadmap, it appears here and in your Roadmaps." /> : (
            <div className="list">
              {c.assignments.map((a) => {
                const overdue = a.due_date && day(a.due_date) < today() && a.progress < 100;
                return (
                  <div key={a.id} className="list-row clickable" style={{ alignItems: 'flex-start' }} onClick={() => a.roadmap_id && navigate(`/roadmaps/${a.roadmap_id}`)}>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
                        <strong style={{ color: 'var(--text)' }}>{a.title}</strong>
                        {a.progress === 100 ? <Badge tone="success">Done</Badge> : a.due_date ? <Badge tone={overdue ? 'danger' : undefined}>{overdue ? 'Overdue' : `Due ${formatDate(a.due_date, { month: 'short', day: 'numeric' })}`}</Badge> : null}
                      </div>
                      {a.instructions && <div className="small muted mt-1">{a.instructions}</div>}
                      <div className="row mt-2" style={{ gap: 8 }}><div className="grow"><Progress value={a.progress} size="sm" tone={a.progress === 100 ? 'success' : undefined} /></div><span className="tiny subtle">{a.progress}%</span></div>
                      {!a.roadmap_id && <div className="tiny subtle mt-1">Your teacher removed the original roadmap, so a copy couldn’t be made.</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Posts posts={c.posts} classId={c.id} onChange={reload} />
      </div>
      <ConfirmDialog open={leaving} danger title="Leave this class?" description="Your assigned roadmaps stay in your account. You can rejoin with the code." confirmLabel="Leave"
        onCancel={() => setLeaving(false)} onConfirm={async () => { try { await api.post(`/classes/${c.id}/leave`); toast.success('You left the class'); navigate('/classes'); } catch (e) { toast.error(errorMessage(e, 'Could not leave')); } }} />
    </>
  );
}

function TeacherView({ c, reload }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('progress');
  const [roadmaps, setRoadmaps] = useState([]);
  const [assign, setAssign] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const link = siteUrl(`/class/${c.join_code}`);
  useEffect(() => { api.get('/roadmaps').then((r) => setRoadmaps(r.data || [])).catch(() => {}); }, []);

  const doAssign = async () => {
    try {
      const r = await api.post(`/classes/${c.id}/assignments`, { roadmap_id: Number(assign.roadmap_id), title: assign.title, due_date: assign.due_date || null, instructions: assign.instructions }, { timeout: 120000 });
      toast.success(r.data.message); setAssign(null); reload();
    } catch (e) { toast.error(errorMessage(e, 'Could not assign')); }
  };
  const doConfirm = async () => {
    try {
      if (confirm.kind === 'student') await api.delete(`/classes/${c.id}/students/${confirm.item.id}`);
      if (confirm.kind === 'assignment') await api.delete(`/classes/${c.id}/assignments/${confirm.item.id}`);
      if (confirm.kind === 'class') { await api.delete(`/classes/${c.id}`); toast.success('Class deleted'); navigate('/classes'); return; }
      setConfirm(null); reload();
    } catch (e) { toast.error(errorMessage(e, 'Something went wrong')); setConfirm(null); }
  };
  const newCode = async () => { try { const r = await api.put(`/classes/${c.id}`, { new_code: true }); toast.success(r.data.message); reload(); } catch (e) { toast.error(errorMessage(e, 'Could not change the code')); } };
  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Student', 'Email', 'Joined', 'Last active', 'Tasks this week', 'Focus minutes this week', ...c.assignments.map((a) => `${a.title} (%)`)];
    const rows = c.students.map((s) => [s.name, s.email, day(s.joined_at), s.last_active || '', s.week_tasks, s.week_focus, ...c.assignments.map((a) => s.progress[a.id] ?? '')]);
    const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const el = document.createElement('a'); el.href = url; el.download = `${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-progress.csv`;
    document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <PageHeader back="/classes" eyebrow="Class · you teach this" title={c.name} description={c.description}
        actions={<>
          <Button variant="primary" icon="plus" onClick={() => setAssign({ roadmap_id: '', title: '', due_date: '', instructions: '' })}>Assign a roadmap</Button>
          <Dropdown trigger={({ toggle }) => <Button variant="ghost" icon="more" onClick={toggle} aria-label="Class options" />}>
            <button className="menu-item" onClick={exportCsv}><Icon name="download" size={15} /> Export progress (CSV)</button>
            <button className="menu-item" onClick={newCode}><Icon name="refresh" size={15} /> New join code</button>
            <div className="menu-sep" />
            <button className="menu-item danger" onClick={() => setConfirm({ kind: 'class' })}><Icon name="trash" size={15} /> Delete class</button>
          </Dropdown>
        </>} />

      <Card className="mb-3">
        <div className="row row-wrap" style={{ gap: 16, justifyContent: 'space-between' }}>
          <div>
            <div className="section-label" style={{ margin: 0 }}>Join code</div>
            <div className="join-code">{c.join_code}</div>
            <div className="tiny subtle">Students enter it in Classes → Join with a code, or open the link.</div>
          </div>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <Button icon="copy" onClick={async () => { if (await copyText(link)) toast.success('Join link copied'); }}>Copy join link</Button>
            <Button icon="copy" variant="ghost" onClick={async () => { if (await copyText(c.join_code)) toast.success('Code copied'); }}>Copy code</Button>
          </div>
        </div>
      </Card>

      <div className="mb-3"><Segmented value={tab} onChange={setTab} options={[{ value: 'progress', label: `Progress · ${c.students.length}` }, { value: 'assignments', label: `Assignments · ${c.assignments.length}` }, { value: 'posts', label: 'Announcements' }]} /></div>

      {tab === 'progress' && (
        c.students.length === 0 ? <Card><EmptyState icon="user" title="No students yet" description="Share the join code or link. Students who join get every assignment automatically." /></Card> : (
          <Card pad={false}>
            <div className="table-wrap">
              <table className="table class-table">
                <thead><tr><th>Student</th><th>Last active</th><th>This week</th>{c.assignments.map((a) => <th key={a.id} title={a.title}>{a.title.length > 22 ? `${a.title.slice(0, 22)}…` : a.title}</th>)}<th aria-label="Actions" /></tr></thead>
                <tbody>
                  {c.students.map((s) => (
                    <tr key={s.id}>
                      <td><div style={{ fontWeight: 500, color: 'var(--text)' }}>{s.name}</div><div className="tiny subtle">{s.email}</div></td>
                      <td className="nowrap small">{s.last_active ? formatDate(s.last_active, { month: 'short', day: 'numeric' }) : <span className="subtle">—</span>}</td>
                      <td className="nowrap small">{s.week_tasks} tasks · {s.week_focus}m</td>
                      {c.assignments.map((a) => {
                        const p = s.progress[a.id];
                        const overdue = a.due_date && day(a.due_date) < today() && p !== null && p < 100;
                        return <td key={a.id}>{p === null ? <span className="tiny subtle">—</span> : <Badge tone={overdue ? 'danger' : pctTone(p)}>{p}%{overdue ? ' · late' : ''}</Badge>}</td>;
                      })}
                      <td><Button size="sm" variant="ghost" icon="x" aria-label={`Remove ${s.name}`} onClick={() => setConfirm({ kind: 'student', item: s })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {tab === 'assignments' && (
        c.assignments.length === 0 ? <Card><EmptyState icon="list" title="No assignments yet" description="Assign any of your roadmaps — each student gets their own copy to work through." action={<Button variant="primary" onClick={() => setAssign({ roadmap_id: '', title: '', due_date: '', instructions: '' })}>Assign a roadmap</Button>} /></Card> : (
          <Card pad={false}>
            <div className="list">
              {c.assignments.map((a) => (
                <div key={a.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}><strong style={{ color: 'var(--text)' }}>{a.title}</strong>{a.due_date && <Badge>Due {formatDate(a.due_date, { month: 'short', day: 'numeric' })}</Badge>}</div>
                    {a.instructions && <div className="small muted mt-1">{a.instructions}</div>}
                    <div className="row mt-2" style={{ gap: 8 }}><div className="grow"><Progress value={a.average} size="sm" /></div><span className="tiny subtle nowrap">class average {a.average}% · {a.completed}/{c.students.length} finished</span></div>
                  </div>
                  {a.source_roadmap_id && <Button size="sm" variant="ghost" onClick={() => navigate(`/roadmaps/${a.source_roadmap_id}`)}>Open</Button>}
                  <Button size="sm" variant="ghost" icon="trash" aria-label={`Remove ${a.title}`} onClick={() => setConfirm({ kind: 'assignment', item: a })} />
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      {tab === 'posts' && <Posts posts={c.posts} canPost classId={c.id} onChange={reload} />}

      <Modal open={!!assign} onClose={() => setAssign(null)} title="Assign a roadmap" description="Every student gets their own copy (students who join later get it too). Editing your roadmap afterwards doesn’t change copies already given."
        footer={<><Button onClick={() => setAssign(null)}>Cancel</Button><Button variant="primary" disabled={!assign?.roadmap_id} onClick={doAssign}>Assign</Button></>}>
        {assign && (
          <div className="stack-sm">
            <Field label="Roadmap" hint={roadmaps.length ? undefined : 'Create or import a roadmap first (Roadmaps page).'}>
              <Select value={assign.roadmap_id} onChange={(e) => setAssign({ ...assign, roadmap_id: e.target.value })} aria-label="Roadmap to assign">
                <option value="">Choose one of your roadmaps…</option>
                {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </Select>
            </Field>
            <Field label="Assignment title" optional><Input value={assign.title} onChange={(e) => setAssign({ ...assign, title: e.target.value })} placeholder="Defaults to the roadmap title" /></Field>
            <Field label="Due date" optional><Input type="date" value={assign.due_date} onChange={(e) => setAssign({ ...assign, due_date: e.target.value })} aria-label="Due date" /></Field>
            <Field label="Instructions" optional><Textarea rows={2} value={assign.instructions} onChange={(e) => setAssign({ ...assign, instructions: e.target.value })} placeholder="e.g. Finish modules 1–2 before Friday’s quiz" /></Field>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!confirm} danger onCancel={() => setConfirm(null)} onConfirm={doConfirm}
        title={confirm?.kind === 'class' ? 'Delete this class?' : confirm?.kind === 'student' ? `Remove ${confirm.item.name}?` : 'Remove this assignment?'}
        description={confirm?.kind === 'class' ? 'Students keep their roadmaps, but the class, assignments and announcements are deleted.' : confirm?.kind === 'student' ? 'They keep their roadmaps. They can rejoin only with the current code.' : 'Students keep their copies; you just stop tracking it here.'}
        confirmLabel={confirm?.kind === 'class' ? 'Delete class' : 'Remove'} />
    </>
  );
}

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api.get(`/classes/${id}`, { noCache: true }).then((r) => setC(r.data)).catch((e) => setError(errorMessage(e, 'Class not found'))), [id]);
  useEffect(() => { load(); }, [load]);
  if (error) return <EmptyState icon="grad" title="Class not found" description={error} action={<Button onClick={() => navigate('/classes')}>Back to classes</Button>} />;
  if (!c) return <Card><SkeletonRows rows={5} /></Card>;
  return c.role === 'teacher' ? <TeacherView c={c} reload={load} /> : <StudentView c={c} reload={load} />;
}
