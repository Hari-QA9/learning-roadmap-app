import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from './Toast';
import { Button, Icon, Modal, Prose, Spinner, Textarea, parseDetails, timeAgo } from './ui';

const RES_ICON = { video: 'video', docs: 'book', course: 'grad', practice: 'target', article: 'file' };

/** Expanded panel under a task: instructions, steps, done-when, resources, notes, AI explain. */
export default function TaskDetail({ task, onExplained }) {
  const toast = useToast();
  const navigate = useNavigate();
  const d = parseDetails(task.details);
  const steps = d.steps || [];
  const doneWhen = d.done_when || [];
  const resources = d.resources || [];
  const stepKey = `learnmap.steps.${task.id}`;
  const [checked, setChecked] = useState(() => { try { return JSON.parse(localStorage.getItem(stepKey)) || {}; } catch { return {}; } });
  const [explainOpen, setExplainOpen] = useState(false);
  const [explanation, setExplanation] = useState(d.explanation || '');
  const [explaining, setExplaining] = useState(false);
  const [notes, setNotes] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/notes/${task.id}`).then((r) => alive && setNotes(r.data || [])).catch(() => alive && setNotes([]));
    return () => { alive = false; };
  }, [task.id]);

  const toggleStep = (i) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next);
    try { localStorage.setItem(stepKey, JSON.stringify(next)); } catch {}
  };

  const explain = async (refresh) => {
    setExplainOpen(true);
    if (explanation && !refresh) return;
    setExplaining(true);
    try {
      const r = await api.post(`/ai/explain-task/${task.id}`, { refresh: !!refresh }, { timeout: 120000 });
      setExplanation(r.data.explanation);
      onExplained?.(task.id, r.data.explanation);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not explain this task'));
      if (!explanation) setExplainOpen(false);
    } finally {
      setExplaining(false);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      const r = await api.post('/notes', { task_id: task.id, content: note.trim() });
      setNotes((n) => [{ id: r.data.id, content: note.trim(), created_at: new Date().toISOString() }, ...(n || [])]);
      setNote('');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save note'));
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (n) => {
    setNotes((list) => list.filter((x) => x.id !== n.id));
    api.delete(`/notes/${n.id}`).catch(() => toast.error('Could not delete note'));
  };

  return (
    <div className="task-detail fade-in">
      {task.description && <p style={{ color: 'var(--text)', paddingTop: 8 }}>{task.description}</p>}

      <div className="row row-wrap mt-2" style={{ gap: 8 }}>
        <Button size="sm" variant="primary" icon="sparkles" onClick={() => explain(false)}>Explain this</Button>
        <Button size="sm" icon="message" onClick={() => navigate(`/chat?q=${encodeURIComponent(`Help me with this task from my roadmap: ${task.title}. ${task.description || ''}`)}`)}>Ask AI</Button>
      </div>

      {steps.length > 0 && (
        <>
          <div className="section-label">Steps</div>
          <ul className="check-list">
            {steps.map((s, i) => (
              <li key={i}>
                <label className="checkbox" style={{ alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={!!checked[i]} onChange={() => toggleStep(i)} style={{ marginTop: 2 }} />
                  <span style={{ color: checked[i] ? 'var(--text-3)' : 'var(--text)', textDecoration: checked[i] ? 'line-through' : 'none' }}>{s}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {doneWhen.length > 0 && (
        <>
          <div className="section-label">Done when</div>
          <ul className="check-list">
            {doneWhen.map((s, i) => <li key={i}><Icon name="target" size={14} className="text-success" />{s}</li>)}
          </ul>
        </>
      )}

      {resources.length > 0 && (
        <>
          <div className="section-label">Resources</div>
          <div className="stack-sm">
            {resources.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="row small" style={{ gap: 8, color: 'var(--text)' }}>
                <span className="list-icon" style={{ width: 26, height: 26 }}><Icon name={RES_ICON[r.type] || 'link'} size={13} /></span>
                <span className="grow truncate">{r.title}</span>
                {r.source && <span className="tiny subtle nowrap">{r.source}</span>}
                <Icon name="external" size={13} style={{ color: 'var(--text-3)' }} />
              </a>
            ))}
          </div>
        </>
      )}

      <div className="section-label">Notes</div>
      <form onSubmit={addNote} className="row" style={{ alignItems: 'flex-start' }}>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write what you learned, links, questions…" style={{ minHeight: 42, background: 'var(--surface)' }} />
        <Button type="submit" size="sm" loading={saving} disabled={!note.trim()} style={{ marginTop: 6 }}>Save</Button>
      </form>
      {notes === null ? (
        <div className="row small muted mt-1"><Spinner size={12} /> Loading notes…</div>
      ) : notes.length > 0 && (
        <div className="stack-sm mt-2">
          {notes.map((n) => (
            <div key={n.id} className="callout row" style={{ alignItems: 'flex-start', padding: '10px 12px' }}>
              <div className="grow">
                <div className="small" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{n.content}</div>
                <div className="tiny subtle mt-1">{timeAgo(n.created_at)}</div>
              </div>
              <Button variant="ghost" size="sm" icon="trash" aria-label="Delete note" onClick={() => removeNote(n)} />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        size="lg"
        title={task.title}
        description="A short lesson written for your level"
        footer={
          <>
            <Button variant="ghost" icon="refresh" disabled={explaining} onClick={() => explain(true)}>Explain differently</Button>
            <Button onClick={() => setExplainOpen(false)}>Close</Button>
          </>
        }
      >
        {explaining ? <div className="loading-block"><Spinner /> Writing your lesson…</div> : <Prose text={explanation} />}
      </Modal>
    </div>
  );
}
