import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Icon, Progress, Badge, SkeletonRows, EmptyState, Select } from '../components/ui';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Weekly challenges (auto-awarded XP) and the weekly leaderboard. */
export default function Challenges() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [c, setC] = useState(null);
  const [groups, setGroups] = useState([]);
  const [scope, setScope] = useState(params.get('scope') || 'friends');
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api.get('/community/challenges', { noCache: true }).then((r) => {
      setC(r.data);
      for (const key of r.data.newly_done || []) {
        const ch = r.data.challenges.find((x) => x.key === key);
        if (ch) toast.success(`Challenge complete: ${ch.title} (+${ch.xp} XP)`);
      }
    }).catch((e) => toast.error(errorMessage(e, 'Could not load challenges')));
    api.get('/community/groups', { noCache: true }).then((r) => setGroups(r.data)).catch(() => {});
  }, [toast]);
  useEffect(() => {
    setBoard(null);
    api.get('/community/leaderboard', { params: { scope }, noCache: true }).then((r) => setBoard(r.data)).catch(() => setBoard({ rows: [], error: true }));
  }, [scope]);

  const optIn = async (on) => {
    setBoard((b) => ({ ...b, public: on })); // flip the switch right away
    try {
      const r = await api.put('/community/leaderboard/opt-in', { public: on });
      toast.success(r.data.message);
      const b = await api.get('/community/leaderboard', { params: { scope }, noCache: true });
      setBoard(b.data);
    } catch (e) { setBoard((b) => ({ ...b, public: !on })); toast.error(errorMessage(e, 'Could not save')); }
  };

  return (
    <>
      <PageHeader title="Challenges" description="Fresh challenges every Monday. Finish them for bonus XP and climb the weekly leaderboard." />
      <div className="split">
        <div className="stack-lg">
          <Card title="This week’s challenges" description={c ? `${c.completed} of ${c.challenges.length} done · ${c.week.days_left === 0 ? 'last day' : `${c.week.days_left} day${c.week.days_left === 1 ? '' : 's'} left`}` : ''}>
            {!c ? <SkeletonRows rows={4} /> : (
              <div className="stack-sm">
                {c.challenges.map((ch) => (
                  <div key={ch.key} className={`challenge ${ch.done ? 'done' : ''}`}>
                    <div className="challenge-icon"><Icon name={ch.done ? 'checkCircle' : ch.icon} size={18} /></div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <strong>{ch.title}</strong>
                        {ch.done ? <Badge tone="success">+{ch.xp} XP</Badge> : <span className="tiny subtle nowrap">{ch.value}/{ch.target}{ch.unit ? ` ${ch.unit}` : ''} · {ch.xp} XP</span>}
                      </div>
                      <div className="mt-1"><Progress value={(ch.value / ch.target) * 100} tone={ch.done ? 'success' : undefined} size="sm" /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Leaderboard" description="This week · resets every Monday" pad={false}
          actions={
            <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Leaderboard" style={{ width: 190, height: 34 }}>
              <option value="friends">Friends & groups</option>
              {groups.map((g) => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}
              <option value="everyone">Everyone</option>
            </Select>
          }>
          {scope === 'everyone' && board && (
            <div className="row small" style={{ gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <span className="grow muted">Show me on the public leaderboard (first name + initial only)</span>
              <input type="checkbox" className="switch" checked={!!board.public} onChange={(e) => optIn(e.target.checked)} aria-label="Show me on the public leaderboard" />
            </div>
          )}
          {!board ? <SkeletonRows rows={5} /> : board.rows.length === 0 ? (
            <EmptyState icon="trophy" title="No one here yet" description={scope === 'everyone' ? 'Turn on the switch above to be the first!' : 'Join a study group or add a buddy to compete with friends.'} />
          ) : (
            <div className="list">
              {board.rows.map((r) => (
                <div key={`${r.rank}-${r.name}`} className={`list-row leader ${r.me ? 'me' : ''}`}>
                  <span className="leader-rank">{(r.points > 0 && MEDAL[r.rank - 1]) || r.rank}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{r.name}{r.me ? ' (you)' : ''}</div>
                    <div className="tiny subtle">{r.tasks} tasks · {r.focus} min · {r.reviews} cards{r.challenges ? ` · ${r.challenges} challenge${r.challenges === 1 ? '' : 's'}` : ''}</div>
                  </div>
                  <strong>{r.points}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="tiny subtle" style={{ padding: '10px 20px' }}>Points: 10 per task, 1 per focus minute, 1 per card reviewed, 50 per challenge.</div>
        </Card>
      </div>
    </>
  );
}
