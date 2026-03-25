import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setName(res.data.user.name);
      setBio(res.data.user.bio || '');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(
        'http://localhost:5000/api/profile',
        { name, bio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (!profile) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  const xp = profile.stats?.xp_points || 0;
  const level = profile.stats?.level || 1;
  const xpProgress = xp % 100;

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back
        </button>
        <h1 style={styles.title}>👤 My Profile</h1>
      </div>

      {message && (
        <div style={styles.successMsg}>{message}</div>
      )}

      {/* PROFILE CARD */}
      <div style={styles.profileCard}>
        <div style={styles.avatar}>
          {profile.user.name?.charAt(0).toUpperCase()}
        </div>
        {editing ? (
          <div style={styles.editForm}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              placeholder="Your name"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={styles.textarea}
              placeholder="Tell us about yourself..."
              rows={3}
            />
            <div style={styles.editButtons}>
              <button onClick={handleSave} style={styles.saveBtn}>
                ✅ Save
              </button>
              <button onClick={() => setEditing(false)} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.profileInfo}>
            <h2 style={styles.userName}>{profile.user.name}</h2>
            <p style={styles.userEmail}>📧 {profile.user.email}</p>
            <p style={styles.userBio}>
              {profile.user.bio || 'No bio yet — click Edit to add one!'}
            </p>
            <p style={styles.joinDate}>
              📅 Joined: {new Date(profile.user.created_at).toLocaleDateString()}
            </p>
            <button onClick={() => setEditing(true)} style={styles.editBtn}>
              ✏️ Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* STATS */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: '#8b5cf6' }}>
          <div style={styles.statNum}>{xp}</div>
          <div style={styles.statLbl}>XP Points</div>
        </div>
        <div style={{ ...styles.statCard, background: '#3b82f6' }}>
          <div style={styles.statNum}>Level {level}</div>
          <div style={styles.statLbl}>Current Level</div>
        </div>
        <div style={{ ...styles.statCard, background: '#ef4444' }}>
          <div style={styles.statNum}>{profile.stats?.streak_days || 0} 🔥</div>
          <div style={styles.statLbl}>Day Streak</div>
        </div>
      </div>

      {/* XP PROGRESS BAR */}
      <div style={styles.xpSection}>
        <div style={styles.xpHeader}>
          <span style={{ color: '#475569' }}>Level {level} Progress</span>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>
            {xpProgress}/100 XP to Level {level + 1}
          </span>
        </div>
        <div style={styles.xpBarBg}>
          <div style={{
            ...styles.xpBarFill,
            width: `${xpProgress}%`
          }} />
        </div>
      </div>

      {/* BADGES */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          🏆 My Badges ({profile.badges?.length || 0})
        </h3>
        {!profile.badges || profile.badges.length === 0 ? (
          <p style={styles.emptyText}>
            No badges yet. Keep learning to earn badges!
          </p>
        ) : (
          <div style={styles.badgesGrid}>
            {profile.badges.map((badge, i) => (
              <div key={i} style={styles.badgeCard}>
                <span style={styles.badgeIcon}>{badge.icon}</span>
                <span style={styles.badgeName}>{badge.name}</span>
                <span style={styles.badgeDesc}>{badge.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 Recent Activity</h3>
        {!profile.recentActivity || profile.recentActivity.length === 0 ? (
          <p style={styles.emptyText}>No activity yet. Start learning!</p>
        ) : (
          profile.recentActivity.map((log, i) => (
            <div key={i} style={styles.activityItem}>
              <span style={styles.activityDot}>●</span>
              <div>
                <span style={styles.activityAction}>{log.action}</span>
                <span style={styles.activityDesc}> — {log.description}</span>
                <div style={styles.activityTime}>
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', background: '#f1f5f9',
    padding: '24px', fontFamily: 'Segoe UI, sans-serif'
  },
  loading: {
    padding: '60px', textAlign: 'center',
    fontSize: '18px', color: '#64748b'
  },
  header: {
    display: 'flex', alignItems: 'center',
    gap: '16px', marginBottom: '24px'
  },
  backBtn: {
    padding: '8px 16px', background: '#64748b', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer'
  },
  title: { margin: 0, fontSize: '24px', color: '#1e293b' },
  successMsg: {
    background: '#22c55e', color: 'white', padding: '12px',
    borderRadius: '8px', marginBottom: '16px', textAlign: 'center',
    fontWeight: 'bold'
  },
  profileCard: {
    background: 'white', borderRadius: '16px', padding: '32px',
    marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap'
  },
  avatar: {
    width: '80px', height: '80px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '32px',
    fontWeight: 'bold', flexShrink: 0
  },
  profileInfo: { flex: 1 },
  userName: { margin: '0 0 4px', fontSize: '22px', color: '#1e293b' },
  userEmail: { margin: '0 0 6px', color: '#64748b', fontSize: '14px' },
  userBio: { margin: '0 0 6px', color: '#475569', fontSize: '14px' },
  joinDate: { margin: '0 0 12px', color: '#94a3b8', fontSize: '13px' },
  editBtn: {
    padding: '8px 20px', background: '#3b82f6', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
  },
  editForm: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' },
  input: {
    padding: '10px', borderRadius: '8px',
    border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none'
  },
  textarea: {
    padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '14px', resize: 'vertical', outline: 'none'
  },
  editButtons: { display: 'flex', gap: '8px' },
  saveBtn: {
    padding: '8px 20px', background: '#22c55e', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
  },
  cancelBtn: {
    padding: '8px 20px', background: '#64748b', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px', marginBottom: '24px'
  },
  statCard: {
    padding: '20px', borderRadius: '12px',
    color: 'white', textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statNum: { fontSize: '26px', fontWeight: 'bold' },
  statLbl: { fontSize: '13px', opacity: 0.9, marginTop: '4px' },
  xpSection: {
    background: 'white', borderRadius: '12px', padding: '20px',
    marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  xpHeader: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: '10px', fontSize: '14px'
  },
  xpBarBg: {
    height: '14px', background: '#e2e8f0',
    borderRadius: '7px', overflow: 'hidden'
  },
  xpBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
    borderRadius: '7px', transition: 'width 0.5s ease'
  },
  section: {
    background: 'white', borderRadius: '12px', padding: '20px',
    marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    margin: '0 0 16px', fontSize: '17px',
    fontWeight: 'bold', color: '#1e293b'
  },
  emptyText: {
    color: '#94a3b8', textAlign: 'center', padding: '20px 0', margin: 0
  },
  badgesGrid: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  badgeCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '16px', background: '#f8fafc', borderRadius: '10px',
    border: '1px solid #e2e8f0', minWidth: '100px'
  },
  badgeIcon: { fontSize: '28px', marginBottom: '6px' },
  badgeName: {
    fontSize: '12px', fontWeight: 'bold',
    color: '#1e293b', textAlign: 'center'
  },
  badgeDesc: {
    fontSize: '11px', color: '#64748b',
    textAlign: 'center', marginTop: '4px'
  },
  activityItem: {
    display: 'flex', gap: '12px', padding: '10px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  activityDot: { color: '#3b82f6', fontSize: '10px', marginTop: '4px' },
  activityAction: { fontWeight: 'bold', color: '#1e293b', fontSize: '14px' },
  activityDesc: { color: '#64748b', fontSize: '14px' },
  activityTime: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' }
};

export default Profile;
