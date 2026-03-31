import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRoadmaps: 0,
    completedTasks: 0,
    pendingTasks: 0,
    streak: 0,
    badges: 0,
    quizzesTaken: 0,
  });
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, roadmapsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/stats/dashboard', { headers }),
          axios.get('http://localhost:5000/api/roadmaps', { headers }),
        ]);
        setStats(statsRes.data);
        setRoadmaps(roadmapsRes.data.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    { label: 'Resume Builder', icon: '📄', path: '/resume', color: '#a78bfa' },
    { label: 'Take Quiz', icon: '🧠', path: '/quiz', color: '#34d399' },
    { label: 'Chat AI', icon: '💬', path: '/chat', color: '#60a5fa' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '36px', fontWeight: '700',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>⚡ Command Center</h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            Welcome back! Here's your learning overview.
          </p>
        </div>

        {/* Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '36px',
        }}>
          {statCards.map((card, i) => (
            <div key={i} style={{
              background: 'rgba(10,22,40,0.8)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${card.color}33`,
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = card.color + '88';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = card.color + '33';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, ${card.color}, transparent)`,
              }} />
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{card.icon}</div>
              <div style={{
                fontSize: '32px', fontWeight: '800',
                fontFamily: 'Orbitron, sans-serif',
                color: card.color, marginBottom: '6px',
              }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{
                fontSize: '12px', color: '#64748b',
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: '600', letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>

          {/* LEFT — My Roadmaps */}
          <div>
            <div style={{
              background: 'rgba(10,22,40,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '20px',
              padding: '28px',
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '24px',
              }}>
                <h2 style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: '20px', fontWeight: '700',
                  color: '#f1f5f9',
                }}>🗺️ My Roadmaps</h2>
                <button onClick={() => navigate('/roadmaps')} style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '8px', padding: '6px 16px',
                  color: '#a78bfa', cursor: 'pointer',
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: '600', fontSize: '13px',
                }}>View All →</button>
              </div>

              {loading ? (
                <p style={{ color: '#475569', textAlign: 'center', padding: '40px 0' }}>
                  Loading...
                </p>
              ) : roadmaps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
                  <p style={{ color: '#475569', marginBottom: '16px' }}>
                    No roadmaps yet
                  </p>
                  <button onClick={() => navigate('/roadmaps')} style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                    border: 'none', borderRadius: '10px',
                    padding: '10px 24px', color: 'white',
                    cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif',
                    fontWeight: '700', fontSize: '14px',
                  }}>Create First Roadmap</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {roadmaps.map(rm => {
                    const progress = rm.total_tasks > 0
                      ? Math.round((rm.completed_tasks / rm.total_tasks) * 100)
                      : 0;
                    return (
                      <div key={rm.id}
                        onClick={() => navigate(`/roadmaps/${rm.id}`)}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(139,92,246,0.15)',
                          borderRadius: '14px', padding: '18px',
                          cursor: 'pointer', transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                          e.currentTarget.style.background = 'rgba(139,92,246,0.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(139,92,246,0.15)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                      >
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: '12px',
                        }}>
                          <span style={{
                            fontFamily: 'Rajdhani, sans-serif',
                            fontWeight: '700', fontSize: '16px',
                            color: '#f1f5f9',
                          }}>{rm.title}</span>
                          <span style={{
                            fontSize: '13px', fontWeight: '700',
                            fontFamily: 'Orbitron, sans-serif',
                            color: progress === 100 ? '#10b981' : '#8b5cf6',
                          }}>{progress}%</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{
                          height: '5px', background: 'rgba(255,255,255,0.06)',
                          borderRadius: '10px', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${progress}%`,
                            background: progress === 100
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                            borderRadius: '10px',
                            transition: 'width 0.8s ease',
                            boxShadow: '0 0 8px rgba(139,92,246,0.5)',
                          }} />
                        </div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          marginTop: '10px',
                        }}>
                          <span style={{ fontSize: '12px', color: '#475569' }}>
                            {rm.category || 'General'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#475569' }}>
                            {rm.completed_tasks || 0}/{rm.total_tasks || 0} tasks
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Quick Actions */}
          <div>
            <div style={{
              background: 'rgba(10,22,40,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '20px',
              padding: '28px',
            }}>
              <h2 style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '20px', fontWeight: '700',
                color: '#f1f5f9', marginBottom: '20px',
              }}>🚀 Quick Actions</h2>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
              }}>
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => navigate(action.path)} style={{
                    background: `${action.color}11`,
                    border: `1px solid ${action.color}33`,
                    borderRadius: '12px', padding: '16px 10px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '8px',
                    color: action.color,
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${action.color}22`;
                      e.currentTarget.style.borderColor = `${action.color}66`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 20px ${action.color}22`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = `${action.color}11`;
                      e.currentTarget.style.borderColor = `${action.color}33`;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>{action.icon}</span>
                    <span style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      fontWeight: '700', fontSize: '12px',
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                      color: '#94a3b8',
                                        }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;