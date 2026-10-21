import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  PageHeader, Button, Card, Progress, EmptyState, Skeleton, Icon, Modal, Field, Input, Textarea,
  ConfirmDialog, Dropdown, Segmented, Badge, formatDate,
} from '../components/ui';

const empty = { title: '', description: '', goal: '', duration: '' };

function Roadmaps() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(empty);
  const [showCreate, setShowCreate] = useState(params.get('new') === '1');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api.get('/roadmaps')
      .then((r) => setRoadmaps(r.data || []))
      .catch((e) => toast.error(errorMessage(e, 'Could not load roadmaps')))
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const closeCreate = () => {
    setShowCreate(false);
    setForm(empty);
    if (params.get('new')) { params.delete('new'); setParams(params, { replace: true }); }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/roadmaps', { ...form, title: form.title.trim() });
      toast.success('Roadmap created');
      closeCreate();
      navigate(`/roadmaps/${res.data.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create roadmap'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/roadmaps/${toDelete.id}`);
      setRoadmaps((r) => r.filter((x) => x.id !== toDelete.id));
      toast.success('Roadmap deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete roadmap'));
    } finally {
      setDeleting(false);
    }
  };

  const pct = (rm) => (rm.total_tasks > 0 ? Math.round((rm.completed_tasks / rm.total_tasks) * 100) : 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roadmaps.filter((rm) => {
      if (q && !`${rm.title} ${rm.description || ''}`.toLowerCase().includes(q)) return false;
      if (filter === 'progress') return pct(rm) > 0 && pct(rm) < 100;
      if (filter === 'done') return rm.total_tasks > 0 && pct(rm) === 100;
      return true;
    });
  }, [roadmaps, query, filter]);

  return (
    <>
      <PageHeader
        title="Roadmaps"
        description="Every learning goal you’re working on, with its modules, tasks and resources."
        actions={
          <>
            <Button icon="wand" onClick={() => navigate('/ai-generator')}>Generate with AI</Button>
            <Button variant="primary" icon="plus" onClick={() => setShowCreate(true)}>New roadmap</Button>
          </>
        }
      />

      {(loading || roadmaps.length > 0) && (
        <div className="row-between row-wrap mb-3">
          <div className="input-group" style={{ width: 300, maxWidth: '100%' }}>
            <Icon name="search" size={15} />
            <Input placeholder="Search roadmaps" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'progress', label: 'In progress' }, { value: 'done', label: 'Completed' }]}
          />
        </div>
      )}

      {loading ? (
        <div className="grid-auto">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card card-pad stack">
              <Skeleton w="60%" h={16} /><Skeleton w="90%" h={10} /><Skeleton w="100%" h={6} />
            </div>
          ))}
        </div>
      ) : roadmaps.length === 0 ? (
        <Card>
          <EmptyState
            icon="map"
            title="Create your first roadmap"
            description="A roadmap breaks a big goal into modules and tasks you can tick off. Start blank, from a template, or with AI."
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="primary" icon="plus" onClick={() => setShowCreate(true)}>New roadmap</Button>
                <Button icon="layers" onClick={() => navigate('/templates')}>Browse templates</Button>
              </div>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card><EmptyState icon="search" title="No matches" description="Try a different search or filter." /></Card>
      ) : (
        <div className="grid-auto stagger">
          {visible.map((rm) => {
            const p = pct(rm);
            return (
              <div key={rm.id} className="card card-link card-pad stack" onClick={() => navigate(`/roadmaps/${rm.id}`)} style={{ gap: 14 }}>
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <div className="grow">
                    <h3 className="truncate">{rm.title}</h3>
                    <p className="small mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
                      {rm.description || rm.goal || 'No description'}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown trigger={({ toggle }) => <Button variant="ghost" size="sm" icon="more" onClick={toggle} aria-label="Roadmap actions" />}>
                      <button className="menu-item" onClick={() => navigate(`/roadmaps/${rm.id}`)}><Icon name="arrowUpRight" size={15} /> Open</button>
                      <button className="menu-item danger" onClick={() => setToDelete(rm)}><Icon name="trash" size={15} /> Delete</button>
                    </Dropdown>
                  </div>
                </div>
                <div>
                  <div className="row-between small mb-1">
                    <span className="muted">{rm.completed_tasks || 0} of {rm.total_tasks || 0} tasks</span>
                    <span style={{ fontWeight: 500 }}>{p}%</span>
                  </div>
                  <Progress value={p} tone={p === 100 ? 'success' : undefined} />
                </div>
                <div className="row-between tiny subtle">
                  <span className="row" style={{ gap: 6 }}>
                    <Icon name="layers" size={13} /> {rm.module_count || 0} modules
                    {rm.duration && <><span>·</span><Icon name="clock" size={13} /> {rm.duration}</>}
                  </span>
                  {p === 100 && rm.total_tasks > 0 ? <Badge tone="success">Completed</Badge> : <span>{formatDate(rm.created_at)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="New roadmap"
        description="Give it a clear goal. You can add modules and tasks next."
        footer={
          <>
            <Button onClick={closeCreate}>Cancel</Button>
            <Button variant="primary" type="submit" form="create-roadmap" loading={saving} disabled={!form.title.trim()}>Create roadmap</Button>
          </>
        }
      >
        <form id="create-roadmap" onSubmit={create}>
          <Field label="Title">
            <Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full-stack web development" />
          </Field>
          <Field label="Description" optional>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will this roadmap cover?" />
          </Field>
          <div className="form-grid mt-2">
            <Field label="Goal" optional>
              <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Land a junior dev role" />
            </Field>
            <Field label="Duration" optional>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="12 weeks" />
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete roadmap?"
        description={`“${toDelete?.title}” and everything in it will be permanently removed.`}
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

export default Roadmaps;
