import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ModuleEvaluation() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const moduleId = params.get('moduleId');
  const roadmapId = params.get('roadmapId');
  const moduleTitle = params.get('title') || 'Module';
  const tasksParam = params.get('tasks') || '';
  const tasks = tasksParam.split('|').filter(Boolean);

  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.post(
      'http://localhost:5000/api/evaluation/module-quiz',
      { moduleTitle, tasks },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setQuestions(res.data.questions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function selectAnswer(qIndex, optIndex) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  }

  function submitEvaluation() {
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) score++;
    });

    axios.post(
      'http://localhost:5000/api/evaluation/module-result',
      { module_id: moduleId, roadmap_id: roadmapId, score, total: questions.length },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setResult({ ...res.data, score, total: questions.length });
        setSubmitted(true);
      })
      .catch(() => {});
  }

  const answered = Object.keys(answers).length;
  const percent = result ? Math.round((result.score / result.total) * 100) : 0;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <p style={{ color: '#94a3b8', fontSize: '18px' }}>
            Generating evaluation questions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topNav}>
        <h2 style={styles.navTitle}>📝 Module Evaluation</h2>
        <p style={styles.navSub}>{moduleTitle}</p>
      </div>

      <div style={styles.container}>
        {!submitted ? (
          <div>
            <div style={styles.progressBar}>
              <div style={styles.progressInfo}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Question {current + 1} of {questions.length}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                  {answered}/{questions.length} answered
                </span>
              </div>
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill,
                  width: ((current + 1) / questions.length * 100) + '%',
                }}></div>
              </div>
            </div>

            {questions.length > 0 && (
              <div style={styles.questionCard}>
                <p style={styles.questionNumber}>Question {current + 1}</p>
                <h3 style={styles.questionText}>
                  {questions[current].question}
                </h3>
                <div style={styles.options}>
                  {questions[current].options.map((opt, oi) => (
                    <button
                      key={oi}
                      style={{
                        ...styles.option,
                        background: answers[current] === oi
                          ? 'rgba(99,102,241,0.2)'
                          : '#0f172a',
                        border: answers[current] === oi
                          ? '2px solid #6366f1'
                          : '2px solid #334155',
                        color: answers[current] === oi ? '#a5b4fc' : '#e2e8f0',
                      }}
                      onClick={() => selectAnswer(current, oi)}
                    >
                      <span style={styles.optionLetter}>
                        {['A', 'B', 'C', 'D'][oi]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>

                <div style={styles.navButtons}>
                  <button
                    style={styles.prevBtn}
                    onClick={() => setCurrent((p) => Math.max(0, p - 1))}
                    disabled={current === 0}
                  >
                    ← Previous
                  </button>

                  {current < questions.length - 1 ? (
                    <button
                      style={styles.nextBtn}
                      onClick={() => setCurrent((p) => p + 1)}
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      style={answered < questions.length ? styles.disabledBtn : styles.submitBtn}
                      onClick={submitEvaluation}
                      disabled={answered < questions.length}
                    >
                                            {answered < questions.length
                        ? `Answer all questions (${answered}/${questions.length})`
                        : 'Submit Evaluation'}
                    </button>
                  )}
                </div>

                {/* QUESTION DOTS */}
                <div style={styles.dots}>
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      style={{
                        ...styles.dot,
                        background: answers[i] !== undefined
                          ? '#6366f1'
                          : i === current
                          ? '#334155'
                          : '#1e293b',
                        border: i === current ? '2px solid #6366f1' : '2px solid #334155',
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RESULT SCREEN */
          <div style={styles.resultCard}>
            <div style={{
              fontSize: '72px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {result.passed ? '🎉' : '😔'}
            </div>

            <h2 style={{
              textAlign: 'center',
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '800',
              color: result.passed ? '#10b981' : '#ef4444',
            }}>
              {result.passed ? 'Module Passed!' : 'Module Failed'}
            </h2>

            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
              {result.passed
                ? 'Great job! You can proceed to the next module.'
                : 'You need 70% to pass. Review the module and try again.'}
            </p>

            {/* SCORE CIRCLE */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: result.passed
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: result.passed
                  ? '0 0 30px rgba(16,185,129,0.4)'
                  : '0 0 30px rgba(239,68,68,0.4)',
              }}>
                <span style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>
                  {percent}%
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  {result.score}/{result.total}
                </span>
              </div>
            </div>

            {/* ANSWER REVIEW */}
            <div style={styles.reviewSection}>
              <h4 style={{ margin: '0 0 14px 0', color: '#f1f5f9', fontSize: '15px' }}>
                Answer Review
              </h4>
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.correct;
                return (
                  <div key={i} style={{
                    background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: '1px solid ' + (isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'),
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '10px',
                  }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>
                      {isCorrect ? '✅' : '❌'} Q{i + 1}: {q.question}
                    </p>
                    <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#94a3b8' }}>
                      Your answer: {q.options[answers[i]] || 'Not answered'}
                    </p>
                    {!isCorrect && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#10b981' }}>
                        Correct answer: {q.options[q.correct]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {!result.passed && (
                <button
                  style={styles.retryBtn}
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers({});
                    setResult(null);
                    setCurrent(0);
                    setLoading(true);
                    axios.post(
                      'http://localhost:5000/api/evaluation/module-quiz',
                      { moduleTitle, tasks },
                      { headers: { Authorization: 'Bearer ' + token } }
                    ).then((res) => {
                      setQuestions(res.data.questions || []);
                      setLoading(false);
                    }).catch(() => setLoading(false));
                  }}
                >
                  🔄 Retry Evaluation
                </button>
              )}
              <button
                style={styles.backRoadmapBtn}
                onClick={() => navigate('/roadmap/' + roadmapId)}
              >
                ← Back to Roadmap
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#e2e8f0',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  topNav: {
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '16px 28px',
    textAlign: 'center',
  },
  navTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  navSub: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#64748b',
  },
  container: {
    maxWidth: '700px',
    margin: '32px auto',
    padding: '0 24px',
  },
  progressBar: {
    marginBottom: '24px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  progressTrack: {
    height: '6px',
    background: '#1e293b',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '6px',
    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  questionCard: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #334155',
  },
  questionNumber: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#6366f1',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  questionText: {
    margin: '0 0 24px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: '1.5',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  optionLetter: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
    color: '#94a3b8',
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  prevBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  disabledBtn: {
    background: '#334155',
    border: 'none',
    color: '#64748b',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
  },
  dots: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '20px',
    justifyContent: 'center',
  },
  dot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  resultCard: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #334155',
  },
  reviewSection: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #334155',
  },
  retryBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    border: 'none',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  backRoadmapBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

