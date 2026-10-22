import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import api, { errorMessage, setSession } from '../lib/api';
import { Button, Field, Input, Alert } from '../components/ui';
import { PasswordField } from '../components/PasswordField';
import AuthLayout from './AuthLayout';
import GoogleButton from '../components/GoogleButton';

const LAST_EMAIL = 'learnmap.lastEmail';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => {
    let email = '';
    try { email = localStorage.getItem(LAST_EMAIL) || ''; } catch {}
    return { email, password: '' };
  });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const from = location.state?.from && !location.state.from.startsWith('/login') ? location.state.from : '/dashboard';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLocked(false);
    setLoading(true);
    try {
      const email = form.email.trim();
      const res = await api.post('/auth/login', { email, password: form.password, remember });
      setSession(res.data.token, res.data.user, remember);
      try { if (remember) localStorage.setItem(LAST_EMAIL, email); else localStorage.removeItem(LAST_EMAIL); } catch {}
      navigate(from, { replace: true });
    } catch (err) {
      setLocked(!!err.response?.data?.locked);
      setError(errorMessage(err, 'Login failed. Please try again.'));
      setForm((f) => ({ ...f, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  const notice =
    params.get('expired') ? { tone: 'info', text: 'Your session expired. Please log in again.' }
      : params.get('registered') ? { tone: 'success', text: 'Account created. Log in to get started.' }
        : params.get('reset') ? { tone: 'success', text: 'Password updated. Log in with your new password.' }
          : location.state?.from ? { tone: 'info', text: 'Please log in to continue.' }
            : null;

  return (
    <AuthLayout>
      <h1>Welcome back</h1>
      <p className="mt-1 mb-3">Log in to pick up where you left off.</p>

      {notice && !error && <div className="mb-2"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      {error && (
        <div className="mb-2">
          <Alert tone="danger">
            {error}
            {locked && <> <Link to="/forgot-password" style={{ color: 'inherit', textDecoration: 'underline' }}>Reset password</Link></>}
          </Alert>
        </div>
      )}

      <GoogleButton text="signin_with" redirectTo={from || '/dashboard'} />
      <form onSubmit={onSubmit} noValidate={false}>
        <Field label="Email">
          <Input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" autoComplete="email" required autoFocus={!form.email} />
        </Field>
        <PasswordField
          value={form.password}
          onChange={onChange}
          autoFocus={!!form.email}
          labelRight={<Link to="/forgot-password" onClick={(e) => e.stopPropagation()}>Forgot password?</Link>}
        />
        <label className="checkbox mt-2">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in for 30 days
        </label>
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!form.email.trim() || !form.password} className="mt-3">
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
