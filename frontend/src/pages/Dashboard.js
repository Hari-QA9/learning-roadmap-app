import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import AIAssistant from '../components/AIAssistant';

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  const [stats, setStats] = useState({
    total_roadmaps: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    current_streak: 0
  });
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const roadmapsRes = await axios.get(
        'http://localhost:5000/api/roadmaps',
        { headers }
      );
      setRoadmaps(roadmapsRes.data);

      var total = roadmapsRes.data.length;
      var completed = 0;
      var inProgress = 0;

      roadmapsRes.data.forEach(function(r) {
        completed += Number(r.completed_tasks || 0);
        inProgress += Number(r.total_tasks || 0) - Number(r.completed_tasks || 0);
      });

      setStats({
        total_roadmaps: total,
        completed_tasks: completed,
        in_progress_tasks: inProgress > 0 ? inProgress : 0,
        current_streak: 0
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <Navbar />

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          padding: '40px',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '32px'
        }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>
            Welcome back, {user.name}!
          </h2>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Keep learning and building your skills every day.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
              {stats.total_roadmaps}
            </div>
            <div style={{ color: '#6b7280', fontSize: '13px' }}>Roadmaps</div>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
              {stats.completed_tasks}
            </div>
            <div style={{ color: '#6b7280', fontSize: '13px' }}>Completed Tasks</div>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
              {stats.in_progress_tasks}
            </div>
            <div style={{ color: '#6b7280', fontSize: '13px' }}>Remaining Tasks</div>
          </div>

          <div style={{
            background: '#fbbf24',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'white' }}>
              {stats.current_streak}
            </div>
            <div style={{ color: 'white', fontSize: '13px' }}>Day Streak</div>
          </div>

        </div>

        {/* Quick Actions */}
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '32px'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

            <button
              onClick={function() { navigate('/roadmaps'); }}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              + Create Roadmap
            </button>

            <button
              onClick={function() { navigate('/roadmaps'); }}
              style={{
                padding: '12px 24px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              📚 My Roadmaps
            </button>

            <button
              onClick={function() { navigate('/ai-generator'); }}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              🤖 AI Generate Roadmap
            </button>

          </div>
        </div>

        {/* Recent Roadmaps */}
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>Recent Roadmaps</h2>
            <button
              onClick={function() { navigate('/roadmaps'); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              View All
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
              Loading...
            </p>
          ) : roadmaps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>📚</p>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                No roadmaps yet. Create your first one!
              </p>
              <button
                onClick={function() { navigate('/roadmaps'); }}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                + Create Roadmap
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {roadmaps.slice(0, 3).map(function(roadmap) {
                return (
                  <div
                    key={roadmap.id}
                    onClick={function() { navigate('/roadmaps/' + roadmap.id); }}
                    style={{
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={function(e) {
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseLeave={function(e) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '16px' }}>
                      {roadmap.title}
                    </h3>
                    <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '13px' }}>
                      {roadmap.description || 'No description'}
                    </p>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '6px'
                    }}>
                      <div style={{
                        width: (roadmap.progress || 0) + '%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        borderRadius: '3px'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {roadmap.progress || 0}% Complete
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <AIAssistant />

    </div>
  );
}

export default Dashboard;
