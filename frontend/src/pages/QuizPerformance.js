import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function QuizPerformance() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(function() {
    fetchPerformance();
  }, []);

  function fetchPerformance() {
    axios.get('http://localhost:5000/api/quiz/my-performance', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function(res) {
      setPerformance(res.data);
      setLoading(false);
    }).catch(function(err) {
      console.log(err);
      setLoading(false);
    });
  }

  function getAccuracyColor(accuracy) {
    if (accuracy >= 80) return '#22c55e';
    if (accuracy >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function getAccuracyLabel(accuracy) {
    if (accuracy >= 80) return 'Excellent';
    if (accuracy >= 50) return 'Good';
    return 'Needs Work';
  }

  function toggleQuiz(index) {
    if (selectedQuiz === index) {
      setSelectedQuiz(null);
    } else {
      setSelectedQuiz(index);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Segoe UI, sans-serif', color: '#64748b' }}>
        Loading performance data...
      </div>
    );
  }

  var history = performance ? performance.quizHistory || [] : [];
  var overall = performance ? performance.overall : null;
  var suggestions = performance ? performance.suggestions || [] : [];
  var accuracy = overall ? overall.accuracy : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={function() { navigate('/dashboard'); }}
          style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', flex: 1 }}>
          Quiz Performance
        </h1>
        <button
          onClick={function() { navigate('/quiz'); }}
          style={{ padding: '8px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Take New Quiz
        </button>
      </div>

      {!overall || overall.totalAttempts === 0 ? (
        <div style={{ background: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>📝</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>No Quizzes Taken Yet</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Take your first quiz to see your performance here!
          </p>
          <button
            onClick={function() { navigate('/quiz'); }}
            style={{ padding: '12px 32px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            Take First Quiz
          </button>
        </div>
      ) : (
        <div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: '4px solid ' + getAccuracyColor(accuracy) }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: getAccuracyColor(accuracy) }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Overall Accuracy</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: getAccuracyColor(accuracy), marginTop: '4px' }}>
                {getAccuracyLabel(accuracy)}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: '4px solid #22c55e' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>
                {overall.totalCorrect}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Correct Answers</div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                {overall.totalAttempts}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Total Attempts</div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
                {overall.uniqueQuestions}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Questions Tried</div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', borderRadius: '16px', padding: '24px', marginBottom: '24px', color: 'white' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
              AI Improvement Suggestions
            </h3>
            {suggestions.map(function(s, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                  <span style={{ fontSize: '14px', opacity: 0.95, lineHeight: '1.5' }}>{s}</span>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>
              Quiz History ({history.length} answers)
            </h3>

            {history.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                No quiz history yet.
              </p>
            )}

            {history.map(function(item, i) {
              var isOpen = selectedQuiz === i;
              var borderColor = item.is_correct ? '#22c55e' : '#ef4444';
              return (
                <div key={i} style={{ marginBottom: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid ' + borderColor, overflow: 'hidden' }}>
                  <div
                    onClick={function() { toggleQuiz(i); }}
                    style={{ padding: '14px 16px', cursor: 'pointer', background: isOpen ? '#f8fafc' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ fontSize: '18px' }}>{item.is_correct ? '✅' : '❌'}</span>
                      <span style={{ fontSize: '14px', color: '#1e293b', flex: 1, lineHeight: '1.4' }}>
                        {item.question}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ background: item.is_correct ? '#f0fdf4' : '#fef2f2', color: item.is_correct ? '#22c55e' : '#ef4444', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        {item.is_correct ? 'Correct' : 'Wrong'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(item.answered_at).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        {['A', 'B', 'C', 'D'].map(function(opt) {
                          var isCorrectOpt = opt === item.correct_answer;
                          var isSelectedOpt = opt === item.selected_answer;
                          var bg = 'white';
                          var borderCol = '#e2e8f0';
                          var textColor = '#1e293b';
                          if (isCorrectOpt) {
                            bg = '#f0fdf4';
                            borderCol = '#22c55e';
                            textColor = '#15803d';
                          }
                          if (isSelectedOpt && !isCorrectOpt) {
                            bg = '#fef2f2';
                            borderCol = '#ef4444';
                            textColor = '#dc2626';
                          }
                          return (
                            <div key={opt} style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid ' + borderCol, background: bg, color: textColor, fontSize: '13px' }}>
                              <strong>{opt}.</strong> {item['option_' + opt.toLowerCase()] || 'N/A'}
                              {isCorrectOpt && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                                  (Correct)
                                </span>
                              )}
                              {isSelectedOpt && !isCorrectOpt && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                                  (Your Answer)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!item.is_correct && (
                        <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#1d4ed8' }}>
                          The correct answer was: <strong>{item.correct_answer}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizPerformance;
