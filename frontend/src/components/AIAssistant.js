import React, { useState } from 'react';
import axios from 'axios';

function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I am your AI Study Assistant. Ask me anything about learning, programming, or your roadmap!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    var userMessage = { role: 'user', content: input };
    setMessages(function(prev) { return prev.concat(userMessage); });
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(
        'http://localhost:5000/api/ai/chat',
        { message: input },
        { headers }
      );

      var aiMessage = { role: 'assistant', content: res.data.reply };
      setMessages(function(prev) { return prev.concat(aiMessage); });
    } catch (err) {
      console.error('AI error:', err);
      var errorMessage = {
        role: 'assistant',
        content: 'Sorry, I could not process that. Please check your API key or try again.'
      };
      setMessages(function(prev) { return prev.concat(errorMessage); });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Floating Button */}
      <button
        onClick={function() { setIsOpen(!isOpen); }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(102,126,234,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '380px',
          height: '500px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden'
        }}>

          {/* Chat Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            padding: '16px 20px',
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>🤖 AI Study Assistant</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.8 }}>
              Ask me anything about learning!
            </p>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map(function(msg, idx) {
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' ? '#667eea' : '#f3f4f6',
                    color: msg.role === 'user' ? 'white' : '#1f2937',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  background: '#f3f4f6',
                  borderRadius: '12px 12px 12px 4px',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={sendMessage}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={function(e) { setInput(e.target.value); }}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
