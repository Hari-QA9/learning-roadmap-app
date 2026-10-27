import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Badge, Icon, EmptyState, SkeletonRows, Modal, Field, Input, Textarea } from '../components/ui';

/** Classes you teach or mentor, and classes you've joined as a student. */
export default function Classes() {
  const navigate = useNavigate();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [modal, setModal] = useState(null); // 'create' | 'join'
  const [form, setForm] = useState({ name: '', description: '', code: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/classes', { noCache: true }).then((r) => setList(r.data)).catch(() => setList([])); }, []);
  const close = () => { setModal(null); setForm({ name: '', description: '', code: '' }); };
  const submit = async () => {
    setBusy(true);
    try {
      const r = modal === 'create' ? await api.post('/classes', { name: form.name, description: form.description }) : await api.post('/classes/join', { code: form.code });
      if (r.data.message) toast.success(r.data.message);
      navigate(`/classes/${r.data.id}`);
    } catch (e) { toast.error(errorMessage(e, 'Something went wrong')); setBusy(false); }
  };

  const teaching = (list || []).filter((c) => c.role === 'teacher');
  const learning = (list || []).filter((c) => c.role === 'student');
  const row = (c) => (
    <button key={c.id} type="button" className="list-row clickable group-row" onClick={() => navigate(`/classes/${c.id}`)}>
      <div className="group-avatar"><Icon name="grad" size={16} /></div>
      <div className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
        <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
        <div className="tiny subtle">{c.role === 'teacher' ? `${c.students} student${c.students === 1 ? '' : 's'}` : `with ${c.teacher}`} · {c.assignments} assignment{c.assignments === 1 ? '' : 's'}</div>
      </div>
      <Badge tone={c.role === 'teacher' ? 'accent' : undefined}>{c.role === 'teacher' ? 'Teaching' : 'Student'}</Badge>
      <Icon name="chevronRight" size={15} style={{ color: 'var(--text-3)' }} />
    </button>
  );

  return (
    <>
      <PageHeader title="Classes & mentoring" description="Teachers, tutors and mentors: assign roadmaps and follow each learner’s progress. Students: join with the code you were given."
        actions={<><Button icon="plus" onClick={() => setModal('join')}>Join with a code</Button><Button variant="primary" icon="grad" onClick={() => setModal('create')}>Create a class</Button></>} />
      {!list ? <Card><SkeletonRows rows={3} /></Card> : list.length === 0 ? (
        <Card><EmptyState icon="grad" title="No classes yet" description="Create a class to teach or mentor (it works for one mentee too), or join one with a code from your teacher."
          action={<div className="row" style={{ gap: 8 }}><Button onClick={() => setModal('join')}>Join with a code</Button><Button variant="primary" onClick={() => setModal('create')}>Create a class</Button></div>} /></Card>
      ) : (
        <div className="split">
          <Card title="Classes I teach or mentor" pad={false}>{teaching.length ? <div className="list">{teaching.map(row)}</div> : <div className="list-row small muted">None yet — create one to assign roadmaps.</div>}</Card>
          <Card title="Classes I’m in" pad={false}>{learning.length ? <div className="list">{learning.map(row)}</div> : <div className="list-row small muted">Got a code from a teacher or mentor? Use “Join with a code”.</div>}</Card>
        </div>
      )}
      <Modal open={!!modal} onClose={close} title={modal === 'create' ? 'Create a class' : 'Join a class'}
        description={modal === 'join' ? 'Your teacher will see your name, email, your progress on the roadmaps they assign, and your weekly activity (tasks finished, focus minutes, last active). Nothing else.' : 'Works for a whole class, a study cohort, or mentoring one person.'}
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" loading={busy} disabled={modal === 'create' ? form.name.trim().length < 3 : form.code.trim().length < 6} onClick={submit}>{modal === 'create' ? 'Create class' : 'Join'}</Button></>}>
        {modal === 'create' ? (
          <div className="stack-sm">
            <Field label="Class name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} placeholder="e.g. Biology 101 — Period 3, or Mentoring: Priya" autoFocus /></Field>
            <Field label="Description" optional><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
        ) : (
          <Field label="Class code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().trim() })} maxLength={16} placeholder="e.g. 5um4rfqj" autoCapitalize="none" spellCheck={false} autoFocus aria-label="Class code" /></Field>
        )}
      </Modal>
    </>
  );
}
