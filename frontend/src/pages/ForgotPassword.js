import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { Button, Field, Input, Alert, Icon } from '../components/ui';
import AuthLayout from './AuthLayout';

function ForgotPassword() {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('learnmap.lastEmail') || ''; } catch { return ''; } });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the reset link. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="fade-in">
          <div className="empty-icon" style={{ margin: '0 0 16px' }}><Icon name="mail" size={20} /></div>
          <h1>Check your email</h1>
          <p className="mt-1">If an account exists for <strong>{email.trim()}</strong>, we’ve sent a link to reset your password. It expires in 30 minutes.</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3"><Alert tone="info">Running locally without email set up? The reset link is printed in the <strong>backend terminal</strong>.</Alert></div>
          )}
          <div className="row mt-3">
            <Button onClick={() => setSent(false)}>Use a different email</Button>
            <Link to="/login" className="btn btn-ghost">Back to log in</Link>
          </div>
        </div>
      ) : (
        <>
          <h1>Forgot your password?</h1>
          <p className="mt-1 mb-3">Enter your account email and we’ll send you a link to choose a new one.</p>
          {error && <div className="mb-2"><Alert tone="danger">{error}</Alert></div>}
          <form onSubmit={submit}>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus />
            </Field>
            <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!email.trim()} className="mt-3">Send reset link</Button>
          </form>
          <p className="mt-3 small center"><Link to="/login">Back to log in</Link></p>
        </>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
