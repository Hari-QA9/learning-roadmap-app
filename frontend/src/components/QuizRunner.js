import React, { useEffect, useState } from 'react';
import { Button, Icon, Progress, Ring } from './ui';

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * One-question-at-a-time quiz.
 * questions: [{ question, options: [..], correct: index }]
 * onSubmit(answers, score) is called when the user submits.
 * With `review` + `reviewAnswers`, shows the score and correct/incorrect answers.
 */
export default function QuizRunner({ questions, onSubmit, submitting, review, reviewAnswers, passMark = 70, resultSlot }) {
  const [current, setCurrent] = useState(0);
  const [own, setAnswers] = useState({});
  const answers = review && reviewAnswers ? reviewAnswers : own;

  useEffect(() => { setCurrent(0); setAnswers({}); }, [questions]);

  // Keyboard: 1-4 / A-D to choose, arrows to move.
  useEffect(() => {
    if (review) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const k = e.key.toUpperCase();
      const idx = '1234'.includes(k) ? Number(k) - 1 : KEYS.indexOf(k);
      const q = questions[current];
      if (q && idx >= 0 && idx < q.options.length) setAnswers((a) => ({ ...a, [current]: idx }));
      if (e.key === 'ArrowRight' && current < questions.length - 1) setCurrent((c) => c + 1);
      if (e.key === 'ArrowLeft' && current > 0) setCurrent((c) => c - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, questions, review]);

  if (!questions?.length) return null;

  const answered = Object.keys(answers).length;
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);
  const pct = Math.round((score / questions.length) * 100);

  if (review) {
    return (
      <div className="stack-lg fade-in">
        <div className="card card-pad row row-wrap" style={{ gap: 24 }}>
          <Ring value={pct} size={96} tone={pct >= passMark ? 'success' : 'danger'} />
          <div className="grow">
            <h2 style={{ fontSize: 20 }}>{pct >= passMark ? 'Passed' : 'Not quite there yet'}</h2>
            <p className="mt-1">You answered {score} of {questions.length} correctly. {pct >= passMark ? 'Nice work.' : `You need ${passMark}% to pass — review the answers below and try again.`}</p>
            {resultSlot && <div className="mt-2">{resultSlot}</div>}
          </div>
        </div>
        <div className="stack">
          {questions.map((q, i) => (
            <div key={i} className="card card-pad">
              <div className="row mb-2" style={{ alignItems: 'flex-start' }}>
                <Icon name={answers[i] === q.correct ? 'checkCircle' : 'xCircle'} size={18} className={answers[i] === q.correct ? 'text-success' : 'text-danger'} style={{ marginTop: 1 }} />
                <h3 className="grow" style={{ fontWeight: 500 }}>{q.question}</h3>
              </div>
              <div className="stack-sm">
                {q.options.map((o, j) => (
                  <div key={j} className={`option ${j === q.correct ? 'correct' : answers[i] === j ? 'wrong' : ''}`} style={{ cursor: 'default' }}>
                    <span className="option-key">{KEYS[j]}</span>{o}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="card fade-in" key={current}>
      <div style={{ padding: '18px 22px 0' }}>
        <div className="row-between small muted mb-1">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{answered} answered</span>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} size="sm" />
      </div>
      <div style={{ padding: '24px 22px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.45 }}>{q.question}</h2>
        <div className="stack-sm mt-3">
          {q.options.map((o, j) => (
            <button key={j} className={`option ${answers[current] === j ? 'selected' : ''}`} onClick={() => setAnswers((a) => ({ ...a, [current]: j }))}>
              <span className="option-key">{KEYS[j]}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card-foot" style={{ justifyContent: 'space-between' }}>
        <Button variant="ghost" icon="arrowLeft" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Previous</Button>
        <div className="row" style={{ gap: 4 }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to question ${i + 1}`}
              style={{
                width: 8, height: 8, borderRadius: 8, border: 0, padding: 0, cursor: 'pointer',
                background: i === current ? 'var(--text)' : answers[i] !== undefined ? 'var(--accent)' : 'var(--surface-3)',
              }}
            />
          ))}
        </div>
        {current < questions.length - 1 ? (
          <Button variant="secondary" iconRight="arrowRight" onClick={() => setCurrent((c) => c + 1)}>Next</Button>
        ) : (
          <Button variant="primary" loading={submitting} disabled={answered < questions.length} onClick={() => onSubmit(answers, score)}>
            {answered < questions.length ? `Answer all (${answered}/${questions.length})` : 'Submit'}
          </Button>
        )}
      </div>
    </div>
  );
}
