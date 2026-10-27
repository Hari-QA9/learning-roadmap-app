import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, Icon, Progress, Avatar } from './ui';

/** Dashboard: this week's challenges and how your buddies are doing today. */
export default function WeekCard() {
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [b, setB] = useState(null);
  useEffect(() => {
    api.get('/community/challenges', { noCache: true }).then((r) => setC(r.data)).catch(() => {});
    api.get('/community/buddies', { noCache: true }).then((r) => setB(r.data)).catch(() => {});
  }, []);
  if (!c) return null;
  const next = c.challenges.find((x) => !x.done);
  return (
    <Card title="This week" description={`${c.completed} of ${c.challenges.length} challenges done · ${c.points} points`}
      actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/challenges')}>Leaderboard</button>}>
      {next ? (
        <button type="button" className="study-chip" style={{ width: '100%' }} onClick={() => navigate('/challenges')}>
          <Icon name={next.icon} size={15} />
          <span className="grow">
            <span style={{ display: 'block', color: 'var(--text)' }}>{next.title}</span>
            <span style={{ display: 'block', marginTop: 6 }}><Progress value={(next.value / next.target) * 100} size="sm" /></span>
          </span>
          <span className="tiny subtle nowrap">{next.value}/{next.target}</span>
        </button>
      ) : <div className="small text-success">All challenges done this week — legend! 🏆</div>}
      {b?.buddies?.length > 0 && (
        <button type="button" className="study-chip mt-2" style={{ width: '100%' }} onClick={() => navigate('/buddies')}>
          <span className="row" style={{ gap: 4 }}>{b.buddies.slice(0, 3).map((x) => <Avatar key={x.id} name={x.name} src={x.photo} />)}</span>
          <span className="grow">{b.buddies.filter((x) => x.done_today).length} of {b.buddies.length} buddies hit today’s goal</span>
          <Icon name="chevronRight" size={13} />
        </button>
      )}
    </Card>
  );
}
