import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from './Toast';
import { Button, Icon } from './ui';
import { pushState, enablePush, disablePush, isIOS, isStandalone } from '../lib/push';

/** Profile → Notifications: phone & desktop push for this device (falls back to tab pop-ups). */
export default function PushRow() {
  const toast = useToast();
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setSt).catch(() => setSt({ supported: false })); }, []);

  const toggle = async (on) => {
    setBusy(true);
    setSt((x) => ({ ...x, subscribed: on }));
    try {
      if (on) { await enablePush(); toast.success('Notifications are on for this device'); } else { await disablePush(); toast.success('Notifications are off for this device'); }
      setSt(await pushState());
    } catch (e) {
      setSt((x) => ({ ...x, subscribed: !on }));
      toast.error(e.message || 'Could not change notifications');
    } finally { setBusy(false); }
  };
  const test = async () => {
    try { const r = await api.post('/push/test'); toast.success(r.data.message); } catch (e) { toast.error(errorMessage(e, 'Could not send a test')); }
  };

  const label = (
    <div className="grow">
      <div className="small" style={{ fontWeight: 500, color: 'var(--text)' }}>Phone & desktop notifications</div>
      <div className="tiny subtle">Reminders, buddy nudges, group and challenge updates — even when Learnvoy is closed.</div>
    </div>
  );
  if (!st) return <div className="setting-row">{label}<span className="tiny subtle">Checking…</span></div>;
  if (isIOS() && !isStandalone()) {
    return <div className="setting-row">{label}<span className="tiny subtle" style={{ maxWidth: 200, textAlign: 'right' }}>On iPhone/iPad: Share → Add to Home Screen, open Learnvoy from there, then turn this on.</span></div>;
  }
  if (!st.supported) return <div className="setting-row">{label}<span className="tiny subtle">Not supported in this browser</span></div>;
  if (!st.serverReady) return <div className="setting-row">{label}<span className="tiny subtle" style={{ maxWidth: 180, textAlign: 'right' }}>Coming soon — not set up on the server yet</span></div>;
  if (st.permission === 'denied') return <div className="setting-row">{label}<span className="tiny subtle" style={{ maxWidth: 180, textAlign: 'right' }}>Blocked — allow notifications for this site in your browser settings</span></div>;
  return (
    <div className="setting-row" style={{ flexWrap: 'wrap' }}>
      {label}
      {st.subscribed && <Button size="sm" variant="ghost" icon="bell" onClick={test}>Send a test</Button>}
      <input type="checkbox" className="switch" checked={!!st.subscribed} disabled={busy} onChange={(e) => toggle(e.target.checked)} aria-label="Phone and desktop notifications" />
      {!st.subscribed && <div className="tiny subtle" style={{ width: '100%' }}><Icon name="info" size={12} /> Turn it on separately on each phone or computer you use.</div>}
    </div>
  );
}
