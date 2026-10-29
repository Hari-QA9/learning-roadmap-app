import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage, isLoggedIn } from '../lib/api';
import { Icon, Spinner } from '../components/ui';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'working', message: '' });
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const token = params.get('token');
    if (!token) { setState({ status: 'error', message: 'This link is missing its code. Open the link from your email again.' }); return; }
    api.post('/auth/verify-email', { token })
      .then((r) => setState({ status: 'ok', message: r.data.message }))
      .catch((e) => setState({ status: 'error', message: errorMessage(e, 'Could not confirm your email.') }));
  }, [params]);

  return (
    <div className="welcome">
      <div className="welcome-card" style={{ maxWidth: 440, textAlign: 'center', alignItems: 'center' }}>
        <span className="brand-mark" style={{ width: 44, height: 44, borderRadius: 12 }}><Icon name="compass" size={22} stroke={2} /></span>
        {state.status === 'working' && <p className="row" style={{ gap: 8 }}><Spinner /> Confirming your email…</p>}
        {state.status === 'ok' && (<><h1 style={{ marginBottom: 0 }}>You’re confirmed</h1><p className="muted">{state.message} Reminders and job alerts can now reach your inbox.</p></>)}
        {state.status === 'error' && (<><h1 style={{ marginBottom: 0 }}>Link didn’t work</h1><p className="muted">{state.message}</p></>)}
        {state.status !== 'working' && (
          <Link className="btn btn-primary" to={isLoggedIn() ? '/dashboard' : '/login'}>{isLoggedIn() ? 'Go to Learnvoy' : 'Log in'}</Link>
        )}
      </div>
    </div>
  );
}
