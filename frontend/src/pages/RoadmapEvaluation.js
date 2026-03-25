import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

export default function RoadmapEvaluation() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roadmapId = params.get('roadmapId');
  const roadmapTitle = params.get('title') || 'Roadmap';
  const modulesParam = params.get('modules') || '';
  const modules = modulesParam.split('|').filter(Boolean);
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.post(
      'http://localhost:5000/api/evaluation/roadmap-quiz',
      { roadmapTitle, modules },
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
      'http://localhost:5000/api/evaluation/roadmap-result',
      {
        roadmap_id: roadmapId,
        roadmap_title: roadmapTitle,
        score,
        total: questions.length,
      },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setResult({ ...res.data, score, total: questions.length });
        setSubmitted(true);
        if (res.data.passed && res.data.certificate) {
          setTimeout(() => {
            navigate('/certificates', {
              state: { certificate: res.data.certificate },
            });
          }, 3000);
        }
      })
      .catch(() => {});
  }

  const answered = Object.keys(answers).length;
  const percent = result ? Math.round((result.score / result.total) * 100) : 0;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>
          Generating final evaluation...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: "'Segoe UI', sans-serif",
      color: '#e2e8f0',
    }}>

      {/* TOP NAV */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        borderBottom: '1px solid #475569',
        padding: '16px 28px',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f1f5f9' }}>
          🎓 Final Course Evaluation
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
          {roadmapTitle} — Pass with 70% to earn your certificate
        </p>
      </div>

      <div style={{ maxWidth: '700px', margin: '32px auto', padding: '0 24px' }}>

        {!submitted ? (
          <div>
            {/* PROGRESS */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Question {current + 1} of {questions.length}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                  {answered}/{questions.length} answered
                </span>
              </div>
              <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '6px',
                  width: ((current + 1) / questions.length * 100) + '%',
                  background: 'linear-gradient(90deg, #b8860b, #d4a017)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}></div>
              </div>
            </div>

            {/* QUESTION CARD */}
            {questions.length > 0 && (
              <div style={{
                background: '#1e293b',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid #334155',
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  color: '#b8860b',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Final Evaluation — Question {current + 1}
                </p>
                <h3 style={{
                  margin: '0 0 24px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#f1f5f9',
                  lineHeight: '1.5',
                }}>
                  {questions[current].question}
                </h3>

                {/* OPTIONS */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '24px',
                }}>
                  {questions[current].options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => selectAnswer(current, oi)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 18px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        background: answers[current] === oi
                          ? 'rgba(184,134,11,0.2)'
                          : '#0f172a',
                        border: answers[current] === oi
                          ? '2px solid #b8860b'
                          : '2px solid #334155',
                        color: answers[current] === oi ? '#fde68a' : '#e2e8f0',
                      }}
                    >
                      <span style={{
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
                      }}>
                        {['A', 'B', 'C', 'D'][oi]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>

                {/* NAV BUTTONS */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <button
                    onClick={() => setCurrent((p) => Math.max(0, p - 1))}
                    disabled={current === 0}
                    style={{
                      background: 'transparent',
                      border: '1px solid #334155',
                      color: '#94a3b8',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: current === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ← Previous
                  </button>

                  {current < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrent((p) => p + 1)}
                      style={{
                        background: 'linear-gradient(135deg, #b8860b, #d4a017)',
                        border: 'none',
                        color: '#fff',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={submitEvaluation}
                      disabled={answered < questions.length}
                      style={{
                        background: answered < questions.length
                          ? '#334155'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: answered < questions.length ? '#64748b' : '#fff',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        cursor: answered < questions.length ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                      }}
                    >
                      {answered < questions.length
                        ? `Answer all (${answered}/${questions.length})`
                        : '🎓 Submit Final Evaluation'}
                    </button>
                  )}
                </div>

                {/* QUESTION DOTS */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '20px',
                  justifyContent: 'center',
                }}>
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#e2e8f0',
                        background: answers[i] !== undefined
                          ? '#b8860b'
                          : i === current ? '#334155' : '#1e293b',
                        border: i === current
                          ? '2px solid #b8860b'
                          : '2px solid #334155',
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
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '40px 32px',
            border: '1px solid #334155',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>
              {result.passed ? '🎓' : '😔'}
            </div>

            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '800',
              color: result.passed ? '#10b981' : '#ef4444',
            }}>
              {result.passed
                ? 'Congratulations! Course Completed!'
                : 'Evaluation Failed'}
            </h2>

            <p style={{ margin: '0 0 24px 0', color: '#94a3b8', fontSize: '15px' }}>
              {result.passed
                ? '🎉 You passed! Your certificate is being generated...'
                : 'You need 70% to pass. Review the roadmap and try again.'}
            </p>

            {/* SCORE CIRCLE */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: result.passed
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: result.passed
                ? '0 0 30px rgba(16,185,129,0.4)'
                : '0 0 30px rgba(239,68,68,0.4)',
              flexDirection: 'column',
              marginBottom: '24px',
            }}>
              <span style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>
                {percent}%
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                {result.score}/{result.total}
              </span>
            </div>

            {result.passed && (
              <div style={{
                background: 'rgba(184,134,11,0.1)',
                border: '1px solid rgba(184,134,11,0.3)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ margin: 0, color: '#fde68a', fontSize: '14px' }}>
                  🏆 Redirecting to your certificate in 3 seconds...
                </p>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {!result.passed && (
                <button
                  onClick={() => navigate('/roadmap/' + roadmapId)}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  
                  }}
                >
                  📚 Review Roadmap
                </button>
              )}

              {result.passed && (
                <button
                  onClick={() => navigate('/certificates', {
                    state: { certificate: result.certificate }
                  })}
                  style={{
                    background: 'linear-gradient(135deg, #b8860b, #d4a017)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                  }}
                >
                  🏆 View My Certificate
                </button>
              )}

              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'transparent',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
