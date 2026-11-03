import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { useI18n } from '../lib/i18n';
import { PageHeader, Card, Button, Segmented, Modal, Field, Textarea, EmptyState, SkeletonRows } from '../components/ui';
import { ComicStrip, ComicPlayer, ComicQuiz } from '../components/cartoon/Comic';

/** One cartoon lesson: read it as a comic, or watch it played and read aloud. */
export default function Cartoon() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { lang } = useI18n();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('watch');
  const [finished, setFinished] = useState(false);
  const [report, setReport] = useState(null); // null | text
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setC(null); setError(''); setFinished(false);
    api.get(`/cartoons/${id}`).then((r) => setC(r.data)).catch((e) => setError(errorMessage(e, 'Could not load this cartoon.')));
  }, [id]);

  const sendReport = async () => {
    setBusy(true);
    try { const r = await api.post(`/cartoons/${id}/report`, { reason: report }); toast.success(r.data.message); setReport(null); }
    catch (e) { toast.error(errorMessage(e, 'Could not send')); }
    finally { setBusy(false); }
  };
  const remake = async () => {
    setBusy(true);
    try { const r = await api.post(`/cartoons/${id}/remake`, {}, { timeout: 120000 }); setC(r.data); setFinished(false); toast.success('Here’s a new version'); }
    catch (e) { toast.error(errorMessage(e, 'Could not make a new version')); }
    finally { setBusy(false); }
  };

  if (error) return <Card><EmptyState icon="alert" title="Cartoon not available" description={error} action={<Button onClick={() => navigate('/cartoons')}>Cartoon lessons</Button>} /></Card>;
  if (!c) return <><PageHeader title="Cartoon lesson" /><Card><SkeletonRows rows={5} /></Card></>;

  return (
    <>
      <PageHeader back eyebrow="Cartoon lesson" title={c.title} description={c.analogy || undefined}
        actions={<Segmented value={mode} onChange={setMode} options={[{ value: 'watch', label: 'Watch' }, { value: 'read', label: 'Read' }]} />} />
      <div className="comic-wrap">
        {mode === 'watch' ? <ComicPlayer key={`${c.id}-${c.panels.length}-${c.title}`} comic={c} lang={c.lang || lang} onFinish={() => setFinished(true)} /> : <ComicStrip comic={c} />}
        {(mode === 'read' || finished) && (
          <Card className="mt-3">
            {c.summary && <p className="comic-summary"><strong>In one sentence:</strong> {c.summary}</p>}
            <ComicQuiz quiz={c.quiz} />
          </Card>
        )}
        {mode === 'watch' && !finished && <p className="tiny subtle mt-2">Press Play — Vo and Pip act it out and your device reads it aloud. Or switch to “Read” to go at your own pace.</p>}
        <div className="row row-wrap mt-3" style={{ gap: 8 }}>
          <Button size="sm" variant="ghost" icon="flag" onClick={() => setReport('')}>Report a mistake</Button>
          <Button size="sm" variant="ghost" icon="refresh" loading={busy && report === null} onClick={remake}>Make a new version</Button>
          <span className="grow" />
          <span className="tiny subtle">Made by AI — it can be wrong. Double-check important facts.</span>
        </div>
      </div>
      <Modal open={report !== null} onClose={() => setReport(null)} title="What’s wrong in this cartoon?"
        footer={<><Button onClick={() => setReport(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={(report || '').trim().length < 3} onClick={sendReport}>Send</Button></>}>
        <Field label="Tell us briefly"><Textarea rows={3} value={report || ''} onChange={(e) => setReport(e.target.value)} placeholder="e.g. Panel 3 says … but actually …" autoFocus /></Field>
      </Modal>
    </>
  );
}
