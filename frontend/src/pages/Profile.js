import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { useTheme } from '../lib/theme';
import {
  PageHeader, Button, Card, Field, Input, Textarea, Avatar, Stat, Loading, Icon, EmptyState, Segmented, Badge, Modal, timeAgo, formatDate,
} from '../components/ui';

const BADGE_INFO = [
  { name: 'First Roadmap', how: 'Create your first learning roadmap (manually or with AI).' },
  { name: 'Task Master', how: 'Complete 10 tasks across any of your roadmaps.' },
  { name: 'AI Explorer', how: 'Generate a roadmap using the AI generator.' },
  { name: 'Streak Starter', how: 'Log in and stay active for 3 days in a row.' },
  { name: 'Quiz Champion', how: 'Score 100% on any quiz.' },
  { name: 'Resource Hunter', how: 'Bookmark 5 resources from your roadmaps.' },
  { name: 'Social Learner', how: 'Share a roadmap with someone.' },
  { name: 'Feedback Hero', how: 'Submit feedback through the Feedback page.' },
];

function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [data, setData] = useState(null);
  const [badges, setBadges] = useState([]);
  const [certCount, setCertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', profile_picture: '' });
  const [saving, setSaving] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.get('/profile'), api.get('/badges'), api.get('/evaluation/certificates')]).then(([p, b, c]) => {
      if (p.status === 'fulfilled') {
        setData(p.value.data);
        const u = p.value.data.user || {};
        setForm({ name: u.name || '', bio: u.bio || '', profile_picture: u.profile_picture || '' });
      } else toast.error(errorMessage(p.reason, 'Could not load profile'));
      if (b.status === 'fulfilled') setBadges(b.value.data || []);
      if (c.status === 'fulfilled') setCertCount((c.value.data.certificates || []).length);
      setLoading(false);
    });
  }, [toast]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.put('/profile', { ...form, name: form.name.trim() });
      setData((d) => ({ ...d, user: { ...d.user, ...form, name: form.name.trim() } }));
      try {
        const u = JSON.parse(localStorage.getItem('user')) || {};
        localStorage.setItem('user', JSON.stringify({ ...u, name: form.name.trim() }));
      } catch {}
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  const user = data?.user || {};
  const stats = data?.stats || {};
  const activity = data?.recentActivity || [];
  const earned = badges.filter((b) => b.earned);

  return (
    <>
      <PageHeader title="Profile" />

      <div className="split">
        <div className="stack-lg">
          <Card>
            {!editing ? (
              <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
                <Avatar name={user.name} src={user.profile_picture} size="lg" />
                <div className="grow">
                  <h2 style={{ fontSize: 20 }}>{user.name}</h2>
                  <div className="small muted">{user.email}</div>
                  <p className="mt-2" style={{ color: user.bio ? 'var(--text)' : 'var(--text-3)' }}>{user.bio || 'No bio yet.'}</p>
                  <div className="tiny subtle mt-2">Member since {formatDate(user.created_at, { month: 'long', year: 'numeric' })}</div>
                </div>
                <Button size="sm" icon="edit" onClick={() => setEditing(true)}>Edit</Button>
              </div>
            ) : (
              <form onSubmit={save}>
                <Field label="Name"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Bio" optional><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A sentence about what you’re learning" /></Field>
                <Field label="Photo URL" optional><Input type="url" value={form.profile_picture} onChange={(e) => setForm({ ...form, profile_picture: e.target.value })} placeholder="https://" /></Field>
                <div className="row mt-3" style={{ justifyContent: 'flex-end' }}>
                  <Button onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" loading={saving} disabled={!form.name.trim()}>Save</Button>
                </div>
              </form>
            )}
          </Card>

          <div className="grid-3">
            <Stat label="XP points" icon="zap" value={stats.xp_points || 0} />
            <Stat label="Day streak" icon="flame" value={stats.streak_days || 0} />
            <Stat label="Certificates" icon="award" value={certCount} />
          </div>

          <Card title="Recent activity" pad={false}>
            {activity.length === 0 ? (
              <EmptyState icon="clock" title="No activity yet" description="Create a roadmap or finish a task and it will show up here." />
            ) : (
              <div className="list">
                {activity.map((a) => (
                  <div key={a.id} className="list-row">
                    <div className="list-icon"><Icon name="checkCircle" size={14} /></div>
                    <div className="grow">
                      <div className="small" style={{ color: 'var(--text)' }}>{a.description || a.action}</div>
                      <div className="tiny subtle">{a.action}</div>
                    </div>
                    <span className="tiny subtle nowrap">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="stack-lg">
          <Card title="Appearance">
            <Segmented value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </Card>

          <Card title="Badges" description={`${earned.length} of ${badges.length} earned`} actions={<Button variant="ghost" size="sm" icon="info" onClick={() => setShowBadgeInfo(true)}>How to earn</Button>}>
            {badges.length === 0 ? (
              <p className="small subtle">Badges will appear as you learn.</p>
            ) : (
              <div className="grid-2" style={{ gap: 10 }}>
                {badges.map((b) => (
                  <div key={b.id} className="card-muted" style={{ padding: 12, opacity: b.earned ? 1 : 0.5 }} title={b.description}>
                    <div className="row" style={{ gap: 8 }}>
                      <Icon name={b.earned ? 'award' : 'lock'} size={15} className={b.earned ? 'text-accent' : 'subtle'} />
                      <span className="small truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{b.name}</span>
                    </div>
                    {b.description && <div className="tiny subtle mt-1">{b.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card pad={false}>
            <div className="list">
              <div className="list-row clickable" onClick={() => navigate('/certificates')}>
                <div className="list-icon"><Icon name="award" size={15} /></div>
                <div className="grow"><div style={{ fontWeight: 500 }}>Certificates</div><div className="tiny subtle">View and download</div></div>
                {certCount > 0 && <Badge tone="accent">{certCount}</Badge>}
                <Icon name="chevronRight" size={15} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="list-row clickable" onClick={() => navigate('/quiz-performance')}>
                <div className="list-icon"><Icon name="chart" size={15} /></div>
                <div className="grow"><div style={{ fontWeight: 500 }}>Quiz performance</div><div className="tiny subtle">Accuracy and history</div></div>
                <Icon name="chevronRight" size={15} style={{ color: 'var(--text-3)' }} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={showBadgeInfo}
        onClose={() => setShowBadgeInfo(false)}
        title="How to earn badges"
        description="Badges are awarded automatically when you hit the milestone."
        footer={<Button onClick={() => setShowBadgeInfo(false)}>Got it</Button>}
      >
        <div className="stack-sm">
          {BADGE_INFO.map((b) => {
            const got = earned.some((e) => e.name === b.name);
            return (
              <div key={b.name} className="card-muted row" style={{ padding: 12, alignItems: 'flex-start' }}>
                <Icon name={got ? 'award' : 'lock'} size={16} className={got ? 'text-accent' : 'subtle'} style={{ marginTop: 2 }} />
                <div className="grow">
                  <div style={{ fontWeight: 500, color: 'var(--text)' }}>{b.name} {got && <Badge tone="success">Earned</Badge>}</div>
                  <div className="small muted">{b.how}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

export default Profile;
