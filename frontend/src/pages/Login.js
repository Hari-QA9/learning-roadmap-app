import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { Button, Field, Input, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: form.email.trim(), password: form.password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1>Welcome back</h1>
      <p className="mt-1 mb-3">Log in to pick up where you left off.</p>

      {params.get('expired') && !error && <div className="mb-2"><Alert tone="info">Your session expired. Please log in again.</Alert></div>}
      {params.get('registered') && !error && <div className="mb-2"><Alert tone="success">Account created. Log in to get started.</Alert></div>}
      {error && <div className="mb-2"><Alert tone="danger">{error}</Alert></div>}

      <form onSubmit={onSubmit}>
        <Field label="Email">
          <Input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" autoComplete="current-password" required />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={loading} className="mt-3">
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-3 small center">
        New to LearnMap? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
