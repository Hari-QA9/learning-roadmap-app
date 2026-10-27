import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  PageHeader, Card, Button, Stat, Icon, EmptyState, SkeletonRows, Modal, Field, Input, Textarea, Select, Segmented, Badge,
} from '../components/ui';

const GRADES = [
  { key: 'again', label: 'Again', tone: 'danger', hotkey: '1' },
  { key: 'hard', label: 'Hard', tone: 'warning', hotkey: '2' },
  { key: 'good', label: 'Good', tone: 'success', hotkey: '3' },
  { key: 'easy', label: 'Easy', tone: 'accent', hotkey: '4' },
];

/** One review session: show a card, reveal, grade — keyboard: Space to reveal, 1–4 to grade. */
function Session({ deck, onDone }) {
  const toast = useToast();
  const [cards, setCards] = useState(null);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [, setBusy] = useState(false);

  useEffect(() => {
    api.get('/learning/flashcards/due', { params: { roadmap_id: deck ?? undefined, limit: 50 }, noCache: true })
      .then((r) => setCards(r.data.cards)).catch((e) => { toast.error(errorMessage(e, 'Could not load cards')); onDone(); });
  }, [deck]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = cards?.[i];
  // Move on instantly; the review is saved in the background.
  const grade = useCallback((g) => {
    if (!card) return;
    setDone((n) => n + 1);
    setCards((list) => (g === 'again' ? [...list, card] : list)); // "Again" cards come back at the end
    setI((n) => n + 1);
    setShown(false);
    setBusy(true);
    api.post(`/learning/flashcards/${card.id}/review`, { grade: g })
      .catch((e) => toast.error(errorMessage(e, 'A review could not be saved')))
      .finally(() => setBusy(false));
  }, [card, toast]);

  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setShown(true); }
      const g = GRADES.find((x) => x.hotkey === e.key);
      if (g && shown) grade(g.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, grade]);

  if (!cards) return <Card><SkeletonRows rows={4} /></Card>;
  if (!card) {
    return (
      <Card>
        <EmptyState icon="checkCircle" title={done ? `Done — ${done} review${done === 1 ? '' : 's'}` : 'Nothing due here'}
          description={done ? 'Cards come back just before you’d forget them. See you tomorrow!' : 'All caught up. New cards and ones you’re about to forget will show up here.'}
          action={<Button variant="primary" onClick={onDone}>Back to decks</Button>} />
      </Card>
    );
  }
  return (
    <div className="stack-sm">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Button variant="ghost" size="sm" icon="arrowLeft" onClick={onDone}>Decks</Button>
        <span className="small muted">{Math.min(i + 1, cards.length)} / {cards.length}</span>
      </div>
      <div className="progress progress-sm"><span style={{ width: `${(i / cards.length) * 100}%` }} /></div>
      <div className={`flashcard card ${shown ? 'revealed' : ''}`} onClick={() => setShown(true)} role="button" tabIndex={0} aria-label={shown ? 'Answer shown' : 'Show answer'}>
        <div className="flashcard-front">{card.front}</div>
        {shown ? <div className="flashcard-back fade-in">{card.back}</div> : <div className="tiny subtle mt-3">Tap or press Space to show the answer</div>}
      </div>
      {shown ? (
        <div className="grade-row">
          {GRADES.map((g) => (
            <button key={g.key} type="button" className={`grade-btn ${g.tone}`} onClick={() => grade(g.key)}>
              <strong>{g.label}</strong><span>{card.next?.[g.key]}</span>
            </button>
          ))}
        </div>
      ) : (
        <Button variant="primary" size="lg" block onClick={() => setShown(true)}>Show answer</Button>
      )}
    </div>
  );
}

export default function Review() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [s, setS] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [deck, setDeck] = useState(params.get('start') ? (params.get('deck') || null) : undefined); // undefined = deck list
  const [view, setView] = useState('decks');
  const [cards, setCards] = useState(null);
  const [browseDeck, setBrowseDeck] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'generate' | {edit}
  const [form, setForm] = useState({ front: '', back: '', roadmap_id: '', text: '', topic: '', source: 'roadmap' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.get('/learning/flashcards/summary', { noCache: true }).then((r) => setS(r.data)).catch(() => setS({ total: 0, due: 0, decks: [], error: true })), []);
  useEffect(() => { load(); api.get('/roadmaps').then((r) => setRoadmaps(r.data || [])).catch(() => {}); }, [load]);
  useEffect(() => {
    if (view !== 'browse') return;
    setCards(null);
    api.get('/learning/flashcards', { params: { roadmap_id: browseDeck || undefined }, noCache: true }).then((r) => setCards(r.data.cards)).catch(() => setCards([]));
  }, [view, browseDeck, s]);

  const close = () => { setModal(null); setForm({ front: '', back: '', roadmap_id: '', text: '', topic: '', source: 'roadmap' }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/learning/flashcards', { front: form.front, back: form.back, roadmap_id: form.roadmap_id || null });
        toast.success('Card added');
      } else if (modal === 'generate') {
        const body = form.source === 'roadmap' ? { roadmap_id: Number(form.roadmap_id) } : { text: form.text, topic: form.topic };
        const r = await api.post('/learning/flashcards/generate', body, { timeout: 120000 });
        toast.success(r.data.message);
      } else if (modal?.edit) {
        await api.put(`/learning/flashcards/${modal.edit.id}`, { front: form.front, back: form.back });
        toast.success('Card updated');
      }
      close(); load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save'));
    } finally { setSaving(false); }
  };
  const remove = async (c) => {
    try { await api.delete(`/learning/flashcards/${c.id}`); setCards((l) => l.filter((x) => x.id !== c.id)); load(); } catch (e) { toast.error(errorMessage(e, 'Could not delete')); }
  };

  if (deck !== undefined) return (<><PageHeader title="Review" /><Session deck={deck} onDone={() => { setDeck(undefined); load(); }} /></>);

  const canSubmit = modal === 'add' || modal?.edit ? form.front.trim() && form.back.trim() : form.source === 'roadmap' ? !!form.roadmap_id : form.text.trim().length > 20;

  return (
    <>
      <PageHeader title="Review" description="Flashcards that come back just before you’d forget them (spaced repetition). A few minutes a day locks in what you learn."
        actions={<>
          <Button icon="plus" onClick={() => setModal('add')}>Add card</Button>
          <Button variant="primary" icon="sparkles" onClick={() => setModal('generate')}>Make cards with AI</Button>
        </>} />

      <div className="grid-4 mb-3">
        <Stat label="Due now" icon="clock" value={s?.due ?? '—'} loading={!s} />
        <Stat label="Reviewed today" icon="checkCircle" value={s?.reviewed_today ?? '—'} loading={!s} />
        <Stat label="Review streak" icon="flame" value={s ? `${s.streak} day${s.streak === 1 ? '' : 's'}` : '—'} loading={!s} />
        <Stat label="Mastered" icon="award" value={s ? `${s.mastered} / ${s.total}` : '—'} note="Remembered for 3+ weeks" loading={!s} />
      </div>

      {s?.total > 0 && <div className="mb-3"><Segmented value={view} onChange={setView} options={[{ value: 'decks', label: 'Decks' }, { value: 'browse', label: 'All cards' }]} /></div>}

      {!s ? <Card><SkeletonRows rows={3} /></Card> : s.total === 0 ? (
        <Card>
          <EmptyState icon="layers" title="No flashcards yet" description="Make cards from any roadmap or your own notes with AI — or open a task and press “Flashcards”."
            action={<Button variant="primary" icon="sparkles" onClick={() => setModal('generate')}>Make cards with AI</Button>} />
        </Card>
      ) : view === 'decks' ? (
        <div className="stack-sm">
          {s.due > 0 && (
            <Card>
              <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
                <div className="grow"><strong style={{ fontSize: 17 }}>{s.due} card{s.due === 1 ? '' : 's'} to review</strong><div className="small muted">About {Math.max(1, Math.round(s.due * 0.2))} minute{s.due > 5 ? 's' : ''}.</div></div>
                <Button variant="primary" size="lg" icon="play" onClick={() => setDeck(null)}>Review all</Button>
              </div>
            </Card>
          )}
          <Card pad={false} title="Decks">
            <div className="list">
              {s.decks.map((d) => (
                <div key={d.roadmap_id || 'none'} className="list-row">
                  <div className="list-icon"><Icon name={d.roadmap_id ? 'map' : 'note'} size={15} /></div>
                  <div className="grow" style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 500 }}>{d.title}</div><div className="tiny subtle">{d.total} cards</div></div>
                  {d.due > 0 ? <Badge tone="accent">{d.due} due</Badge> : <Badge tone="success">Done</Badge>}
                  <Button size="sm" disabled={!d.due} onClick={() => setDeck(d.roadmap_id ? String(d.roadmap_id) : 'none')}>Review</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card pad={false} title="All cards" actions={
          <Select value={browseDeck} onChange={(e) => setBrowseDeck(e.target.value)} aria-label="Deck" style={{ width: 220, height: 34 }}>
            <option value="">All decks</option>
            {s.decks.map((d) => <option key={d.roadmap_id || 'none'} value={d.roadmap_id || 'none'}>{d.title}</option>)}
          </Select>}>
          {!cards ? <SkeletonRows rows={4} /> : (
            <div className="list">
              {cards.map((c) => (
                <div key={c.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{c.front}</div>
                    <div className="small muted">{c.back}</div>
                    <div className="tiny subtle mt-1">{c.reps ? `Next in ${Math.max(1, Math.round(c.interval_days))} day${Math.round(c.interval_days) === 1 ? '' : 's'}` : 'New'}</div>
                  </div>
                  <Button variant="ghost" size="sm" icon="edit" aria-label="Edit card" onClick={() => { setForm({ ...form, front: c.front, back: c.back }); setModal({ edit: c }); }} />
                  <Button variant="ghost" size="sm" icon="trash" aria-label="Delete card" onClick={() => remove(c)} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal open={!!modal} onClose={close}
        title={modal === 'generate' ? 'Make flashcards with AI' : modal === 'add' ? 'Add a card' : 'Edit card'}
        description={modal === 'generate' ? 'The AI writes question-and-answer cards for the most important ideas.' : undefined}
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" loading={saving} disabled={!canSubmit} onClick={submit}>{modal === 'generate' ? 'Make cards' : 'Save'}</Button></>}>
        {modal === 'generate' ? (
          <div className="stack-sm">
            <Segmented value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={[{ value: 'roadmap', label: 'From a roadmap' }, { value: 'notes', label: 'From my notes' }]} />
            {form.source === 'roadmap' ? (
              <Field label="Roadmap">
                <Select value={form.roadmap_id} onChange={set('roadmap_id')} aria-label="Roadmap for cards">
                  <option value="">Choose…</option>
                  {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </Select>
              </Field>
            ) : (
              <>
                <Field label="Topic" optional><Input value={form.topic} onChange={set('topic')} placeholder="e.g. Cell biology" /></Field>
                <Field label="Paste your notes" hint="Lecture notes, a textbook section, an article…"><Textarea rows={7} value={form.text} onChange={set('text')} /></Field>
              </>
            )}
          </div>
        ) : (
          <div className="stack-sm">
            <Field label="Front (question)"><Textarea rows={2} value={form.front} onChange={set('front')} autoFocus /></Field>
            <Field label="Back (answer)"><Textarea rows={3} value={form.back} onChange={set('back')} /></Field>
            {modal === 'add' && (
              <Field label="Deck" optional>
                <Select value={form.roadmap_id} onChange={set('roadmap_id')} aria-label="Deck">
                  <option value="">My own cards</option>
                  {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
