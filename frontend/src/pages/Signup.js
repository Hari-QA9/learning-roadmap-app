import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { Button, Field, Input, Alert } from '../components/ui';
import AuthLayout from './AuthLayout';

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    const payload = { name: form.name.trim(), email: form.email.trim(), password: form.password };
    try {
      await api.post('/auth/register', payload);
      // Sign the new user straight in.
      try {
        const res = await api.post('/auth/login', { email: payload.email, password: payload.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard', { replace: true });
      } catch {
        navigate('/login?registered=1', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err, 'Sign up failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1>Create your account</h1>
      <p className="mt-1 mb-3">Plan what you want to learn and track it to the finish.</p>

      {error && <div className="mb-2"><Alert tone="danger">{error}</Alert></div>}

      <form onSubmit={onSubmit}>
        <Field label="Full name">
          <Input name="name" value={form.name} onChange={onChange} placeholder="Your name" autoComplete="name" required autoFocus />
        </Field>
        <Field label="Email">
          <Input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 6 characters.">
          <Input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" autoComplete="new-password" required />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={loading} className="mt-3">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-3 small center">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;
