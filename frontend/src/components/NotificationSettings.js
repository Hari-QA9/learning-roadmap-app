import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from './Toast';
import { Card, Select, Icon } from './ui';
import PushRow from './PushRow';

const EMAILS = [
  ['email_weekly', 'Weekly summary', 'Monday morning: what you finished, what’s next, and top job matches'],
  ['email_reminders', 'Reminders', 'Tasks due soon, and a nudge if you haven’t studied for a few days'],
  ['email_job_alerts', 'Job alerts', 'New jobs that strongly match your skills (at most once a day)'],
  ['email_followups', 'Follow-up reminders', 'A week after you apply, a reminder to follow up with the recruiter'],
];

export const browserTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'America/New_York'; } };

/** Email preferences, daily goal, time zone and browser notifications. */
export default function NotificationSettings() {
  const toast = useToast();
  const [s, setS] = useState(null);

  useEffect(() => {
    api.get('/settings', { noCache: true }).then((r) => {
      setS(r.data);
      // Keep the time zone right automatically (e.g. after moving).
      const tz = browserTz();
      if (tz && r.data.timezone !== tz) api.put('/settings', { timezone: tz }).then(() => setS((x) => ({ ...x, timezone: tz }))).catch(() => {});
    }).catch(() => {});
  }, []);

  const save = async (patch) => {
    setS((x) => ({ ...x, ...patch }));
    try { await api.put('/settings', patch); } catch (e) { toast.error(errorMessage(e, 'Could not save')); }
  };

  if (!s) return <Card title="Notifications & reminders"><div className="small muted">Loading…</div></Card>;

  return (
    <Card title="Notifications & reminders" description="Choose what LearnMap sends you. Every email has a one-click unsubscribe link.">
      <div className="stack">
        {!s.emailEnabled && (
          <div className="tiny subtle" style={{ display: 'flex', gap: 6 }}>
            <Icon name="info" size={13} style={{ flex: 'none', marginTop: 1 }} />
            Emails will start once email sending is set up on the server. In-app notifications work now.
          </div>
        )}
        {EMAILS.map(([key, label, desc]) => (
          <label key={key} className="setting-row">
            <div className="grow">
              <div className="small" style={{ fontWeight: 500, color: 'var(--text)' }}>{label}</div>
              <div className="tiny subtle">{desc}</div>
            </div>
            <input type="checkbox" className="switch" checked={!!s[key]} onChange={(e) => save({ [key]: e.target.checked })} aria-label={label} />
          </label>
        ))}
        <div className="setting-row">
          <div className="grow">
            <div className="small" style={{ fontWeight: 500, color: 'var(--text)' }}>Daily goal</div>
            <div className="tiny subtle">Tasks to finish each day. Your streak grows on days you finish at least one.</div>
          </div>
          <Select value={s.daily_goal} onChange={(e) => save({ daily_goal: Number(e.target.value) })} className="select-sm" style={{ width: 'auto' }} aria-label="Daily goal">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} task{n > 1 ? 's' : ''}</option>)}
          </Select>
        </div>
        <PushRow />
        <div className="tiny subtle">Times use your time zone: {s.timezone}</div>
      </div>
    </Card>
  );
}
