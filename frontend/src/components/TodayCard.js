import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Ring, Icon, formatDate } from './ui';

/** Today's goal, the last 7 days, and tasks due soon. */
export default function TodayCard({ today }) {
  const navigate = useNavigate();
  if (!today) return null;
  const pct = Math.min(100, Math.round((today.today / Math.max(1, today.goal)) * 100));
  const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });
  const max = Math.max(1, ...today.last7.map((d) => d.done));
  const dueLabel = (d) => (d < today.todayDate ? 'Overdue' : d === today.todayDate ? 'Today' : formatDate(d, { month: 'short', day: 'numeric' }));

  return (
    <Card title="Today" description={today.today >= today.goal ? 'Daily goal reached — nice work!' : `Finish ${today.goal - today.today} more task${today.goal - today.today === 1 ? '' : 's'} to hit your goal`}
      actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>Change goal</button>}>
      <div className="today">
        <Ring value={pct} size={76} stroke={7} tone={pct >= 100 ? 'success' : 'accent'} label={`${today.today}/${today.goal}`} />
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <Icon name="flame" size={15} className={today.streak ? 'text-warning' : 'subtle'} />
            <strong>{today.streak}</strong><span className="small muted">day learning streak</span>
          </div>
          <div className="week-bars" aria-label="Tasks finished in the last 7 days">
            {today.last7.map((d) => (
              <div key={d.day} className="week-bar" title={`${d.day}: ${d.done} task${d.done === 1 ? '' : 's'}`}>
                <span style={{ height: `${Math.max(6, (d.done / max) * 100)}%`, opacity: d.done ? 1 : 0.25 }} />
                <em>{dayLabel(d.day)}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
      {today.due.length > 0 && (
        <div className="mt-3">
          <div className="section-label" style={{ marginTop: 0 }}>Due soon</div>
          <div className="stack-sm">
            {today.due.map((t) => (
              <button key={t.id} type="button" className="due-row" onClick={() => navigate(`/roadmaps/${t.roadmap_id}`)}>
                <span className={`tiny nowrap ${t.due_date < today.todayDate ? 'text-danger' : 'subtle'}`} style={{ width: 62, textAlign: 'left' }}>{dueLabel(t.due_date)}</span>
                <span className="grow truncate small" style={{ color: 'var(--text)', textAlign: 'left' }}>{t.title}</span>
                <Icon name="chevronRight" size={14} style={{ color: 'var(--text-3)' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
