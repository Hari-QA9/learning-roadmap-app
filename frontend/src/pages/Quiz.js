import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import QuizRunner from '../components/QuizRunner';
import { PageHeader, Button, Card, Field, Input, Alert, Segmented, Spinner, Icon } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D'];
const TOPICS = ['JavaScript closures', 'SQL joins', 'REST APIs', 'Python lists & dicts', 'Software testing basics', 'Git branching'];

function toRunner(q) {
  const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter((o) => o !== undefined && o !== null && o !== '');
  return { ...q, options, correct: Math.max(0, LETTERS.indexOf(q.correct_answer)) };
}

function Quiz() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get('topic') || decodeURIComponent(params.get('title') || ''));
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState('5');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const generate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) { setError('Enter a topic to be quizzed on.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post('/quiz/generate', { topic: topic.trim(), difficulty, count: Number(count) });
      const qs = (r.data.questions || []).map(toRunner).filter((q) => q.options.length >= 2);
      if (!qs.length) throw new Error('No questions');
      setQuestions(qs);
    } catch (err) {
      setError(errorMessage(err, 'Could not generate a quiz. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (answers, score) => {
    setSubmitting(true);
    try {
      await Promise.all(questions.map((q, i) => (q.id
        ? api.post('/quiz/submit', { quiz_id: q.id, selected_answer: LETTERS[answers[i]], correct_answer: q.correct_answer })
        : Promise.resolve())));
    } catch (err) {
      toast.error('Your score is shown, but it could not be saved to your history.');
    }
    setResult({ answers, score });
    setSubmitting(false);
  };

  const restart = () => { setQuestions([]); setResult(null); };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        title="Practice quiz"
        description="Generate a short quiz on any topic to check what you’ve learned. Results are saved to your performance history."
        actions={<Button variant="ghost" icon="chart" onClick={() => navigate('/quiz-performance')}>My performance</Button>}
      />

      {questions.length === 0 ? (
        <Card>
          <form onSubmit={generate}>
            {error && <div className="mb-2"><Alert tone="danger" onClose={() => setError('')}>{error}</Alert></div>}
            <Field label="Topic">
              <Input autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Java OOP concepts" disabled={loading} style={{ height: 44, fontSize: 15 }} />
            </Field>
            <div className="row row-wrap mt-2" style={{ gap: 6 }}>
              {TOPICS.map((t) => <button key={t} type="button" className="badge" style={{ cursor: 'pointer', height: 26 }} onClick={() => setTopic(t)} disabled={loading}>{t}</button>)}
            </div>
            <div className="form-grid mt-3">
              <Field label="Difficulty">
                <Segmented value={difficulty} onChange={(v) => !loading && setDifficulty(v)} options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
              </Field>
              <Field label="Questions">
                <Segmented value={count} onChange={(v) => !loading && setCount(v)} options={['5', '8', '10']} />
              </Field>
            </div>
            <hr />
            <div className="row-between">
              {loading ? <span className="row small muted"><Spinner size={14} /> Writing your questions…</span> : <span className="small subtle"><Icon name="info" size={13} style={{ verticalAlign: '-2px' }} /> Takes about 10 seconds.</span>}
              <Button type="submit" variant="primary" icon="sparkles" loading={loading} disabled={!topic.trim()}>Start quiz</Button>
            </div>
          </form>
        </Card>
      ) : result ? (
        <QuizRunner
          questions={questions}
          review
          reviewAnswers={result.answers}
          passMark={60}
          resultSlot={
            <div className="row row-wrap">
              <Button variant="primary" icon="refresh" onClick={generate} loading={loading}>New questions, same topic</Button>
              <Button onClick={restart}>Change topic</Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="row-between mb-2">
            <span className="small muted">Topic: <strong>{topic}</strong></span>
            <Button variant="ghost" size="sm" onClick={restart}>Cancel</Button>
          </div>
          <QuizRunner questions={questions} onSubmit={submit} submitting={submitting} />
        </>
      )}
    </div>
  );
}

export default Quiz;
