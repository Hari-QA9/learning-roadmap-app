import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { STATUS } from '../components/JobRow';
import { googleCalendarUrl, downloadICS } from '../lib/calendar';
import {
  PageHeader, Button, Card, EmptyState, SkeletonRows, Select, Modal, Field, Input, Textarea, ConfirmDialog, Icon, Stat, Dropdown, timeAgo,
} from '../components/ui';

const COLUMNS = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];
// <input type="datetime-local"> works in local time; we store an ISO time with time zone.
const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fmtWhen = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const interviewEvent = (a) => {
  const start = new Date(a.interview_at);
  return { uid: `interview-${a.id}@learnmap`, start, end: new Date(start.getTime() + 3600000), title: `Interview: ${a.job_title}${a.company ? ` — ${a.company}` : ''}`, details: [a.next_step, a.contact_name && `Contact: ${a.contact_name}${a.contact_email ? ` <${a.contact_email}>` : ''}`, a.url].filter(Boolean).join('\n'), location: a.location || '', alarmMinutes: 60 };
};
const emptyForm = { job_title: '', company: '', url: '', location: '', status: 'applied', notes: '' };

function Applications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [apps, setApps] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailsFor, setDetailsFor] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = () => api.get('/applications', { noCache: true }).then((r) => setApps(r.data || [])).catch((e) => { setApps([]); toast.error(errorMessage(e, 'Could not load applications')); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const update = async (app, patch) => {
    setApps((list) => list.map((a) => (a.id === app.id ? { ...a, ...patch } : a)));
    try { await api.put(`/applications/${app.id}`, patch); } catch (e) { toast.error(errorMessage(e, 'Could not update')); load(); }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.job_title.trim()) return toast.error('Add the job title');
    setSaving(true);
    try {
      await api.post('/applications', form);
      toast.success('Added to your tracker');
      setAddOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const app = toDelete;
    setToDelete(null);
    setApps((list) => list.filter((a) => a.id !== app.id));
    try { await api.delete(`/applications/${app.id}`); } catch { load(); }
  };

  const saveDetails = async () => {
    const a = detailsFor;
    const patch = {
      notes: a.d_notes, contact_name: a.d_contact, contact_email: a.d_email, next_step: a.d_next,
      interview_at: a.d_when ? new Date(a.d_when).toISOString() : null,
    };
    setSavingDetails(true);
    try {
      await api.put(`/applications/${a.id}`, patch);
      setDetailsFor(null);
      toast.success(a.d_when && !a.interview_at ? 'Interview saved — we’ll remind you the day before' : 'Saved');
      load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save'));
    } finally {
      setSavingDetails(false);
    }
  };

  const count = (s) => (apps || []).filter((a) => a.status === s).length;
  const active = (apps || []).filter((a) => ['applied', 'interviewing', 'offer'].includes(a.status)).length;
  const responseRate = active ? Math.round(((count('interviewing') + count('offer')) / active) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Career"
        title="Applications"
        description="Every job you’ve saved or applied to, in one place."
        actions={
          <>
            <Button icon="briefcase" onClick={() => navigate('/jobs')}>Find jobs</Button>
            <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>Add application</Button>
          </>
        }
      />

      <div className="grid-4 mb-3 stagger">
        <Stat label="Saved" icon="star" value={count('saved')} loading={!apps} />
        <Stat label="Applied" icon="send" value={count('applied') + count('interviewing') + count('offer') + count('rejected')} loading={!apps} />
        <Stat label="Interviews" icon="message" value={count('interviewing') + count('offer')} loading={!apps} />
        <Stat label="Response rate" icon="chart" value={`${responseRate}%`} note="Interviews ÷ active applications" loading={!apps} />
      </div>

      {!apps ? (
        <Card><SkeletonRows rows={5} /></Card>
      ) : apps.length === 0 ? (
        <Card>
          <EmptyState
            icon="briefcase"
            title="Nothing tracked yet"
            description="Save jobs from the board, or let the AI prepare an application — they’ll show up here so you can follow each one to an offer."
            action={<Button variant="primary" onClick={() => navigate('/jobs')}>Browse jobs</Button>}
          />
        </Card>
      ) : (
        <div className="kanban">
          {COLUMNS.map((col) => {
            const list = apps.filter((a) => a.status === col);
            return (
              <div key={col} className="kanban-col">
                <div className="kanban-head"><span>{STATUS[col].label}</span><span className="tiny subtle">{list.length}</span></div>
                {list.length === 0 && <div className="kanban-empty tiny subtle">—</div>}
                {list.map((a) => (
                  <div key={a.id} className="card kanban-card">
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          className={`job-title small ${a.job_id ? 'link-like' : ''}`}
                          onClick={() => a.job_id && navigate(`/jobs/${a.job_id}`)}
                          role={a.job_id ? 'link' : undefined}
                        >
                          {a.job_title}
                        </div>
                        <div className="tiny subtle truncate">{[a.company, a.location].filter(Boolean).join(' · ')}</div>
                      </div>
                      <Button size="sm" variant="ghost" icon="trash" aria-label="Remove" onClick={() => setToDelete(a)} />
                    </div>
                    {a.interview_at && (
                      <div className="interview-chip mt-1">
                        <Icon name="calendar" size={12} /> <span className="grow">{new Date(a.interview_at) < new Date() ? 'Interviewed' : 'Interview'} {fmtWhen(a.interview_at)}</span>
                        {new Date(a.interview_at) > new Date() && (
                          <Dropdown trigger={({ toggle }) => <button type="button" className="chip-btn" onClick={toggle} aria-label="Add to calendar">Add to calendar</button>}>
                            <a className="menu-item" href={googleCalendarUrl(interviewEvent(a))} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> Google Calendar</a>
                            <button className="menu-item" onClick={() => downloadICS(`interview-${a.company || a.job_title}`, [interviewEvent(a)])}><Icon name="download" size={14} /> Outlook / Apple (.ics)</button>
                          </Dropdown>
                        )}
                      </div>
                    )}
                    {a.next_step && <div className="tiny mt-1" style={{ color: 'var(--text)' }}><Icon name="arrowRight" size={11} /> {a.next_step}</div>}
                    {a.contact_name && <div className="tiny subtle mt-1">Contact: {a.contact_email ? <a href={`mailto:${a.contact_email}`}>{a.contact_name}</a> : a.contact_name}</div>}
                    {a.notes && <div className="tiny muted mt-1 clamp-2">{a.notes}</div>}
                    {a.status === 'interviewing' && a.job_id && <button type="button" className="link-btn tiny mt-1" onClick={() => navigate(`/interview?job=${a.job_id}`)}><Icon name="message" size={11} /> Practice for this interview</button>}
                    <div className="row mt-2" style={{ gap: 6 }}>
                      <Select value={a.status} onChange={(e) => update(a, { status: e.target.value })} aria-label="Status" className="select-sm grow">
                        {COLUMNS.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                      </Select>
                      <Button size="sm" variant="ghost" icon="edit" aria-label="Details" title="Interview date, contact, next step, notes" onClick={() => setDetailsFor({ ...a, d_notes: a.notes || '', d_when: toLocalInput(a.interview_at), d_contact: a.contact_name || '', d_email: a.contact_email || '', d_next: a.next_step || '' })} />
                      {a.url && <a className="btn btn-ghost btn-sm btn-icon" href={a.url} target="_blank" rel="noopener noreferrer" aria-label="Open posting"><Icon name="external" size={14} /></a>}
                    </div>
                    <div className="tiny subtle mt-1">Updated {timeAgo(a.updated_at || a.applied_at)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add an application"
        description="Track a job you applied to outside Learnvoy."
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={add}>Add</Button></>}
      >
        <form className="stack" onSubmit={add}>
          <div className="grid-2">
            <Field label="Job title"><Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></Field>
            <Field label="Company" optional><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          </div>
          <div className="grid-2">
            <Field label="Link" optional><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {COLUMNS.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Notes" optional><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Recruiter name, referral, next steps…" /></Field>
        </form>
      </Modal>

      <Modal
        open={!!detailsFor}
        onClose={() => setDetailsFor(null)}
        title="Application details"
        description={detailsFor ? `${detailsFor.job_title}${detailsFor.company ? ` · ${detailsFor.company}` : ''}` : ''}
        footer={<><Button variant="ghost" onClick={() => setDetailsFor(null)}>Cancel</Button><Button variant="primary" loading={savingDetails} onClick={saveDetails}>Save</Button></>}
      >
        {detailsFor && (
          <div className="stack">
            <Field label="Interview date & time" optional hint="We’ll remind you the day before and add it to your calendar feed.">
              <Input type="datetime-local" value={detailsFor.d_when} onChange={(e) => setDetailsFor({ ...detailsFor, d_when: e.target.value })} />
            </Field>
            <div className="grid-2">
              <Field label="Contact name" optional><Input value={detailsFor.d_contact} onChange={(e) => setDetailsFor({ ...detailsFor, d_contact: e.target.value })} placeholder="Recruiter or hiring manager" /></Field>
              <Field label="Contact email" optional><Input type="email" value={detailsFor.d_email} onChange={(e) => setDetailsFor({ ...detailsFor, d_email: e.target.value })} /></Field>
            </div>
            <Field label="Next step" optional><Input value={detailsFor.d_next} onChange={(e) => setDetailsFor({ ...detailsFor, d_next: e.target.value })} placeholder="e.g. Send thank-you note; prepare case study" /></Field>
            <Field label="Notes" optional><Textarea rows={4} value={detailsFor.d_notes} onChange={(e) => setDetailsFor({ ...detailsFor, d_notes: e.target.value })} placeholder="Interview questions, salary range, referral…" /></Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this application?"
        description={toDelete ? `“${toDelete.job_title}” will be removed from your tracker.` : ''}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

export default Applications;
