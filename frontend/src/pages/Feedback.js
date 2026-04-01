import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Feedback() {

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(function() {
    loadHistory();
  }, []);

  function loadHistory() {
    axios.get('http://localhost:5000/api/feedback', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function(res) {
      setHistory(res.data);
    }).catch(function(err) {
      console.log(err);
    });
  }

  function handleSubmit() {
    if (message === '') {
      alert('Please enter a message!');
      return;
    }
    setLoading(true);
    axios.post('http://localhost:5000/api/feedback',
      { subject: subject, message: message },
      { headers: { Authorization: 'Bearer ' + token } }
    ).then(function() {
      setSubmitted(true);
      setSubject('');
      setMessage('');
      setLoading(false);
      loadHistory();
      setTimeout(function() {
        setSubmitted(false);
      }, 3000);
    }).catch(function(err) {
      console.log(err);
      setLoading(false);
    });
  }

  function goBack() {
    navigate('/dashboard');
  }

  function getStatusColor(status) {
    if (status === 'reviewed') return '#22c55e';
    if (status === 'closed') return '#64748b';
    return '#f59e0b';
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Arial, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={goBack} style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
          Feedback
        </h1>
      </div>

      {submitted && (
        <div style={{ background: '#22c55e', color: 'white', padding: '14px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
          Thank you! Feedback submitted! You earned +5 XP!
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

        <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#1e293b' }}>
          Share Your Feedback
        </h2>

        <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>
          Subject (optional)
        </p>
        <input
          type="text"
          placeholder="e.g. Feature request, Bug report"
          value={subject}
          onChange={function(e) { setSubject(e.target.value); }}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', background: '#ffffff',
  color: '#1e293b' }}
        />

        <p style={{ margin: '0 0 6px', fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>
          Message
        </p>
        <textarea
          placeholder="Write your feedback here..."
          value={message}
          onChange={function(e) { setMessage(e.target.value); }}
          rows={5}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', resize: 'vertical', background: '#ffffff',
  color: '#1e293b' }}
        />

        <button
          onClick={handleSubmit}
          style={{ width: '100%', padding: '13px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>

      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1e293b' }}>
          Your Previous Feedback
        </h3>

        {history.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            No feedback submitted yet.
          </p>
        )}

        {history.length > 0 && history.map(function(item, i) {
          return (
            <div key={i} style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '12px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                  {item.subject ? item.subject : 'General Feedback'}
                </span>
                <span style={{ background: getStatusColor(item.status), color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                  {item.status}
                </span>
              </div>

              <p style={{ margin: '0 0 6px', color: '#475569', fontSize: '14px' }}>
                {item.message}
              </p>

              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {new Date(item.created_at).toLocaleDateString()}
              </span>

            </div>
          );
        })}

      </div>

    </div>
  );

}

export default Feedback;
