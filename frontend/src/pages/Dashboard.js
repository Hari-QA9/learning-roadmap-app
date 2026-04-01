import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [stats, setStats] = useState({
    totalRoadmaps: 0,
    completedTasks: 0,
    pendingTasks: 0,
    streak: 0,
    badges: 0,
    quizzesTaken: 0,
  });

  const [roadmaps, setRoadmaps] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, roadmapsRes, quizRes] = await Promise.all([
        axios.get('http://localhost:5000/api/stats/dashboard', { headers }),
        axios.get('http://localhost:5000/api/roadmaps', { headers }),
        axios.get('http://localhost:5000/api/quiz/my-performance', { headers }),
      ]);

      setStats({
        ...statsRes.data,
        quizzesTaken: quizRes.data?.overall?.totalAttempts || statsRes.data?.quizzesTaken || 0,
      });

      setRoadmaps((roadmapsRes.data || []).slice(0, 4));
      setQuizHistory((quizRes.data?.quizHistory || []).slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Roadmaps', value: stats.totalRoadmaps, icon: '🗺️', color: '#8b5cf6' },
    { label: 'Tasks Completed', value: stats.completedTasks, icon: '✅', color: '#10b981' },
    { label: 'Tasks Pending', value: stats.pendingTasks, icon: '⏳', color: '#f59e0b' },
    { label: 'Day Streak', value: stats.streak || 0, icon: '🔥', color: '#ef4444' },
    { label: 'Badges Earned', value: stats.badges || 0, icon: '🏆', color: '#06b6d4' },
    { label: 'Quizzes Taken', value: stats.quizzesTaken || 0, icon: '🧠', color: '#ec4899' },
  ];

  const quickActions = [
    { label: 'New Roadmap', icon: '➕', path: '/roadmaps', color: '#8b5cf6' },
    { label: 'AI Generator', icon: '🤖', path: '/ai-generator', color: '#06b6d4' },
    { label: 'Templates', icon: '📋', path: '/templates', color: '#10b981' },
    { label: 'Study Planner', icon: '📅', path: '/study-planner', color: '#f59e0b' },
    { label: 'Career Advisor', icon: '🎯', path: '/career-advisor', color: '#ec4899' },
    { label: 'Resume Builder', icon: '📄', path: '/resume-builder', color: '#a78bfa' },
    { label: 'Take Quiz', icon: '🧠', path: '/quiz', color: '#34d399' },
    { label: 'Chat AI', icon: '💬', path: '/chat', color: '#60a5fa' },
  ];

  return (
    <div style={pageStyle}>
      <Navbar />

      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={{ color: '#fff', margin: 0 }}>⚡ Command Center</h1>
          <p style={{ color: '#cbd5e1', marginTop: '10px' }}>
            Welcome back! Here&apos;s your learning overview.
          </p>
        </div>

        <div style={statsGrid}>
          {statCards.map((card, i) => (
            <div
              key={i}
              style={{
                ...cardStyle,
                border: `1px solid ${card.color}33`,
              }}
            >
              <div style={{ fontSize: '30px' }}>{card.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '10px' }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{ color: '#cbd5e1', marginTop: '6px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={mainGrid}>
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>🗺️ My Roadmaps</h2>
              <button onClick={() => navigate('/roadmaps')} style={linkBtn}>
                View All →
              </button>
            </div>

            {loading ? (
              <p style={{ color: '#cbd5e1' }}>Loading...</p>
            ) : roadmaps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '40px' }}>🗺️</div>
                <p style={{ color: '#cbd5e1' }}>No roadmaps yet</p>
                <button onClick={() => navigate('/roadmaps')} style={primaryBtn}>
                  Create First Roadmap
                </button>
              </div>
            ) : (
              roadmaps.map((rm) => {
                const progress =
                  rm.total_tasks > 0
                    ? Math.round((rm.completed_tasks / rm.total_tasks) * 100)
                    : 0;

                return (
                  <div
                    key={rm.id}
                    onClick={() => navigate(`/roadmaps/${rm.id}`)}
                    style={roadmapCard}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <h3 style={{ margin: 0, color: '#fff' }}>{rm.title}</h3>
                      <span style={{ color: '#8b5cf6', fontWeight: '700' }}>{progress}%</span>
                    </div>

                    <div style={progressBarWrap}>
                      <div style={{ ...progressBarFill, width: `${progress}%` }} />
                    </div>

                    <p style={{ color: '#cbd5e1', margin: '10px 0 0 0' }}>
                      {rm.category || 'General'} • {rm.completed_tasks || 0}/{rm.total_tasks || 0} tasks
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div style={sectionCard}>
            <h2 style={sectionTitle}>🚀 Quick Actions</h2>
            <div style={actionsGrid}>
              {quickActions.map((action, i) => (
                <div
                  key={i}
                  onClick={() => navigate(action.path)}
                  style={{
                    background: `${action.color}11`,
                    border: `1px solid ${action.color}33`,
                    borderRadius: '12px',
                    padding: '16px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    color: action.color,
                    fontWeight: '700',
                  }}
                >
                  <div style={{ fontSize: '26px' }}>{action.icon}</div>
                  <div style={{ textAlign: 'center', fontSize: '14px' }}>{action.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={sectionCard}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>🧠 Recent Quiz History</h2>
            <button onClick={() => navigate('/quiz-performance')} style={linkBtn}>
              View Full History →
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#cbd5e1' }}>Loading quiz history...</p>
          ) : quizHistory.length === 0 ? (
            <p style={{ color: '#cbd5e1' }}>No quiz history yet.</p>
          ) : (
            quizHistory.map((item, i) => (
              <div
                key={i}
                style={{
                  background: '#0f172a',
                  border: `1px solid ${item.is_correct ? '#22c55e55' : '#ef444455'}`,
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ color: '#fff', fontWeight: '700', marginBottom: '8px' }}>
                  {item.is_correct ? '✅' : '❌'} {item.question}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#cbd5e1' }}>
                  <span style={{ color: item.is_correct ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                    {item.is_correct ? 'Correct' : 'Wrong'}
                  </span>
                  <span>Your Answer: {item.selected_answer}</span>
                  <span>Correct: {item.correct_answer}</span>
                  <span>{new Date(item.answered_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: '#0f172a',
  padding: '24px',
  fontFamily: 'Arial, sans-serif',
};

const containerStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerStyle = {
  marginBottom: '24px',
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
};

const cardStyle = {
  background: '#1e293b',
  borderRadius: '16px',
  padding: '20px',
};

const mainGrid = {
  display: 'grid',
  gridTemplateColumns: '1.5fr 1fr',
  gap: '20px',
  marginBottom: '24px',
};

const sectionCard = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
};

const sectionHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  marginBottom: '16px',
};

const sectionTitle = {
  color: '#fff',
  margin: 0,
};

const linkBtn = {
  background: 'rgba(139,92,246,0.15)',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '8px',
  padding: '8px 14px',
  color: '#a78bfa',
  cursor: 'pointer',
  fontWeight: '700',
};

const primaryBtn = {
  background: '#8b5cf6',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 18px',
  cursor: 'pointer',
  fontWeight: '700',
};

const roadmapCard = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(139,92,246,0.15)',
  borderRadius: '14px',
  padding: '18px',
  cursor: 'pointer',
  marginBottom: '14px',
};

const progressBarWrap = {
  width: '100%',
  height: '10px',
  background: '#334155',
  borderRadius: '999px',
  overflow: 'hidden',
  marginTop: '12px',
};

const progressBarFill = {
  height: '100%',
  background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
};

const actionsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
};

export default Dashboard;