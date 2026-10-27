import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Field, Select, Textarea, EmptyState, SkeletonRows, Icon, Loading, ConfirmDialog, timeAgo } from '../components/ui';
import JobPicker, { jobPayload, jobReady } from '../components/career/JobPicker';
import useJobOptions from '../lib/jobOptions';
import { copyText } from '../lib/growth';

const REWRITES = [
  { how: 'shorter', label: 'Shorter' },
  { how: 'specific', label: 'More specific' },
  { how: 'stronger_opening', label: 'Stronger opening' },
  { how: 'warmer', label: 'Warmer' },
  { how: 'formal', label: 'More formal' },
];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function printLetter(title, content) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { margin: 22mm; } body { font: 11.5pt/1.6 Georgia, 'Times New Roman', serif; color: #111; max-width: 680px; margin: 30px auto; }
    p { margin: 0 0 12px; white-space: pre-wrap; }</style></head><body>${content.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}
    <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script></body></html>`);
  w.document.close();
  return true;
}

export default function CoverLetters() {
  const toast = useToast();
  const [params] = useSearchParams();
  const { jobs, groups } = useJobOptions();
  const [docs, setDocs] = useState(null);
  const [open, setOpen] = useState(null); // full doc being edited
  const [creating, setCreating] = useState(!!params.get('job'));
  const [form, setForm] = useState({ mode: 'job', job_id: params.get('job') || '', role: '', company: '', description: '', tone: 'professional', length: 'medium', highlights: '' });
  const [busy, setBusy] = useState(false);
  const [rewriting, setRewriting] = useState('');
  const [text, setText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => api.get('/career/docs', { params: { kind: 'cover_letter' }, noCache: true }).then((r) => setDocs(r.data)).catch(() => setDocs([])), []);
  useEffect(() => { load(); }, [load]);
  const openDoc = async (id) => {
    try { const r = await api.get(`/career/docs/${id}`, { noCache: true }); setOpen(r.data); setText(r.data.data.content || ''); setDirty(false); setCreating(false); } catch (e) { toast.error(errorMessage(e, 'Could not open')); }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api.post('/career/cover-letter', { ...jobPayload(form), tone: form.tone, length: form.length, highlights: form.highlights }, { timeout: 120000 });
      await load();
      await openDoc(r.data.id);
      toast.success('Cover letter ready — edit anything you like');
    } catch (e) { toast.error(errorMessage(e, 'Could not write the letter')); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!open || !dirty) return;
    try { await api.put(`/career/docs/${open.id}`, { content: text }); setDirty(false); toast.success('Saved'); load(); } catch (e) { toast.error(errorMessage(e, 'Could not save')); }
  };
  const rewrite = async (how) => {
    if (dirty) await save();
    setRewriting(how);
    try {
      const r = await api.post(`/career/cover-letter/${open.id}/rewrite`, { how }, { timeout: 120000 });
      setOpen((d) => ({ ...d, data: { ...d.data, previous: text, content: r.data.content } }));
      setText(r.data.content); setDirty(false);
    } catch (e) { toast.error(errorMessage(e, 'Could not rewrite')); } finally { setRewriting(''); }
  };
  const undo = () => { if (open?.data?.previous) { setText(open.data.previous); setDirty(true); } };
  const remove = async () => {
    const d = toDelete; setToDelete(null);
    try { await api.delete(`/career/docs/${d.id}`); if (open?.id === d.id) setOpen(null); load(); } catch (e) { toast.error(errorMessage(e, 'Could not delete')); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `${(open.title || 'cover-letter').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      <PageHeader eyebrow="Career" title="Cover letters" description="A tailored letter for every application in seconds — built from your resume and the job, never inventing experience."
        actions={<Button variant="primary" icon="plus" onClick={() => { setCreating(true); setOpen(null); }}>New cover letter</Button>} />
      <div className="split form-left">
        <Card title="Your letters" pad={false}>
          {!docs ? <SkeletonRows rows={3} /> : docs.length === 0 ? (
            <EmptyState icon="file" title="No letters yet" description="Pick a job and we’ll write the first draft." />
          ) : (
            <div className="list">
              {docs.map((d) => (
                <div key={d.id} className={`list-row clickable ${open?.id === d.id ? 'active-row' : ''}`} onClick={() => openDoc(d.id)}>
                  <div className="list-icon"><Icon name="file" size={15} /></div>
                  <div className="grow" style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 500 }}>{d.title}</div><div className="tiny subtle">Edited {timeAgo(d.updated_at)}</div></div>
                  <Button variant="ghost" size="sm" icon="trash" aria-label={`Delete ${d.title}`} onClick={(e) => { e.stopPropagation(); setToDelete(d); }} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {creating ? (
          <Card title="New cover letter">
            {busy ? <Loading label="Writing your letter…" /> : (
              <div className="stack-sm">
                <JobPicker value={form} onChange={setForm} groups={groups} jobs={jobs} />
                <div className="grid-2">
                  <Field label="Tone">
                    <Select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                      <option value="professional">Professional</option><option value="enthusiastic">Enthusiastic</option><option value="concise">Concise</option><option value="formal">Formal</option>
                    </Select>
                  </Field>
                  <Field label="Length">
                    <Select value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })}>
                      <option value="short">Short (~180 words)</option><option value="medium">Medium (~300 words)</option><option value="long">Long (~400 words)</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Anything to mention?" optional hint="e.g. relocating to Boston in May, referred by Jane Doe, love their product">
                  <Textarea rows={2} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} />
                </Field>
                <Button variant="primary" icon="sparkles" disabled={!jobReady(form)} onClick={generate}>Write my cover letter</Button>
              </div>
            )}
          </Card>
        ) : open ? (
          <Card title={open.title} description={`${words} words${dirty ? ' · unsaved changes' : ''}`}
            actions={<Button variant="primary" size="sm" disabled={!dirty} onClick={save}>Save</Button>}>
            <div className="stack-sm">
              <div className="row row-wrap" style={{ gap: 6 }}>
                {REWRITES.map((r) => <Button key={r.how} size="sm" loading={rewriting === r.how} disabled={!!rewriting} onClick={() => rewrite(r.how)}>{r.label}</Button>)}
                {open.data.previous && <Button size="sm" variant="ghost" icon="refresh" onClick={undo}>Undo</Button>}
              </div>
              <Textarea className="letter-editor" rows={18} value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} onBlur={save} aria-label="Cover letter" />
              {open.data.talking_points?.length > 0 && (
                <div className="small muted"><strong style={{ color: 'var(--text)' }}>Strongest matches used:</strong> {open.data.talking_points.join(' · ')}</div>
              )}
              {open.data.has_resume === false && <div className="alert alert-warning small">Tip: save your resume in the Resume builder — letters get much more specific.</div>}
              <div className="row row-wrap" style={{ gap: 8 }}>
                <Button icon="copy" onClick={async () => { if (await copyText(text)) toast.success('Copied — paste it into the application'); }}>Copy</Button>
                <Button icon="download" onClick={download}>Download .txt</Button>
                <Button icon="print" onClick={() => { if (!printLetter(open.title, text)) toast.error('Allow pop-ups to print'); }}>Print / PDF</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card><EmptyState icon="file" title="Pick a letter or start a new one" action={<Button variant="primary" onClick={() => setCreating(true)}>New cover letter</Button>} /></Card>
        )}
      </div>
      <ConfirmDialog open={!!toDelete} title="Delete this cover letter?" description={toDelete?.title} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
