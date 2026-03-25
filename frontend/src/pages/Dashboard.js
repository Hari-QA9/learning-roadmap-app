import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [progress, setProgress] = useState([]);


  let user = {};
  try {
    const u = localStorage.getItem('user');
    if (u && u !== 'undefined' && u !== 'null') {
      user = JSON.parse(u);
    }
  } catch(e) {
    user = {};
  }

  useEffect(function() {
    if (!token) { navigate('/login'); return; }
    fetchRoadmaps();
    fetchStats();
    axios.get('http://localhost:5000/api/stats/progress', {
  headers: { Authorization: 'Bearer ' + token }
})
  .then((res) => setProgress(res.data.progress))
  .catch((err) => console.log(err));

    // Update streak when user visits dashboard
axios.post('http://localhost:5000/api/stats/update-streak', {}, {
  headers: { Authorization: 'Bearer ' + token }
})
  .then((res) => {
    setStats((prev) => ({ ...prev, streak: res.data.streak }));
  })
  .catch((err) => console.log(err));

  }, []);

  function fetchRoadmaps() {
    axios.get('http://localhost:5000/api/roadmaps', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function(res) {
      setRoadmaps(res.data);
    }).catch(function(err) {
      console.log(err);
    });
  }

  function fetchStats() {
    axios.get('http://localhost:5000/api/stats', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function(res) {
      setStats(res.data);
    }).catch(function(err) {
      console.log(err);
    });
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this roadmap?')) return;
    axios.delete('http://localhost:5000/api/roadmaps/' + id, {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function() {
      fetchRoadmaps();
      fetchStats();
    }).catch(function(err) {
      console.log(err);
    });
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  function getProgress(roadmapId) {
    if (!stats || !stats.roadmapProgress) return 0;
    var rp = stats.roadmapProgress.find(function(r) { return r.id === roadmapId; });
    if (!rp || rp.total_tasks === 0) return 0;
    return Math.round((rp.done_tasks / rp.total_tasks) * 100);
  }

  function getProgressColor(percent) {
    if (percent >= 80) return '#22c55e';
    if (percent >= 50) return '#f59e0b';
    return '#3b82f6';
  }

  var filteredRoadmaps = roadmaps.filter(function(r) {
    return r.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'white', padding: '20px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Welcome back, {user.name || 'User'}!</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Track your learning journey</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={function() { navigate('/profile'); }} style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Profile</button>
          <button onClick={function() { navigate('/notifications'); }} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Alerts</button>
          <button onClick={function() { navigate('/feedback'); }} style={{ padding: '8px 16px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Feedback</button>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {/* STATS CARDS */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#3b82f6', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalRoadmaps}</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Total Roadmaps</div>
          </div>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#22c55e', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.completedTasks}</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Tasks Completed</div>
          </div>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#f59e0b', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalTasks}</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Total Tasks</div>
          </div>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#8b5cf6', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.xpPoints} XP</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Level {stats.level}</div>
          </div>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#ef4444', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.streakDays}</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Day Streak</div>
          </div>
          <div style={{ padding: '20px', borderRadius: '12px', background: '#06b6d4', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalModules}</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Total Modules</div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={function() { navigate('/roadmaps'); }} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Roadmap</button>
        <button onClick={function() { navigate('/ai-generator'); }} style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>AI Generate</button>
        <button onClick={function() { navigate('/chat'); }} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>AI Chat</button>
        <button onClick={function() { navigate('/quiz'); }} style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Take Quiz</button>
        <button
  onClick={function() { navigate('/resume'); }}
  style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
  Resume Builder
</button>

      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search roadmaps..."
        value={search}
        onChange={function(e) { setSearch(e.target.value); }}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }}
      />

      {/* RECENT ACTIVITY */}
      {stats && stats.recentActivity && stats.recentActivity.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>Recent Activity</h3>
          {stats.recentActivity.map(function(log, i) {
            return (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '13px' }}>{log.action}</span>
                <span style={{ color: '#64748b', fontSize: '13px' }}>{log.description}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* BADGES */}
      {stats && stats.badges && stats.badges.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1e293b', fontWeight: 'bold' }}>Your Badges</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {stats.badges.map(function(badge, i) {
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '24px' }}>{badge.icon}</span>
                  <span style={{ fontSize: '11px', marginTop: '4px', color: '#475569' }}>{badge.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUIZ PERFORMANCE */}
      {stats && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
  <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b', fontWeight: 'bold' }}>
    Quiz Performance
  </h3>
  <div style={{ display: 'flex', gap: '8px' }}>
    <button
      onClick={function() { navigate('/quiz-performance'); }}
      style={{ padding: '7px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
      View All Results
    </button>
    <button
      onClick={function() { navigate('/quiz'); }}
      style={{ padding: '7px 14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
      Take New Quiz
    </button>
  </div>
</div>


          {stats.quizStats && stats.quizStats.totalAttempts > 0 ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{stats.quizStats.accuracy}%</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Accuracy</div>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.quizStats.totalCorrect}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Correct</div>
                </div>
                <div style={{ background: '#faf5ff', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #d8b4fe' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.quizStats.totalAttempts}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Attempts</div>
                
                </div>
                <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.quizStats.uniqueQuizzes}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Quizzes</div>
                </div>
              </div>

              {stats.recentQuizzes && stats.recentQuizzes.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Recent Answers:</p>
                  {stats.recentQuizzes.map(function(quiz, i) {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '16px' }}>{quiz.is_correct ? 'Correct' : 'Wrong'}</span>
                        <span style={{ fontSize: '13px', color: '#475569', flex: 1 }}>{quiz.question}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(quiz.answered_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
              <p style={{ margin: '0 0 4px', fontWeight: 'bold', color: '#1e293b' }}>No quizzes taken yet!</p>
              <p style={{ margin: '0 0 16px', fontSize: '14px' }}>Take a quiz to test your knowledge!</p>
              <button
                onClick={function() { navigate('/quiz'); }}
                style={{ padding: '10px 24px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Take Your First Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* ROADMAPS LIST */}
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>Your Roadmaps</h2>

      {filteredRoadmaps.length === 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p>No roadmaps yet. Create one or use AI Generator!</p>
          <button
            onClick={function() { navigate('/ai-generator'); }}
            style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Generate with AI
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredRoadmaps.map(function(roadmap) {
          var progress = getProgress(roadmap.id);
          var progressColor = getProgressColor(progress);
          return (
            <div key={roadmap.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', flex: 1 }}>{roadmap.title}</h3>
                <span style={{ padding: '3px 10px', borderRadius: '20px', color: 'white', fontSize: '11px', marginLeft: '8px', background: roadmap.status === 'completed' ? '#22c55e' : roadmap.status === 'paused' ? '#f59e0b' : '#3b82f6' }}>
                  {roadmap.status}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0' }}>
                {roadmap.description || 'No description'}
              </p>
              {roadmap.goal && (
                <p style={{ color: '#8b5cf6', fontSize: '13px', margin: '4px 0' }}>
                  Goal: {roadmap.goal}
                </p>
              )}
              {roadmap.duration && (
                <p style={{ color: '#06b6d4', fontSize: '13px', margin: '4px 0' }}>
                  Duration: {roadmap.duration}
                </p>
              )}
              <div style={{ margin: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Progress</span>
                  <span style={{ color: progressColor, fontWeight: 'bold' }}>{progress}%</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: progress + '%', background: progressColor, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={function() { navigate('/roadmap/' + roadmap.id); }}
                  style={{ flex: 1, padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  View
                </button>
                <button
                  onClick={function() { navigate('/quiz?roadmap=' + roadmap.id + '&title=' + encodeURIComponent(roadmap.title)); }}
                  style={{ flex: 1, padding: '8px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  Quiz
                </button>
                <button
                  onClick={function() { handleDelete(roadmap.id); }}
                  style={{ flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default Dashboard;
