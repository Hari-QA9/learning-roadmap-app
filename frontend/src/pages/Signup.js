import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: '15%', right: '15%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', left: '15%',
        width: '250px', height: '250px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'rgba(10, 22, 40, 0.9)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 0 60px rgba(139,92,246,0.15)',
        position: 'relative',
      }}>

        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #8b5cf6, #06b6d4, transparent)',
          borderRadius: '2px',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '60px', height: '60px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 0 30px rgba(139,92,246,0.4)',
          }}>📚</div>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '22px', fontWeight: '700',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>LEARNMAP</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Create your free account</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px',
            color: '#f87171', fontSize: '14px', marginBottom: '20px',
          }}>{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', marginBottom: '8px',
              color: '#94a3b8', fontSize: '13px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '600', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', marginBottom: '8px',
              color: '#94a3b8', fontSize: '13px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '600', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block', marginBottom: '8px',
              color: '#94a3b8', fontSize: '13px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '600', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px',
            background: loading
              ? 'rgba(139,92,246,0.4)'
              : 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            border: 'none', borderRadius: '12px',
            color: 'white', fontSize: '15px',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700', letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading ? 'none' : '0 0 25px rgba(139,92,246,0.4)',
          }}>
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '24px',
          color: '#475569', fontSize: '14px',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
            color: '#8b5cf6', fontWeight: '600',
            textDecoration: 'none',
          }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;