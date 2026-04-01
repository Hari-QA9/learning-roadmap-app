import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, useParams } from 'react-router-dom'; // ✅ Fix 1: added useParams

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { moduleId } = useParams(); // ✅ Fix 2: now works because useParams is imported
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(location.search);
  const roadmapId = params.get('roadmap') || null;
  const roadmapTitle = decodeURIComponent(params.get('title') || '');

  const [topic, setTopic] = useState(roadmapTitle || '');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const quizMode = moduleId ? 'module' : 'general';

  function generateQuiz() {
    if (!topic.trim()) {
      alert('Please enter a topic!');
      return;
    }
    setLoading(true);
    axios.post(
      'http://localhost:5000/api/quiz/generate',
      { roadmap_id: roadmapId, topic: topic },
      { headers: { Authorization: 'Bearer ' + token } }
    ).then(function(res) {
      setQuestions(res.data.questions);
      setStarted(true);
      setAnswers({});
      setResults(null);
      setLoading(false);
    }).catch(function(err) {
      alert('Failed to generate quiz. Please try again!');
      console.log(err);
      setLoading(false);
    });
  }

  function handleAnswer(index, answer) {
    setAnswers(function(prev) {
      var u = Object.assign({}, prev);
      u[index] = answer;
      return u;
    });
  }

  async function submitQuiz() {
  if (Object.keys(answers).length < questions.length) {
    alert('Please answer all questions!');
    return;
  }

  let score = 0;

  const details = questions.map(function (q, i) {
    const isCorrect = answers[i] === q.correct_answer;
    if (isCorrect) score++;

    return {
      question: q.question,
      selected: answers[i],
      correct: q.correct_answer,
      isCorrect: isCorrect,
      quiz_id: q.id,
    };
  });

  try {
    await Promise.all(
      details.map(function (detail) {
        if (!detail.quiz_id) return Promise.resolve();

        return axios.post(
          'http://localhost:5000/api/quiz/submit',
          {
            quiz_id: detail.quiz_id,
            selected_answer: detail.selected,
            correct_answer: detail.correct,
          },
          {
            headers: { Authorization: 'Bearer ' + token },
          }
        );
      })
    );

    setResults({
      score: score,
      total: questions.length,
      details: details,
    });
    setStarted(false);
  } catch (err) {
    console.log('Submit error:', err);
    alert('Failed to save quiz results properly.');
  }
}

  function retakeQuiz() {
    setResults(null);
    setStarted(false);
    setAnswers({});
    setQuestions([]);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={function() { navigate('/dashboard'); }} style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>AI Quiz Generator</h1>
      </div>

      {!started && !results && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📝</div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Generate a Quiz</h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
              AI will create 5 questions to test your knowledge!
            </p>
            {roadmapTitle !== '' && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '14px', color: '#1d4ed8' }}>
                Roadmap: {roadmapTitle}
              </div>
            )}
            <input
              type="text"
              placeholder="e.g. Python basics, React hooks..."
              value={topic}
              onChange={function(e) { setTopic(e.target.value); }}
              onKeyPress={function(e) { if (e.key === 'Enter') { generateQuiz(); } }}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none', background: '#ffffff',
  color: '#1e293b' }}
            />
            <button
              onClick={generateQuiz}
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Generating Quiz...' : 'Generate Quiz with AI'}
            </button>
          </div>
        </div>
      )}

      {started && questions.length > 0 && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Topic: {topic}</h2>
            <span style={{ background: '#3b82f6', color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '13px' }}>
              {Object.keys(answers).length}/{questions.length} answered
            </span>
          </div>
          {questions.map(function(q, i) {
            return (
              <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1e293b', lineHeight: '1.5' }}>
                  Q{i + 1}. {q.question}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['A', 'B', 'C', 'D'].map(function(opt) {
                    var isSelected = answers[i] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={function() { handleAnswer(i, opt); }}
                        style={{ padding: '12px 16px', border: '2px solid ' + (isSelected ? '#3b82f6' : '#e2e8f0'), borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', background: isSelected ? '#3b82f6' : 'white', color: isSelected ? 'white' : '#1e293b', lineHeight: '1.4' }}>
                        <strong>{opt}.</strong> {q['option_' + opt.toLowerCase()]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button
            onClick={submitQuiz}
            style={{ width: '100%', padding: '14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            Submit Quiz
          </button>
        </div>
      )}

      {results && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'white', flexDirection: 'column' }}>
              <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{results.score}</span>
              <span style={{ fontSize: '14px' }}>/{results.total}</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', color: '#1e293b' }}>
              {results.score === results.total ? 'Perfect Score!' :
               results.score >= Math.floor(results.total * 0.8) ? 'Excellent!' :
               results.score >= Math.floor(results.total * 0.6) ? 'Good Job!' : 'Keep Studying!'}
            </h2>
            <p style={{ color: '#64748b', margin: 0 }}>
              You got {results.score} out of {results.total} correct
            </p>
          </div>

          <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '16px' }}>Answer Review</h3>

          {results.details.map(function(detail, i) {
            return (
              <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px', borderLeft: '4px solid ' + (detail.isCorrect ? '#22c55e' : '#ef4444'), boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#1e293b', flex: 1 }}>Q{i + 1}. {detail.question}</span>
                  <span style={{ background: detail.isCorrect ? '#22c55e' : '#ef4444', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {detail.isCorrect ? 'Correct' : 'Wrong'}
                  </span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
                  Your answer: <strong style={{ color: detail.isCorrect ? '#22c55e' : '#ef4444' }}>{detail.selected}</strong>
                </p>
                {!detail.isCorrect && (
                  <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
                    Correct answer: <strong style={{ color: '#22c55e' }}>{detail.correct}</strong>
                  </p>
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', marginBottom: '40px' }}>
            <button
              onClick={retakeQuiz}
              style={{ flex: 1, padding: '14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
              Take Another Quiz
            </button>
            <button
              onClick={function() { navigate('/dashboard'); }}
              style={{ flex: 1, padding: '14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Quiz;