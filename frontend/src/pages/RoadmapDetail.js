import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  PageHeader, Button, Card, Badge, Icon, Input, Select, Tabs, Ring, Progress, EmptyState, Loading,
  ConfirmDialog, Dropdown, Modal, Field, Textarea, Alert, formatDate,
} from '../components/ui';

const NEXT_STATUS = { pending: 'in_progress', in_progress: 'done', done: 'pending' };
const STATUS_LABEL = { pending: 'To do', in_progress: 'In progress', done: 'Done' };
const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: undefined };

function StatusButton({ status, onClick, disabled }) {
  const icon = status === 'done' ? 'checkCircle' : 'circle';
  const color = status === 'done' ? 'var(--success)' : status === 'in_progress' ? 'var(--warning)' : 'var(--text-3)';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Module locked' : `Mark as ${STATUS_LABEL[NEXT_STATUS[status] || 'in_progress'].toLowerCase()}`}
      aria-label={`Status: ${STATUS_LABEL[status] || 'To do'}. Click to change.`}
      style={{ background: 'none', border: 0, padding: 2, cursor: disabled ? 'not-allowed' : 'pointer', color, display: 'grid', placeItems: 'center', position: 'relative' }}
    >
      <Icon name={icon} size={19} stroke={status === 'done' ? 2 : 1.75} />
      {status === 'in_progress' && (
        <span style={{ position: 'absolute', width: 7, height: 7, borderRadius: 9, background: 'var(--warning)' }} />
      )}
    </button>
  );
}

function isOverdue(d, status) {
  if (!d || status === 'done') return false;
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const due = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  due.setHours(23, 59, 59);
  return due < new Date();
}

function AddTaskRow({ onAdd }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const ok = await onAdd({ title: title.trim(), priority, due_date: due || null });
    setBusy(false);
    if (ok) { setTitle(''); setDue(''); setPriority('medium'); }
  };
  return (
    <form onSubmit={submit} className="row row-wrap" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', gap: 8 }}>
      <div className="input-group grow" style={{ minWidth: 200 }}>
        <Icon name="plus" size={15} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" aria-label="New task title" />
      </div>
      <Select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 120 }} aria-label="Priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Select>
      <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 150 }} aria-label="Due date" />
      <Button type="submit" variant="secondary" loading={busy} disabled={!title.trim()}>Add</Button>
    </form>
  );
}

function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [roadmap, setRoadmap] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState({});
  const [resources, setResources] = useState([]);
  const [passed, setPassed] = useState({});
  const [tab, setTab] = useState('modules');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const [showModule, setShowModule] = useState(false);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [savingModule, setSavingModule] = useState(false);

  const [showResource, setShowResource] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', url: '', type: 'article' });
  const [savingResource, setSavingResource] = useState(false);

  const [confirm, setConfirm] = useState(null); // { kind, item }
  const [busyConfirm, setBusyConfirm] = useState(false);

  const loadTasks = useCallback(async (moduleId) => {
    const r = await api.get(`/tasks/${moduleId}`).catch(() => ({ data: [] }));
    setTasks((p) => ({ ...p, [moduleId]: r.data || [] }));
  }, []);

  const loadModules = useCallback(async () => {
    const r = await api.get(`/modules/${id}`);
    const list = r.data || [];
    setModules(list);
    await Promise.all(list.map(async (m) => {
      const [t, s] = await Promise.all([
        api.get(`/tasks/${m.id}`).catch(() => ({ data: [] })),
        api.get(`/evaluation/module-status/${m.id}`).catch(() => ({ data: {} })),
      ]);
      setTasks((p) => ({ ...p, [m.id]: t.data || [] }));
      setPassed((p) => ({ ...p, [m.id]: s.data?.passed === true }));
    }));
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get(`/roadmaps/${id}`).then((r) => alive && setRoadmap(r.data)),
      loadModules(),
      api.get(`/resources/${id}`).then((r) => alive && setResources(r.data || [])).catch(() => {}),
    ])
      .catch((e) => { if (e.response?.status === 404) setNotFound(true); else toast.error(errorMessage(e, 'Could not load roadmap')); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, loadModules, toast]);

  /* ---------- derived ---------- */
  const allTasks = modules.flatMap((m) => tasks[m.id] || []);
  const doneCount = allTasks.filter((t) => t.status === 'done').length;
  const overall = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;
  const isUnlocked = (i) => i === 0 || passed[modules[i - 1]?.id] === true;
  const moduleDone = (m) => { const t = tasks[m.id] || []; return t.length > 0 && t.every((x) => x.status === 'done'); };
  const allComplete = modules.length > 0 && modules.every((m) => moduleDone(m) && passed[m.id]);

  /* ---------- actions ---------- */
  const addModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.title.trim()) return;
    setSavingModule(true);
    try {
      await api.post('/modules', { roadmap_id: id, title: moduleForm.title.trim(), description: moduleForm.description, order_index: modules.length });
      await loadModules();
      setShowModule(false);
      setModuleForm({ title: '', description: '' });
      toast.success('Module added');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add module'));
    } finally {
      setSavingModule(false);
    }
  };

  const addTask = async (moduleId, data) => {
    try {
      await api.post('/tasks', { module_id: moduleId, description: '', ...data });
      await loadTasks(moduleId);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add task'));
      return false;
    }
  };

  const cycleStatus = async (task, moduleId) => {
    const next = NEXT_STATUS[task.status] || 'in_progress';
    // Optimistic update so the click feels instant.
    setTasks((p) => ({ ...p, [moduleId]: (p[moduleId] || []).map((t) => (t.id === task.id ? { ...t, status: next } : t)) }));
    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description || '',
        status: next,
        due_date: task.due_date ? String(task.due_date).slice(0, 10) : null,
        priority: task.priority || 'medium',
      });
    } catch (err) {
      setTasks((p) => ({ ...p, [moduleId]: (p[moduleId] || []).map((t) => (t.id === task.id ? task : t)) }));
      toast.error(errorMessage(err, 'Could not update task'));
    }
  };

  const addResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.title.trim()) return;
    setSavingResource(true);
    try {
      await api.post('/resources', { roadmap_id: id, ...resourceForm, title: resourceForm.title.trim(), is_free: true });
      const r = await api.get(`/resources/${id}`);
      setResources(r.data || []);
      setShowResource(false);
      setResourceForm({ title: '', url: '', type: 'article' });
      toast.success('Resource added');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add resource'));
    } finally {
      setSavingResource(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, item, moduleId } = confirm;
    setBusyConfirm(true);
    try {
      if (kind === 'module') {
        await api.delete(`/modules/${item.id}`);
        setModules((m) => m.filter((x) => x.id !== item.id));
        toast.success('Module deleted');
      } else if (kind === 'task') {
        await api.delete(`/tasks/${item.id}`);
        setTasks((p) => ({ ...p, [moduleId]: (p[moduleId] || []).filter((t) => t.id !== item.id) }));
      } else if (kind === 'resource') {
        await api.delete(`/resources/${item.id}`);
        setResources((r) => r.filter((x) => x.id !== item.id));
      } else if (kind === 'roadmap') {
        await api.delete(`/roadmaps/${id}`);
        toast.success('Roadmap deleted');
        navigate('/roadmaps');
        return;
      }
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete'));
    } finally {
      setBusyConfirm(false);
    }
  };

  /* ---------- render ---------- */
  if (loading) return <Loading label="Loading roadmap…" />;
  if (notFound || !roadmap) {
    return (
      <Card>
        <EmptyState icon="map" title="Roadmap not found" description="It may have been deleted." action={<Button onClick={() => navigate('/roadmaps')}>Back to roadmaps</Button>} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        back="/roadmaps"
        title={roadmap.title}
        description={roadmap.description}
        actions={
          <>
            <Button icon="plus" onClick={() => setShowModule(true)}>Add module</Button>
            {allComplete && <Button variant="primary" icon="award" onClick={() => navigate(`/roadmap-evaluation/${id}`)}>Final assessment</Button>}
            <Dropdown trigger={({ toggle }) => <Button variant="ghost" icon="more" onClick={toggle} aria-label="More actions" />}>
              <button className="menu-item" onClick={() => navigate(`/quiz?topic=${encodeURIComponent(roadmap.title)}`)}><Icon name="quiz" size={15} /> Practice quiz on this topic</button>
              <button className="menu-item" onClick={() => navigate('/study-planner')}><Icon name="calendar" size={15} /> Make a study plan</button>
              <div className="menu-sep" />
              <button className="menu-item danger" onClick={() => setConfirm({ kind: 'roadmap' })}><Icon name="trash" size={15} /> Delete roadmap</button>
            </Dropdown>
          </>
        }
      />

      {/* Overview */}
      <div className="card card-pad mb-3">
        <div className="row row-wrap" style={{ gap: 28 }}>
          <Ring value={overall} size={84} stroke={7} tone={overall === 100 ? 'success' : 'accent'} />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="row row-wrap" style={{ gap: 24 }}>
              <div><div className="tiny subtle">Modules</div><div style={{ fontWeight: 600, fontSize: 18 }}>{modules.length}</div></div>
              <div><div className="tiny subtle">Tasks done</div><div style={{ fontWeight: 600, fontSize: 18 }}>{doneCount}<span className="subtle" style={{ fontWeight: 400 }}> / {allTasks.length}</span></div></div>
              <div><div className="tiny subtle">Assessments passed</div><div style={{ fontWeight: 600, fontSize: 18 }}>{modules.filter((m) => passed[m.id]).length}<span className="subtle" style={{ fontWeight: 400 }}> / {modules.length}</span></div></div>
            </div>
            {(roadmap.goal || roadmap.duration) && (
              <div className="row row-wrap mt-2" style={{ gap: 8 }}>
                {roadmap.goal && <Badge><Icon name="target" size={12} /> {roadmap.goal}</Badge>}
                {roadmap.duration && <Badge><Icon name="clock" size={12} /> {roadmap.duration}</Badge>}
              </div>
            )}
          </div>
          {modules.length > 0 && (
            <div className="row" style={{ gap: 6 }} aria-label="Module progress">
              {modules.map((m, i) => (
                <div
                  key={m.id}
                  title={`Module ${i + 1}: ${m.title}`}
                  style={{
                    width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 600,
                    background: passed[m.id] ? 'var(--success)' : moduleDone(m) ? 'var(--warning-soft)' : 'var(--surface-2)',
                    color: passed[m.id] ? '#fff' : moduleDone(m) ? 'var(--warning)' : isUnlocked(i) ? 'var(--text-2)' : 'var(--text-3)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {passed[m.id] ? <Icon name="check" size={13} stroke={2.5} /> : !isUnlocked(i) ? <Icon name="lock" size={11} /> : i + 1}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {allComplete && (
        <div className="mb-3">
          <Alert tone="success">
            All modules complete and every assessment passed. <button className="btn btn-sm btn-ghost" style={{ color: 'inherit', textDecoration: 'underline' }} onClick={() => navigate(`/roadmap-evaluation/${id}`)}>Take the final assessment</button> to earn your certificate.
          </Alert>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[{ value: 'modules', label: `Modules (${modules.length})` }, { value: 'resources', label: `Resources (${resources.length})` }]}
      />

      {tab === 'modules' && (
        <div className="stack-lg">
          {modules.length === 0 && (
            <Card>
              <EmptyState icon="layers" title="Add your first module" description="Modules are the chapters of your roadmap. Each one holds a few tasks." action={<Button variant="primary" icon="plus" onClick={() => setShowModule(true)}>Add module</Button>} />
            </Card>
          )}

          {modules.map((m, i) => {
            const list = tasks[m.id] || [];
            const done = list.filter((t) => t.status === 'done').length;
            const unlocked = isUnlocked(i);
            const complete = moduleDone(m);
            const ok = passed[m.id];
            const isCollapsed = collapsed[m.id] ?? !unlocked;
            return (
              <div key={m.id} className="card" style={{ opacity: unlocked ? 1 : 0.75 }}>
                <div className="card-head" style={{ cursor: 'pointer' }} onClick={() => setCollapsed((c) => ({ ...c, [m.id]: !isCollapsed }))}>
                  <div className="row grow" style={{ gap: 12 }}>
                    <Icon name="chevronDown" size={16} style={{ color: 'var(--text-3)', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform var(--dur) var(--ease)' }} />
                    <div className="grow">
                      <div className="tiny subtle">Module {i + 1}</div>
                      <h2 className="truncate">{m.title}</h2>
                    </div>
                  </div>
                  <div className="row" onClick={(e) => e.stopPropagation()}>
                    {ok ? <Badge tone="success"><Icon name="check" size={12} /> Passed</Badge>
                      : !unlocked ? <Badge><Icon name="lock" size={11} /> Locked</Badge>
                      : complete ? <Badge tone="warning">Ready for assessment</Badge>
                      : <span className="small muted nowrap">{done}/{list.length} done</span>}
                    <Dropdown trigger={({ toggle }) => <Button variant="ghost" size="sm" icon="more" onClick={toggle} aria-label="Module actions" />}>
                      <button className="menu-item danger" onClick={() => setConfirm({ kind: 'module', item: m })}><Icon name="trash" size={15} /> Delete module</button>
                    </Dropdown>
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                    {list.length > 0 && <div style={{ padding: '14px 20px 2px' }}><Progress value={list.length ? (done / list.length) * 100 : 0} size="sm" tone={complete ? 'success' : undefined} /></div>}
                    {!unlocked && (
                      <div style={{ padding: '14px 20px 0' }}>
                        <Alert tone="warning">Pass the Module {i} assessment to unlock this module.</Alert>
                      </div>
                    )}
                    {m.description && <p className="small" style={{ padding: '12px 20px 0' }}>{m.description}</p>}

                    {list.length === 0 ? (
                      <p className="small subtle" style={{ padding: '16px 20px' }}>No tasks yet{unlocked ? ' — add one below.' : '.'}</p>
                    ) : (
                      <div className="list" style={{ marginTop: 8 }}>
                        {list.map((t) => (
                          <div key={t.id} className="list-row task-row" style={{ padding: '10px 20px' }}>
                            <StatusButton status={t.status} disabled={!unlocked} onClick={() => cycleStatus(t, m.id)} />
                            <div className="grow">
                              <div style={{ color: t.status === 'done' ? 'var(--text-3)' : 'var(--text)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</div>
                              <div className="row row-wrap tiny mt-1" style={{ gap: 8 }}>
                                {t.status === 'in_progress' && <span className="text-warning">In progress</span>}
                                {t.due_date && (
                                  <span className={isOverdue(t.due_date, t.status) ? 'text-danger' : 'subtle'}>
                                    <Icon name="calendar" size={11} style={{ verticalAlign: '-1px' }} /> {formatDate(t.due_date, { month: 'short', day: 'numeric' })}{isOverdue(t.due_date, t.status) ? ' · overdue' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            {t.priority && t.priority !== 'medium' && <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority === 'high' ? 'High' : 'Low'}</Badge>}
                            <Button variant="ghost" size="sm" icon="trash" aria-label="Delete task" onClick={() => setConfirm({ kind: 'task', item: t, moduleId: m.id })} />
                          </div>
                        ))}
                      </div>
                    )}

                    {unlocked && <AddTaskRow onAdd={(d) => addTask(m.id, d)} />}

                    {unlocked && complete && !ok && (
                      <div className="card-foot" style={{ justifyContent: 'space-between' }}>
                        <span className="small muted">All tasks done. Score 70% or more to pass this module.</span>
                        <Button variant="primary" size="sm" iconRight="arrowRight" onClick={() => navigate(`/module-evaluation/${m.id}`, { state: { module: m, roadmapId: id, tasks: list.map((x) => x.title) } })}>
                          Take assessment
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'resources' && (
        <Card
          title="Learning resources"
          description="Articles, videos and courses for this roadmap"
          pad={false}
          actions={<Button size="sm" icon="plus" onClick={() => setShowResource(true)}>Add resource</Button>}
        >
          {resources.length === 0 ? (
            <EmptyState icon="link" title="No resources yet" description="Save useful links here, or generate a roadmap with AI to get free resources automatically." />
          ) : (
            <div className="list">
              {resources.map((r) => (
                <div key={r.id} className="list-row">
                  <div className="list-icon"><Icon name={r.type === 'video' ? 'video' : r.type === 'course' ? 'grad' : 'book'} size={15} /></div>
                  <div className="grow">
                    <div style={{ fontWeight: 500 }} className="truncate">{r.title}</div>
                    <div className="tiny subtle truncate">{r.url ? r.url.replace(/^https?:\/\//, '') : 'No link'}</div>
                  </div>
                  <Badge>{r.type || 'article'}</Badge>
                  {r.is_free ? <Badge tone="success">Free</Badge> : null}
                  {r.url && (
                    <a className="btn btn-ghost btn-sm" href={r.url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> Open</a>
                  )}
                  <Button variant="ghost" size="sm" icon="trash" aria-label="Delete resource" onClick={() => setConfirm({ kind: 'resource', item: r })} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      <Modal
        open={showModule}
        onClose={() => setShowModule(false)}
        title="Add module"
        footer={<><Button onClick={() => setShowModule(false)}>Cancel</Button><Button variant="primary" type="submit" form="add-module" loading={savingModule} disabled={!moduleForm.title.trim()}>Add module</Button></>}
      >
        <form id="add-module" onSubmit={addModule}>
          <Field label="Module title"><Input autoFocus value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="e.g. JavaScript fundamentals" /></Field>
          <Field label="Description" optional><Textarea rows={3} value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} /></Field>
        </form>
      </Modal>

      <Modal
        open={showResource}
        onClose={() => setShowResource(false)}
        title="Add resource"
        footer={<><Button onClick={() => setShowResource(false)}>Cancel</Button><Button variant="primary" type="submit" form="add-resource" loading={savingResource} disabled={!resourceForm.title.trim()}>Add resource</Button></>}
      >
        <form id="add-resource" onSubmit={addResource}>
          <Field label="Title"><Input autoFocus value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} placeholder="MDN — JavaScript guide" /></Field>
          <Field label="Link"><Input type="url" value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} placeholder="https://" /></Field>
          <Field label="Type">
            <Select value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}>
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="course">Course</option>
              <option value="docs">Documentation</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'roadmap' ? 'Delete this roadmap?' : confirm?.kind === 'module' ? 'Delete module?' : confirm?.kind === 'task' ? 'Delete task?' : 'Remove resource?'}
        description={
          confirm?.kind === 'roadmap' ? `“${roadmap.title}” and all its modules and tasks will be removed.`
            : confirm?.kind === 'module' ? `“${confirm.item.title}” and its tasks will be removed.`
              : `“${confirm?.item?.title}” will be removed.`
        }
        confirmLabel={confirm?.kind === 'resource' ? 'Remove' : 'Delete'}
        loading={busyConfirm}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

export default RoadmapDetail;
