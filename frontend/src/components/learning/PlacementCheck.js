import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { Modal, Button, Spinner, Badge, Alert } from '../ui';

const WEIGHT = { basic: 1, intermediate: 2, advanced: 3 };

/** Works out a level and what the learner already knows from their answers. */
export function scorePlacement(questions, answers) {
  let got = 0; let max = 0;
  const known = []; const gaps = [];
  questions.forEach((q, i) => {
    const w = WEIGHT[q.level] || 2;
    max += w;
    if (answers[i] === q.correct) { got += w; known.push(q.concept); } else gaps.push(q.concept);
  });
  const pct = max ? Math.round((got / max) * 100) : 0;
  const level = pct >= 70 ? 'advanced' : pct >= 35 ? 'intermediate' : 'beginner';
  return { pct, level, known: [...new Set(known)], gaps: [...new Set(gaps)] };
}

/** A 2-minute quiz before generating a roadmap, so the AI skips what you already know. */
export default function PlacementCheck({ topic, open, onClose, onApply }) {
  const [qs, setQs] = useState(null);
  const [error, setError] = useState('');
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (!open) return;
    setQs(null); setError(''); setI(0); setAnswers([]);
    api.post('/learning/placement', { topic }, { timeout: 90000 })
      .then((r) => setQs(r.data.questions))
      .catch((e) => setError(errorMessage(e, 'Could not create the placement check.')));
  }, [open, topic]);

  const answer = (choice) => { setAnswers((a) => { const n = [...a]; n[i] = choice; return n; }); setI((x) => x + 1); };
  const finished = qs && i >= qs.length;
  const result = finished ? scorePlacement(qs, answers) : null;
  const q = qs?.[i];

  const apply = () => {
    const parts = [`Placement check score ${result.pct}%`];
    if (result.known.length) parts.push(`already knows: ${result.known.join(', ')}`);
    if (result.gaps.length) parts.push(`needs to learn: ${result.gaps.join(', ')}`);
    onApply({ level: result.level, background: `${parts.join('; ')}.` });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Placement check: ${topic}`}
      description={finished ? 'Here’s where you are. The AI will skip what you know.' : '8 quick questions, easy to hard. Choose “I don’t know” instead of guessing — it makes your roadmap better.'}
      footer={finished ? <><Button onClick={onClose}>Close</Button><Button variant="primary" onClick={apply}>Use this for my roadmap</Button></> : <Button variant="ghost" onClick={onClose}>Cancel</Button>}>
      {error && <Alert tone="danger">{error}</Alert>}
      {!qs && !error && <div className="row" style={{ gap: 8 }}><Spinner /> Writing questions about {topic}…</div>}
      {q && (
        <div className="stack-sm fade-in" key={i}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Badge>{q.level}</Badge><span className="tiny subtle">Question {i + 1} of {qs.length}</span>
          </div>
          <div className="progress progress-sm"><span style={{ width: `${(i / qs.length) * 100}%` }} /></div>
          <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 16 }}>{q.question}</div>
          <div className="stack-sm">
            {q.options.map((o, k) => <button key={k} type="button" className="option-btn" onClick={() => answer(k)}>{o}</button>)}
            <button type="button" className="option-btn subtle" onClick={() => answer(-1)}>I don’t know</button>
          </div>
        </div>
      )}
      {result && (
        <div className="stack-sm fade-in">
          <div className="row" style={{ gap: 12 }}>
            <div className="placement-score">{result.pct}%</div>
            <div>
              <div className="small muted">Suggested level</div>
              <div style={{ fontWeight: 600, fontSize: 18, textTransform: 'capitalize', color: 'var(--text)' }}>{result.level}</div>
            </div>
          </div>
          {result.known.length > 0 && <div><div className="section-label" style={{ margin: '4px 0' }}>You already know</div><div className="row row-wrap" style={{ gap: 6 }}>{result.known.map((k) => <span key={k} className="skill have">{k}</span>)}</div></div>}
          {result.gaps.length > 0 && <div><div className="section-label" style={{ margin: '4px 0' }}>Your roadmap will focus on</div><div className="row row-wrap" style={{ gap: 6 }}>{result.gaps.map((k) => <span key={k} className="skill gap">{k}</span>)}</div></div>}
        </div>
      )}
    </Modal>
  );
}
