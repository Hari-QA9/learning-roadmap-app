import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, EmptyState, SkeletonRows, Icon, Segmented, timeAgo } from '../components/ui';

function Notifications() {
  const toast = useToast();
  const { refreshUnread } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/notifications')
      .then((r) => setItems(r.data || []))
      .catch((e) => toast.error(errorMessage(e, 'Could not load notifications')))
      .finally(() => setLoading(false));
  }, [toast]);

  const update = (fn) => { setItems(fn); setTimeout(() => refreshUnread?.(), 50); };

  const markRead = async (n) => {
    if (n.is_read) return;
    update((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
    api.put(`/notifications/${n.id}/read`).catch(() => {});
  };

  const markAll = async () => {
    update((list) => list.map((x) => ({ ...x, is_read: 1 })));
    try { await api.put('/notifications/read/all'); toast.success('All caught up'); }
    catch (e) { toast.error(errorMessage(e, 'Could not update notifications')); }
  };

  const remove = async (n) => {
    update((list) => list.filter((x) => x.id !== n.id));
    api.delete(`/notifications/${n.id}`).catch(() => toast.error('Could not delete notification'));
  };

  const unread = items.filter((n) => !n.is_read).length;
  const visible = filter === 'unread' ? items.filter((n) => !n.is_read) : items;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : 'You’re all caught up.'}
        actions={unread > 0 && <Button icon="check" onClick={markAll}>Mark all as read</Button>}
      />
      <Card
        pad={false}
        title="Inbox"
        actions={<Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: `Unread${unread ? ` (${unread})` : ''}` }]} />}
      >
        {loading ? (
          <SkeletonRows rows={4} />
        ) : visible.length === 0 ? (
          <EmptyState icon="bell" title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="Updates about your roadmaps and achievements will appear here." />
        ) : (
          <div className="list">
            {visible.map((n) => (
              <div key={n.id} className="list-row clickable" onClick={() => markRead(n)} style={{ alignItems: 'flex-start', padding: '14px 20px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, marginTop: 7, flex: 'none', background: n.is_read ? 'transparent' : 'var(--accent)' }} />
                <div className="grow">
                  <div style={{ fontWeight: n.is_read ? 400 : 500, color: 'var(--text)' }}>{n.title}</div>
                  {n.message && <div className="small muted mt-1">{n.message}</div>}
                  <div className="tiny subtle mt-1">{timeAgo(n.created_at)}</div>
                </div>
                <Button variant="ghost" size="sm" icon="trash" aria-label="Delete notification" onClick={(e) => { e.stopPropagation(); remove(n); }} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Notifications;
