import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AIGenerator() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('4 weeks');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [generatedData, setGeneratedData] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  function handleGenerate() {
    if (!topic.trim()) {
      setError('Please enter a topic!');
      return;
    }
    setError('');
    setLoading(true);
    setSuccess(false);
    setGeneratedData(null);

    axios.post(
      'http://localhost:5000/api/ai/generate',
      { topic: topic, duration: duration },
      { headers: { Authorization: 'Bearer ' + token } }
    ).then(function(res) {
      setLoading(false);
      setSuccess(true);
      setGeneratedData(res.data.data);
    }).catch(function(err) {
      setLoading(false);
      if (err.response && err.response.data) {
        setError('Failed: ' + err.response.data.message);
      } else {
        setError('Failed to generate roadmap. Please try again!');
      }
    });
  }

  function resetForm() {
    setSuccess(false);
    setTopic('');
    setGeneratedData(null);
    setError('');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={function() { navigate('/dashboard'); }}
          style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
          AI Roadmap Generator
        </h1>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {error !== '' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {success === false && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' }}>

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '56px' }}>🤖</div>
              <h2 style={{ margin: '12px 0 6px', color: '#1e293b', fontSize: '22px' }}>
                AI Learning Roadmap
              </h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                Enter a topic and AI will build a complete roadmap for you!
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>
                What do you want to learn?
              </p>
              <input
                type="text"
                placeholder="e.g. Python, Web Development, Machine Learning..."
                value={topic}
                onChange={function(e) { setTopic(e.target.value); }}
                onKeyPress={function(e) { if (e.key === 'Enter') { handleGenerate(); } }}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box', outline: 'none', background: '#ffffff',
    color: '#1e293b' }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>
                How long do you want to study?
              </p>
              <select
                value={duration}
                onChange={function(e) { setDuration(e.target.value); }}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box', outline: 'none',  background: '#ffffff',
    color: '#1e293b',
    cursor: 'pointer' }}>
                <option value="1 week">1 Week</option>
                <option value="2 weeks">2 Weeks</option>
                <option value="4 weeks">1 Month</option>
                <option value="8 weeks">2 Months</option>
                <option value="12 weeks">3 Months</option>
                <option value="6 months">6 Months</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ width: '100%', padding: '15px', background: loading ? '#94a3b8' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Generating... Please wait' : 'Generate Roadmap with AI'}
            </button>

            {loading && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏳</div>
                <p style={{ margin: 0, color: '#64748b', fontWeight: 'bold' }}>
                  AI is building your personalized roadmap...
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  This may take 15 to 30 seconds
                </p>
              </div>
            )}

            <div style={{ marginTop: '28px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 12px', fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>
                What AI will create for you:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span>📋</span>
                  <span style={{ color: '#475569', fontSize: '14px' }}>Complete roadmap with modules and tasks</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span>✅</span>
                  <span style={{ color: '#475569', fontSize: '14px' }}>Step by step learning tasks</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span>🔗</span>
                  <span style={{ color: '#475569', fontSize: '14px' }}>Free learning resources and links</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span>⭐</span>
                  <span style={{ color: '#475569', fontSize: '14px' }}>30 XP points added to your profile</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {success === true && generatedData && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '56px' }}>🎉</div>
              <h2 style={{ margin: '12px 0 6px', color: '#22c55e', fontSize: '22px' }}>
                Roadmap Created!
              </h2>
              <p style={{ color: '#64748b', margin: 0 }}>
                Your roadmap has been saved to your dashboard!
              </p>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>
                {generatedData.title}
              </h3>
              <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px' }}>
                {generatedData.description}
              </p>
              <p style={{ margin: '0 0 4px', color: '#8b5cf6', fontSize: '13px' }}>
                Goal: {generatedData.goal}
              </p>
              <p style={{ margin: 0, color: '#06b6d4', fontSize: '13px' }}>
                Modules: {generatedData.modules ? generatedData.modules.length : 0}
              </p>
            </div>

            {generatedData.modules && generatedData.modules.map(function(mod, i) {
              return (
                <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '15px' }}>
                    Module {i + 1}: {mod.title}
                  </h4>
                  {mod.tasks && mod.tasks.map(function(task, j) {
                    return (
                      <div key={j} style={{ display: 'flex', gap: '8px', padding: '3px 0' }}>
                        <span style={{ color: '#22c55e', fontSize: '12px' }}>✓</span>
                        <span style={{ color: '#475569', fontSize: '13px' }}>{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={function() { navigate('/dashboard'); }}
                style={{ flex: 1, padding: '14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                Go to Dashboard
              </button>
              <button
                onClick={resetForm}
                style={{ flex: 1, padding: '14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                Generate Another
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default AIGenerator;
