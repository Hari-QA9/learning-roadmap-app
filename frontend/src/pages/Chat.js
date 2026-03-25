import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Hi! I am your AI learning assistant! Ask me anything about learning, roadmaps, or any topic you want to study!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/ai/chat',
        { message: userMessage },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Sorry I could not process that. Please try again!'
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'ai',
      text: 'Hi! I am your AI learning assistant! Ask me anything about learning!'
    }]);
  };

  const quickQuestions = [
    'How do I start learning Python?',
    'Best roadmap for web development?',
    'How to learn machine learning?',
    'Tips to stay motivated while studying?'
  ];

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>AI Learning Assistant</h1>
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>● Online</span>
          </div>
        </div>
        <button
          onClick={clearChat}
          style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {/* QUICK QUESTIONS */}
      <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>QUICK QUESTIONS:</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => setInput(q)}
              style={{ padding: '6px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', color: '#3b82f6' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
            {msg.role === 'ai' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                🤖
              </div>
            )}
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'white',
              color: msg.role === 'user' ? 'white' : '#1e293b',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                👤
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🤖
            </div>
            <div style={{ background: 'white', padding: '12px 20px', borderRadius: '16px 16px 16px 4px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: '20px', letterSpacing: '4px', color: '#94a3b8' }}>...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: '16px 24px', background: 'white', boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything about learning... (Enter to send)"
          rows={2}
          disabled={loading}
          style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'Segoe UI, sans-serif' }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ padding: '12px 20px', background: loading || !input.trim() ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: '18px', height: '48px' }}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default Chat;
