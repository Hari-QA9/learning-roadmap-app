import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function QuizPerformance() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/quiz/my-performance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPerformance(res.data);
    } catch (err) {
      console.error('Error fetching performance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return '#22c55e';
    if (accuracy >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getAccuracyLabel = (accuracy) => {
    if (accuracy >= 80) return 'Excellent';
    if (accuracy >= 50) return 'Good';
    return 'Needs Work';
  };

  const toggleQuiz = (index) => {
    setSelectedQuiz(selectedQuiz === index ? null : index);
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: '#fff' }}>Loading performance data...</p>
        </div>
      </div>
    );
  }

  const history = performance?.quizHistory || [];
  const overall = performance?.overall || {
    totalAttempts: 0,
    totalCorrect: 0,
    accuracy: 0,
    uniqueQuestions: 0,
  };
  const suggestions = performance?.suggestions || [];
  const accuracy = overall.accuracy || 0;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <button onClick={() => navigate('/dashboard')} style={backBtn}>
          ← Back
        </button>

        <h1 style={{ color: '#fff', marginBottom: '10px' }}>Quiz Performance</h1>
        <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>
          Review your quiz history and progress.
        </p>

        <button onClick={() => navigate('/quiz')} style={primaryBtn}>
          Take New Quiz
        </button>

        {overall.totalAttempts === 0 ? (
          <div style={cardStyle}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>📝</div>
            <h2 style={{ color: '#fff' }}>No Quizzes Taken Yet</h2>
            <p style={{ color: '#cbd5e1' }}>
              Take your first quiz to see your performance here.
            </p>
            <button onClick={() => navigate('/quiz')} style={primaryBtn}>
              Take First Quiz
            </button>
          </div>
        ) : (
          <>
            <div style={statsGrid}>
              <div style={statCard(getAccuracyColor(accuracy))}>
                <div style={statValue}>{accuracy}%</div>
                <div style={statLabel}>Overall Accuracy</div>
                <div style={{ color: getAccuracyColor(accuracy), fontWeight: '700' }}>
                  {getAccuracyLabel(accuracy)}
                </div>
              </div>

              <div style={statCard('#22c55e')}>
                <div style={statValue}>{overall.totalCorrect}</div>
                <div style={statLabel}>Correct Answers</div>
              </div>

              <div style={statCard('#8b5cf6')}>
                <div style={statValue}>{overall.totalAttempts}</div>
                <div style={statLabel}>Total Attempts</div>
              </div>

              <div style={statCard('#06b6d4')}>
                <div style={statValue}>{overall.uniqueQuestions}</div>
                <div style={statLabel}>Questions Tried</div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ color: '#fff', marginTop: 0 }}>AI Improvement Suggestions</h2>
              {suggestions.map((s, i) => (
                <div key={i} style={suggestionItem}>
                  <span style={{ marginRight: '10px' }}>💡</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <h2 style={{ color: '#fff', marginTop: 0 }}>
                Quiz History ({history.length} answers)
              </h2>

              {history.length === 0 && (
                <p style={{ color: '#cbd5e1' }}>No quiz history yet.</p>
              )}

              {history.map((item, i) => {
                const isOpen = selectedQuiz === i;
                const borderColor = item.is_correct ? '#22c55e' : '#ef4444';

                return (
                  <div
                    key={i}
                    style={{
                      background: '#0f172a',
                      border: `1px solid ${borderColor}55`,
                      borderRadius: '12px',
                      marginBottom: '14px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      onClick={() => toggleQuiz(i)}
                      style={{
                        padding: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ color: '#fff', fontWeight: '700', marginBottom: '8px' }}>
                          {item.is_correct ? '✅' : '❌'} {item.question}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              color: item.is_correct ? '#22c55e' : '#ef4444',
                              fontWeight: '700',
                            }}
                          >
                            {item.is_correct ? 'Correct' : 'Wrong'}
                          </span>
                          <span style={{ color: '#94a3b8' }}>
                            {new Date(item.answered_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ color: '#cbd5e1', fontSize: '18px' }}>
                        {isOpen ? '▲' : '▼'}
                      </div>
                    </div>

                    {isOpen && (
                      <div
                        style={{
                          borderTop: '1px solid #334155',
                          padding: '16px',
                          background: '#111827',
                        }}
                      >
                        {['A', 'B', 'C', 'D'].map((opt) => {
                          const isCorrectOpt = opt === item.correct_answer;
                          const isSelectedOpt = opt === item.selected_answer;

                          let bg = '#fff';
                          let border = '#e2e8f0';
                          let color = '#111827';

                          if (isCorrectOpt) {
                            bg = '#dcfce7';
                            border = '#22c55e';
                            color = '#166534';
                          }

                          if (isSelectedOpt && !isCorrectOpt) {
                            bg = '#fee2e2';
                            border = '#ef4444';
                            color = '#991b1b';
                          }

                          return (
                            <div
                              key={opt}
                              style={{
                                background: bg,
                                border: `1px solid ${border}`,
                                color,
                                borderRadius: '10px',
                                padding: '12px',
                                marginBottom: '10px',
                                fontWeight: '600',
                              }}
                            >
                              <strong>{opt}.</strong> {item[`option_${opt.toLowerCase()}`] || 'N/A'}
                              {isCorrectOpt && (
                                <span style={{ marginLeft: '10px', fontWeight: '700' }}>
                                  (Correct)
                                </span>
                              )}
                              {isSelectedOpt && !isCorrectOpt && (
                                <span style={{ marginLeft: '10px', fontWeight: '700' }}>
                                  (Your Answer)
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {!item.is_correct && (
                          <div
                            style={{
                              marginTop: '12px',
                              color: '#fca5a5',
                              fontWeight: '700',
                            }}
                          >
                            The correct answer was: {item.correct_answer}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: '#0f172a',
  padding: '24px',
  fontFamily: 'Arial, sans-serif',
};

const containerStyle = {
  maxWidth: '1100px',
  margin: '0 auto',
};

const backBtn = {
  background: '#1e293b',
  color: '#fff',
  border: '1px solid #334155',
  padding: '10px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '20px',
};

const primaryBtn = {
  background: '#8b5cf6',
  color: '#fff',
  border: 'none',
  padding: '12px 18px',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: '700',
  marginBottom: '24px',
};

const cardStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '20px',
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '20px',
};

const statCard = (color) => ({
  background: '#1e293b',
  border: `1px solid ${color}55`,
  borderRadius: '16px',
  padding: '20px',
});

const statValue = {
  color: '#fff',
  fontSize: '32px',
  fontWeight: '800',
  marginBottom: '8px',
};

const statLabel = {
  color: '#cbd5e1',
  fontSize: '14px',
};

const suggestionItem = {
  display: 'flex',
  alignItems: 'flex-start',
  color: '#cbd5e1',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '10px',
  padding: '12px',
  marginBottom: '10px',
};

export default QuizPerformance;