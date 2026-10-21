import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getUser } from '../lib/api';
import {
  PageHeader, Stat, Card, Button, Progress, EmptyState, SkeletonRows, Icon, Badge, timeAgo,
} from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const SHORTCUTS = [
  { label: 'Generate a roadmap', desc: 'Let AI draft modules and tasks', icon: 'wand', path: '/ai-generator' },
  { label: 'Browse templates', desc: 'Start from a proven path', icon: 'layers', path: '/templates' },
  { label: 'Plan my week', desc: 'Build a study schedule', icon: 'calendar', path: '/study-planner' },
  { label: 'Career advice', desc: 'Roles, gaps and next steps', icon: 'compass', path: '/career-advisor' },
];

function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [stats, setStats] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [quiz, setQuiz] = useState({ overall: null, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      api.get('/stats/dashboard'),
      api.get('/roadmaps'),
      api.get('/quiz/my-performance'),
    ]).then(([s, r, q]) => {
      if (!alive) return;
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (r.status === 'fulfilled') setRoadmaps(r.value.data || []);
      if (q.status === 'fulfilled') setQuiz({ overall: q.value.data?.overall, history: (q.value.data?.quizHistory || []).slice(0, 5) });
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const pct = (rm) => (rm.total_tasks > 0 ? Math.round((rm.completed_tasks / rm.total_tasks) * 100) : 0);
  const active = roadmaps.slice(0, 4);
  const totalTasks = (stats?.completedTasks || 0) + (stats?.pendingTasks || 0);
  const overall = totalTasks ? Math.round(((stats?.completedTasks || 0) / totalTasks) * 100) : 0;
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="Here’s where your learning stands today."
        actions={<Button variant="primary" icon="plus" onClick={() => navigate('/roadmaps?new=1')}>New roadmap</Button>}
      />

      <div className="grid-4 mb-3">
        <Stat label="Roadmaps" icon="map" value={stats?.totalRoadmaps ?? 0} loading={loading} />
        <Stat label="Tasks completed" icon="checkCircle" value={stats?.completedTasks ?? 0} note={totalTasks ? `${overall}% of all tasks` : undefined} loading={loading} />
        <Stat label="Day streak" icon="flame" value={stats?.streak ?? 0} note="Log in daily to grow it" loading={loading} />
        <Stat label="Quiz accuracy" icon="target" value={`${quiz.overall?.accuracy ?? 0}%`} note={`${quiz.overall?.totalAttempts ?? 0} answers`} loading={loading} />
      </div>

      <div className="split">
        <Card
          title="Continue learning"
          description="Your most recent roadmaps"
          pad={false}
          actions={roadmaps.length > 0 && <Button variant="ghost" size="sm" iconRight="arrowRight" onClick={() => navigate('/roadmaps')}>All roadmaps</Button>}
        >
          {loading ? (
            <SkeletonRows rows={3} />
          ) : active.length === 0 ? (
            <EmptyState
              icon="map"
              title="No roadmaps yet"
              description="Create your first roadmap, start from a template, or let AI draft one for you."
              action={
                <div className="row" style={{ justifyContent: 'center' }}>
                  <Button variant="primary" icon="plus" onClick={() => navigate('/roadmaps?new=1')}>Create roadmap</Button>
                  <Button variant="secondary" icon="wand" onClick={() => navigate('/ai-generator')}>Use AI</Button>
                </div>
              }
            />
          ) : (
            <div className="list">
              {active.map((rm) => (
                <div key={rm.id} className="list-row clickable" onClick={() => navigate(`/roadmaps/${rm.id}`)} style={{ padding: '16px 20px' }}>
                  <div className="list-icon"><Icon name="map" size={15} /></div>
                  <div className="grow">
                    <div className="row-between">
                      <div style={{ fontWeight: 500 }} className="truncate">{rm.title}</div>
                      <span className="small muted nowrap">{pct(rm)}%</span>
                    </div>
                    <div className="mt-1"><Progress value={pct(rm)} size="sm" tone={pct(rm) === 100 ? 'success' : undefined} /></div>
                    <div className="tiny subtle mt-1">
                      {rm.module_count || 0} modules · {rm.completed_tasks || 0}/{rm.total_tasks || 0} tasks
                    </div>
                  </div>
                  <Icon name="chevronRight" size={16} style={{ color: 'var(--text-3)' }} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="stack-lg">
          <Card title="Shortcuts" pad={false}>
            <div className="list">
              {SHORTCUTS.map((s) => (
                <div key={s.path} className="list-row clickable" onClick={() => navigate(s.path)}>
                  <div className="list-icon"><Icon name={s.icon} size={15} /></div>
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>{s.label}</div>
                    <div className="tiny subtle">{s.desc}</div>
                  </div>
                  <Icon name="chevronRight" size={15} style={{ color: 'var(--text-3)' }} />
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Recent quiz answers"
            pad={false}
            actions={quiz.history.length > 0 && <Button variant="ghost" size="sm" onClick={() => navigate('/quiz-performance')}>View all</Button>}
          >
            {loading ? (
              <SkeletonRows rows={2} />
            ) : quiz.history.length === 0 ? (
              <EmptyState icon="quiz" title="No quizzes yet" description="Take a quick quiz to check what you’ve learned." action={<Button size="sm" onClick={() => navigate('/quiz')}>Take a quiz</Button>} />
            ) : (
              <div className="list">
                {quiz.history.map((q, i) => (
                  <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <Icon name={q.is_correct ? 'checkCircle' : 'xCircle'} size={16} className={q.is_correct ? 'text-success' : 'text-danger'} style={{ marginTop: 2 }} />
                    <div className="grow">
                      <div className="small" style={{ color: 'var(--text)' }}>{q.question}</div>
                      <div className="tiny subtle mt-1">{timeAgo(q.answered_at)}</div>
                    </div>
                    <Badge tone={q.is_correct ? 'success' : 'danger'}>{q.is_correct ? 'Correct' : 'Missed'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
