import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, setSession } from '../lib/api';
import { useToast } from './Toast';
import { getInvite, clearInvite, takeAfterAuth } from '../lib/growth';

let scriptPromise = null;
const loadGoogle = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
};

/** "Continue with Google" — shown only when the server has GOOGLE_CLIENT_ID set. */
export default function GoogleButton({ text = 'continue_with', redirectTo = '/dashboard' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const box = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { api.get('/auth/config').then((r) => setClientId(r.data.googleClientId)).catch(() => {}); }, []);

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    loadGoogle().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const r = await api.post('/auth/google', { credential, invite: getInvite() });
            setSession(r.data.token, r.data.user, true);
            clearInvite();
            const after = takeAfterAuth();
            navigate(after || (r.data.isNew ? '/welcome' : redirectTo), { replace: true });
          } catch (e) {
            toast.error(errorMessage(e, 'Google sign-in failed'));
          }
        },
      });
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      window.google.accounts.id.renderButton(box.current, { theme: dark ? 'filled_black' : 'outline', size: 'large', shape: 'pill', text, width: Math.min(400, box.current.offsetWidth || 320) });
      setReady(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [clientId, navigate, redirectTo, text, toast]);

  if (!clientId) return null;
  return (
    <>
      <div ref={box} className="google-btn" style={ready ? undefined : { minHeight: 0 }} />
      {ready && <div className="or-divider"><span>or</span></div>}
    </>
  );
}
