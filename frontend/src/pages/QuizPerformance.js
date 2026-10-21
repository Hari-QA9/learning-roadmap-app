import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, Stat, EmptyState, Loading, Icon, Badge, Ring, Segmented, timeAgo } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D'];

function QuizPerformance() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get('/quiz/my-performance')
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errorMessage(e, 'Could not load performance')))
      .finally(() => setLoading(false));
  }, [toast]);

  const overall = data?.overall || { totalAttempts: 0, totalCorrect: 0, accuracy: 0, uniqueQuestions: 0 };
  const history = useMemo(() => {
    const h = data?.quizHistory || [];
    if (filter === 'correct') return h.filter((x) => x.is_correct);
    if (filter === 'wrong') return h.filter((x) => !x.is_correct);
    return h;
  }, [data, filter]);

  if (loading) return <Loading label="Loading your performance…" />;

  return (
    <>
      <PageHeader
        title="Quiz performance"
        description="How you’re doing across every practice question you’ve answered."
        actions={<Button variant="primary" icon="sparkles" onClick={() => navigate('/quiz')}>Take a quiz</Button>}
      />

      {overall.totalAttempts === 0 ? (
        <Card>
          <EmptyState icon="chart" title="No answers yet" description="Take a practice quiz and your accuracy and history will show up here." action={<Button variant="primary" onClick={() => navigate('/quiz')}>Start a quiz</Button>} />
        </Card>
      ) : (
        <>
          <div className="split mb-3">
            <div className="grid-3">
              <Stat label="Correct answers" icon="checkCircle" value={overall.totalCorrect} />
              <Stat label="Questions answered" icon="quiz" value={overall.totalAttempts} />
              <Stat label="Unique questions" icon="layers" value={overall.uniqueQuestions} />
            </div>
            <div className="card card-pad row" style={{ gap: 20 }}>
              <Ring value={overall.accuracy} size={88} tone={overall.accuracy >= 70 ? 'success' : overall.accuracy >= 50 ? 'warning' : 'danger'} />
              <div>
                <div className="tiny subtle">Overall accuracy</div>
                <div style={{ fontWeight: 500 }}>{overall.accuracy >= 80 ? 'Excellent' : overall.accuracy >= 60 ? 'Good progress' : 'Keep practising'}</div>
              </div>
            </div>
          </div>

          {data?.suggestions?.length > 0 && (
            <Card title="Suggestions" className="mb-3">
              <ul className="stack-sm" style={{ listStyle: 'none' }}>
                {data.suggestions.map((s, i) => (
                  <li key={i} className="row small" style={{ alignItems: 'flex-start', color: 'var(--text)' }}>
                    <Icon name="arrowRight" size={14} className="text-accent" style={{ marginTop: 3 }} /> {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title="History"
            pad={false}
            actions={<Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'correct', label: 'Correct' }, { value: 'wrong', label: 'Missed' }]} />}
          >
            {history.length === 0 ? (
              <EmptyState icon="search" title="Nothing here" description="No answers match this filter." />
            ) : (
              <div className="list">
                {history.map((h, i) => {
                  const isOpen = open === i;
                  return (
                    <div key={i}>
                      <div className="list-row clickable" onClick={() => setOpen(isOpen ? null : i)}>
                        <Icon name={h.is_correct ? 'checkCircle' : 'xCircle'} size={17} className={h.is_correct ? 'text-success' : 'text-danger'} />
                        <div className="grow">
                          <div className="small" style={{ color: 'var(--text)' }}>{h.question}</div>
                          <div className="tiny subtle mt-1">{timeAgo(h.answered_at)}</div>
                        </div>
                        <Badge tone={h.is_correct ? 'success' : 'danger'}>{h.is_correct ? 'Correct' : 'Missed'}</Badge>
                        <Icon name="chevronDown" size={15} style={{ color: 'var(--text-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur)' }} />
                      </div>
                      {isOpen && (
                        <div className="stack-sm fade-in" style={{ padding: '0 20px 16px 52px' }}>
                          {LETTERS.map((L) => {
                            const text = h[`option_${L.toLowerCase()}`];
                            if (!text) return null;
                            const cls = L === h.correct_answer ? 'correct' : L === h.selected_answer ? 'wrong' : '';
                            return (
                              <div key={L} className={`option ${cls}`} style={{ cursor: 'default', padding: '9px 12px' }}>
                                <span className="option-key">{L}</span><span className="small">{text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

export default QuizPerformance;
