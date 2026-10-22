import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from './Toast';
import { Card, Button, Input, Icon } from './ui';

/** Private calendar link: task due dates and interviews show up in Google/Outlook/Apple Calendar. */
export default function CalendarCard() {
  const toast = useToast();
  const [link, setLink] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { api.get('/calendar/link', { noCache: true }).then((r) => setLink(r.data)).catch(() => {}); }, []);

  const copy = () => navigator.clipboard?.writeText(link.url).then(() => toast.success('Calendar link copied')).catch(() => toast.error('Could not copy'));
  const reset = async () => {
    setResetting(true);
    try { const r = await api.post('/calendar/link/reset'); setLink(r.data); toast.success('New link created — the old one no longer works'); }
    catch (e) { toast.error(errorMessage(e, 'Could not reset the link')); }
    finally { setResetting(false); }
  };

  return (
    <Card title="Calendar" description="Task due dates and interviews in the calendar you already use. It updates automatically.">
      {!link ? <div className="small muted">Loading…</div> : (
        <div className="stack-sm">
          <div className="row" style={{ gap: 6 }}>
            <Input readOnly value={link.url} onFocus={(e) => e.target.select()} aria-label="Your private calendar link" style={{ fontSize: 12 }} />
            <Button icon="copy" onClick={copy} aria-label="Copy link" />
          </div>
          <div className="row row-wrap" style={{ gap: 6 }}>
            <a className="btn btn-secondary btn-sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(link.webcal)}`} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={14} /> Add to Google Calendar</a>
            <a className="btn btn-secondary btn-sm" href={link.webcal}><Icon name="calendar" size={14} /> Apple / Outlook</a>
            <Button size="sm" variant="ghost" loading={resetting} onClick={reset}>New link</Button>
          </div>
          <p className="tiny subtle">
            {link.isLocal
              ? 'This link works once LearnMap is online — calendars can’t reach a server running on your own computer.'
              : 'Keep this link private — anyone with it can see your due dates and interviews. Use “New link” if it was shared by mistake.'}
          </p>
        </div>
      )}
    </Card>
  );
}
