import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isLoggedIn } from '../lib/api';
import { rememberInvite } from '../lib/growth';

/** /join/:code — a friend's invite link. Remember the code, then go to sign-up. */
export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoggedIn()) rememberInvite(code);
    navigate(isLoggedIn() ? '/dashboard' : '/signup?invited=1', { replace: true });
  }, [code, navigate]);
  return null;
}
