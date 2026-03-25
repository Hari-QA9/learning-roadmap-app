import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('http://localhost:5000/api/notifications/read/all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Back</button>
        <h1 style={styles.title}>🔔 Notifications {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={styles.markAllBtn}>Mark All Read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={styles.empty}>
          <p>🎉 No notifications yet!</p>
        </div>
      ) : (
        <div style={styles.list}>
          {notifications.map(notif => (
            <div key={notif.id} style={{
              ...styles.notifCard,
              background: notif.is_read ? 'white' : '#eff6ff',
              borderLeft: notif.is_read ? '4px solid #e2e8f0' : '4px solid #3b82f6'
            }}>
              <div style={styles.notifContent}>
                <h4 style={styles.notifTitle}>{notif.title}</h4>
                <p style={styles.notifMessage}>{notif.message}</p>
                <span style={styles.notifTime}>
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>
              <div style={styles.notifActions}>
                {!notif.is_read && (
                  <button onClick={() => markRead(notif.id)} style={styles.readBtn}>
                    ✓ Read
                  </button>
                )}
                <button onClick={() => deleteNotif(notif.id)} style={styles.deleteBtn}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  title: { margin: 0, fontSize: '24px', color: '#1e293b', flex: 1 },
  badge: { background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '14px', marginLeft: '8px' },
  markAllBtn: { padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  empty: { background: 'white', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '18px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  notifCard: { borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' },
  notifContent: { flex: 1 },
  notifTitle: { margin: '0 0 4px', fontSize: '16px', color: '#1e293b' },
  notifMessage: { margin: '0 0 8px', color: '#475569', fontSize: '14px' },
  notifTime: { fontSize: '12px', color: '#94a3b8' },
  notifActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  readBtn: { padding: '6px 12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  deleteBtn: { padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }
};

export default Notifications;
