import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { errorMessage, setSession } from '../lib/api';
import { Button, Field, Input, Alert } from '../components/ui';
import { PasswordField, StrengthMeter, scorePassword } from '../components/PasswordField';
import AuthLayout from './AuthLayout';
import GoogleButton from '../components/GoogleButton';
import { getInvite, clearInvite, takeAfterAuth } from '../lib/growth';
import { useT } from '../lib/i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Signup() {
  const navigate = useNavigate();
  const invited = !!getInvite();
  const t = useT();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const emailErr = touched.email && form.email && !EMAIL_RE.test(form.email.trim()) ? 'That doesn’t look like an email address.' : '';
  const pwErr = touched.password && form.password && form.password.length < 8 ? 'Use at least 8 characters.' : '';
  const confirmErr = form.confirm && form.confirm !== form.password ? 'Passwords don’t match.' : '';
  const strong = scorePassword(form.password).score >= 2;
  const valid = form.name.trim() && EMAIL_RE.test(form.email.trim()) && form.password.length >= 8 && form.confirm === form.password;

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!valid) { setError('Please fix the highlighted fields.'); return; }
    setError('');
    setLoading(true);
    const payload = { name: form.name.trim(), email: form.email.trim(), password: form.password, invite: getInvite() };
    try {
      await api.post('/auth/register', payload);
      try {
        const res = await api.post('/auth/login', { email: payload.email, password: payload.password, remember: true });
        setSession(res.data.token, res.data.user, true);
        clearInvite();
        try { localStorage.setItem('learnmap.lastEmail', payload.email); } catch {}
        navigate(takeAfterAuth() || '/welcome', { replace: true });
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
      {invited && <div className="mb-2"><Alert tone="success">A friend invited you — welcome! Create your free account below.</Alert></div>}
      <h1>{t('auth.createTitle')}</h1>
      <p className="mt-1 mb-3">{t('auth.createSub')}</p>

      {error && <div className="mb-2"><Alert tone="danger">{error}</Alert></div>}

      <GoogleButton text="signup_with" />
      <form onSubmit={onSubmit}>
        <Field label={t('auth.fullName')}>
          <Input name="name" value={form.name} onChange={onChange} placeholder={t('auth.namePh')} autoComplete="name" required autoFocus />
        </Field>
        <Field label={t('auth.email')} error={emailErr}>
          <Input type="email" name="email" value={form.email} onChange={onChange} onBlur={blur('email')} placeholder="you@example.com" autoComplete="email" required />
        </Field>
        <PasswordField
          value={form.password}
          onChange={onChange}
          onBlur={blur('password')}
          autoComplete="new-password"
          label={t('auth.password')}
          hint={!form.password ? t('auth.pwHint') : undefined}
          error={pwErr}
        />
        <StrengthMeter password={form.password} />
        <PasswordField
          label={t('auth.confirm')}
          name="confirm"
          value={form.confirm}
          onChange={onChange}
          autoComplete="new-password"
          error={confirmErr}
        />
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={!valid} className="mt-3">
          {loading ? t('auth.creating') : t('auth.create')}
        </Button>
        {valid && !strong && <p className="tiny subtle center mt-1">Tip: a stronger password keeps your account safer.</p>}
        <p className="tiny subtle center mt-2">{t('auth.agree1')} <Link to="/terms">{t('footer.terms')}</Link> {t('auth.and')} <Link to="/privacy">{t('auth.privacyPolicy')}</Link>.</p>
      </form>

      <p className="mt-3 small center">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;
