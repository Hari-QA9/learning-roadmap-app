import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, isLoggedIn } from '../lib/api';
import PublicLayout from '../components/growth/PublicLayout';
import { Button, EmptyState, Icon, Loading } from '../components/ui';
import { useToast } from '../components/Toast';

const remember = (path) => { try { sessionStorage.setItem('learnmap.afterAuth', path); } catch {} };

/** /g/:code — a study-group invite.  /buddy/:code — a buddy request link. */
export default function JoinCommunity({ kind }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [g, setG] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (kind !== 'group') return;
    api.get(`/public/groups/${encodeURIComponent(code)}`, { noCache: true }).then((r) => setG(r.data)).catch((e) => setError(errorMessage(e, 'This invite link isn’t valid any more.')));
  }, [kind, code]);

  const go = async () => {
    if (!isLoggedIn()) { remember(`/${kind === 'group' ? 'g' : 'buddy'}/${code}?auto=1`); navigate('/signup'); return; }
    setBusy(true);
    try {
      if (kind === 'group') {
        const r = await api.post('/community/groups/join', { code });
        toast.success(r.data.message);
        navigate(`/groups/${r.data.id}`, { replace: true });
      } else {
        const r = await api.post('/community/buddies', { code });
        toast.success(r.data.message);
        navigate('/buddies', { replace: true });
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Something went wrong'));
      setBusy(false);
    }
  };

  // Back from sign-up/login → finish automatically.
  useEffect(() => {
    if (isLoggedIn() && new URLSearchParams(window.location.search).get('auto') === '1' && (kind === 'buddy' || g)) go();
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <PublicLayout><EmptyState icon="user" title="Invite not valid" description={error} action={<Link className="btn btn-primary" to="/">Go to LearnMap</Link>} /></PublicLayout>;
  if (kind === 'group' && !g) return <PublicLayout><Loading /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="verify card">
        <div className="verify-icon ok"><Icon name={kind === 'group' ? 'user' : 'flame'} size={26} /></div>
        {kind === 'group' ? (
          <>
            <div className="tiny subtle" style={{ letterSpacing: '.14em', textTransform: 'uppercase' }}>You’re invited to a study group</div>
            <h1>{g.name}</h1>
            {g.goal && <p className="muted" style={{ margin: 0 }}>{g.goal}</p>}
            <p className="small muted">{g.members} member{g.members === 1 ? '' : 's'} learning together on LearnMap</p>
            <Button variant="primary" size="lg" loading={busy} onClick={go}>{isLoggedIn() ? 'Join group' : 'Join free & enter group'}</Button>
          </>
        ) : (
          <>
            <div className="tiny subtle" style={{ letterSpacing: '.14em', textTransform: 'uppercase' }}>Study buddy invite</div>
            <h1>Keep each other on track</h1>
            <p className="muted">Buddies see each other’s streak and weekly progress and can send a nudge when it’s time to study.</p>
            <Button variant="primary" size="lg" loading={busy} onClick={go}>{isLoggedIn() ? 'Be study buddies' : 'Join free & connect'}</Button>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
