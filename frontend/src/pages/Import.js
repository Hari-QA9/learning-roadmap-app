import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Field, Input, Textarea, Segmented, Select, Loading, Icon, Alert } from '../components/ui';

/** Turn a YouTube playlist, a course syllabus or your notes into a roadmap (and flashcards). */
export default function Import() {
  const navigate = useNavigate();
  const toast = useToast();
  const [source, setSource] = useState('text');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [hours, setHours] = useState('6');
  const [cards, setCards] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const file = useRef(null);

  const readFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500000) { toast.error('That file is too big — paste the important part instead.'); return; }
    if (!/\.(txt|md|markdown|csv)$/i.test(f.name) && !/^text\//.test(f.type)) { toast.error('Upload a .txt or .md file, or copy the text from your PDF and paste it.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result || '')); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')); };
    reader.readAsText(f);
  };

  const run = async () => {
    setError('');
    setBusy('Building your roadmap…');
    try {
      const r = await api.post('/import/roadmap', source === 'youtube' ? { source, url, title, hoursPerWeek: Number(hours) } : { source, text, title, hoursPerWeek: Number(hours) }, { timeout: 180000 });
      if (cards) {
        setBusy('Making flashcards…');
        await api.post('/learning/flashcards/generate', { roadmap_id: r.data.roadmapId }, { timeout: 120000 }).catch(() => {});
      }
      toast.success(`“${r.data.title}” is ready — ${r.data.tasks} tasks`);
      navigate(`/roadmaps/${r.data.roadmapId}`);
    } catch (e) {
      setError(errorMessage(e, 'Could not import this'));
      setBusy('');
    }
  };
  const ready = source === 'youtube' ? /list=/.test(url) : text.trim().length >= 40;

  return (
    <>
      <PageHeader back="/roadmaps" title="Import a course" description="Already have material? Turn a YouTube playlist, a class syllabus or your notes into a step-by-step roadmap you can track." />
      <div className="split">
        <Card>
          {busy ? <Loading label={busy} /> : (
            <div className="stack">
              {error && <Alert tone="danger">{error}</Alert>}
              <Segmented value={source} onChange={setSource} options={[{ value: 'text', label: 'Syllabus or notes' }, { value: 'youtube', label: 'YouTube playlist' }]} />
              {source === 'youtube' ? (
                <Field label="Playlist link" hint="Open the playlist on YouTube and copy the address — it contains “list=”.">
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…" aria-label="Playlist link" />
                </Field>
              ) : (
                <>
                  <Field label="Paste your material" hint="A course syllabus, table of contents, lecture list, study guide or your own notes.">
                    <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Week 1: Introduction to cells\nWeek 2: DNA and genetics\nWeek 3: Midterm review…'} aria-label="Material" />
                  </Field>
                  <div className="row small" style={{ gap: 8 }}>
                    <Button size="sm" icon="upload" onClick={() => file.current?.click()}>Upload .txt / .md</Button>
                    <span className="muted">For a PDF: open it, select all, copy and paste here.</span>
                    <input ref={file} type="file" accept=".txt,.md,.markdown,.csv,text/plain" hidden onChange={readFile} />
                  </div>
                </>
              )}
              <div className="grid-2">
                <Field label="Roadmap name" optional><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. BIO 101 — Fall" /></Field>
                <Field label="Hours per week">
                  <Select value={hours} onChange={(e) => setHours(e.target.value)}>{['2', '4', '6', '10', '15', '20'].map((h) => <option key={h} value={h}>{h} hours</option>)}</Select>
                </Field>
              </div>
              <label className="row small" style={{ gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={cards} onChange={(e) => setCards(e.target.checked)} />
                <span>Also make flashcards so I remember it</span>
              </label>
              <Button variant="primary" icon="wand" disabled={!ready} onClick={run}>Build my roadmap</Button>
            </div>
          )}
        </Card>
        <Card title="Good to import">
          <div className="stack-sm small">
            {[['grad', 'A class syllabus', 'Get the whole semester as weekly modules with reading, practice and review.'],
              ['video', 'A YouTube course playlist', 'Every video becomes a task in order, with practice added between them.'],
              ['book', 'A book’s table of contents', 'Turn chapters into a reading plan you can actually finish.'],
              ['note', 'Your own notes or a study guide', 'Organise messy notes into steps — plus flashcards to remember them.']].map(([icon, h, p]) => (
              <div key={h} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <div className="list-icon"><Icon name={icon} size={15} /></div>
                <div><strong style={{ color: 'var(--text)' }}>{h}</strong><div className="muted">{p}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
