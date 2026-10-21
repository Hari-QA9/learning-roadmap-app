import React, { useEffect, useRef, useState } from 'react';
import api, { errorMessage, getUser } from '../lib/api';
import { PageHeader, Button, Icon, Avatar, Prose, Textarea } from '../components/ui';

const STORE_KEY = 'learnmap.chat';
const QUICK = [
  'How should I start learning Python?',
  'Explain REST vs GraphQL simply',
  'Give me a 4-week plan to learn SQL',
  'What’s the difference between unit and integration tests?',
];

function loadHistory() {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}

function Chat() {
  const user = getUser();
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40))); } catch {}
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const r = await api.post('/ai/chat', { message: msg, history });
      setMessages((m) => [...m, { role: 'assistant', content: r.data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: errorMessage(err, 'Sorry, I couldn’t answer that. Please try again.'), error: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        title="Ask AI"
        description="Your study assistant. Ask for explanations, examples, or a plan."
        actions={messages.length > 0 && <Button variant="ghost" icon="refresh" onClick={() => setMessages([])}>New chat</Button>}
      />

      <div className="card chat">
        <div className="chat-log" ref={logRef}>
          {messages.length === 0 && (
            <div className="empty" style={{ margin: 'auto' }}>
              <div className="empty-icon"><Icon name="message" size={20} /></div>
              <h3>What would you like to learn?</h3>
              <p>Try one of these to get started.</p>
              <div className="grid-2" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'left' }}>
                {QUICK.map((q) => (
                  <button key={q} className="option" style={{ fontSize: 13 }} onClick={() => send(q)}>
                    <Icon name="sparkles" size={14} style={{ color: 'var(--text-3)' }} /> {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'user' ? 'user' : ''} fade-in`}>
              {m.role === 'user'
                ? <Avatar name={user?.name || 'You'} />
                : <div className="avatar" style={{ background: 'var(--text)', color: 'var(--bg)' }}><Icon name="compass" size={14} stroke={2} /></div>}
              <div className="msg-bubble" style={m.error ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : m.role === 'user' ? undefined : { whiteSpace: 'normal', background: 'transparent', padding: '4px 0' }}>
                {m.role === 'user' || m.error ? m.content : <Prose text={m.content} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="msg fade-in">
              <div className="avatar" style={{ background: 'var(--text)', color: 'var(--bg)' }}><Icon name="compass" size={14} stroke={2} /></div>
              <div className="msg-bubble"><span className="typing"><i /><i /><i /></span></div>
            </div>
          )}
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask anything… (Shift + Enter for a new line)"
            aria-label="Message"
          />
          <Button type="submit" variant="primary" icon="send" disabled={!input.trim() || loading} aria-label="Send" style={{ alignSelf: 'flex-end', height: 42, width: 42 }} />
        </form>
      </div>
    </div>
  );
}

export default Chat;
