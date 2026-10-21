import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage, logout } from '../lib/api';
import { Button, Alert } from '../components/ui';
import { PasswordField, StrengthMeter } from '../components/PasswordField';
import AuthLayout from './AuthLayout';

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const mismatch = form.confirm && form.confirm !== form.password;
  const valid = form.password.length >= 8 && form.confirm === form.password;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      logout();
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <h1>Invalid link</h1>
        <p className="mt-1 mb-3">This password reset link is missing or incomplete.</p>
        <Link to="/forgot-password" className="btn btn-primary btn-lg btn-block">Request a new link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1>Choose a new password</h1>
      <p className="mt-1 mb-3">Pick something you haven’t used here before.</p>
      {error && (
        <div className="mb-2">
          <Alert tone="danger">{error} {/expired|used/i.test(error) && <Link to="/forgot-password" style={{ color: 'inherit', textDecoration: 'underline' }}>Request a new link</Link>}</Alert>
        </div>
      )}
      <form onSubmit={submit}>
        <PasswordField label="New password" value={form.password} onChange={onChange} autoComplete="new-password" autoFocus hint={!form.password ? 'At least 8 characters.' : undefined} />
        <StrengthMeter password={form.password} />
        <PasswordField label="Confirm new password" name="confirm" value={form.confirm} onChange={onChange} autoComplete="new-password" error={mismatch ? 'Passwords don’t match.' : ''} />
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!valid} className="mt-3">Update password</Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
