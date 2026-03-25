import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function StudyPlanner() {
  const [goal, setGoal] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('2');
  const [daysPerWeek, setDaysPerWeek] = useState('5');
  const [currentLevel, setCurrentLevel] = useState('beginner');
  const [skills, setSkills] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  function generatePlan() {
    if (!goal.trim()) {
      alert('Please enter your learning goal!');
      return;
    }
    setLoading(true);
    axios.post(
      'http://localhost:5000/api/ai/study-plan',
      { goal, hoursPerDay, daysPerWeek, currentLevel, skills },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setPlan(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  const dayColors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899'];

  return (
    <div style={styles.page}>
      <div style={styles.topNav}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <h2 style={styles.navTitle}>📅 AI Study Planner</h2>
        <div></div>
      </div>

      <div style={styles.container}>
        <div style={styles.layout}>

          {/* INPUT */}
          <div style={styles.inputPanel}>
            <h3 style={styles.panelTitle}>Plan Your Study Schedule</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Learning Goal</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Learn React and become a frontend developer"
                rows={3}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Current Skills</label>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. HTML, CSS, basic JavaScript"
                rows={2}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Current Level</label>
              <select
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                style={styles.select}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hours Per Day</label>
                <select
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                  style={styles.select}
                >
                  {['1','2','3','4','5','6'].map((h) => (
                    <option key={h} value={h}>{h} hours</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Days Per Week</label>
                <select
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(e.target.value)}
                  style={styles.select}
                >
                  {['3','4','5','6','7'].map((d) => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              style={loading ? styles.loadingBtn : styles.planBtn}
              onClick={generatePlan}
              disabled={loading}
            >
              {loading ? '📅 Generating Plan...' : '📅 Generate Study Plan'}
            </button>
          </div>

          {/* RESULT */}
          <div style={styles.resultPanel}>
            {!plan && !loading && (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>📅</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#f1f5f9' }}>
                  AI Study Planner
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.7' }}>
                  Get a personalized weekly study schedule based on your goals,
                  available time, and current skill level.
                </p>
              </div>
            )}

            {loading && (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🤖</div>
                <p style={{ color: '#94a3b8', fontSize: '16px' }}>Creating your personalized plan...</p>
              </div>
            )}

            {plan && (
              <div style={{ padding: '24px' }}>
                <div style={styles.planHeader}>
                  <div>
                    <h3 style={styles.planTitle}>{plan.title}</h3>
                    <p style={styles.planMeta}>
                      ⏱ {plan.totalDuration} &nbsp;|&nbsp;
                      📚 {hoursPerDay} hrs/day &nbsp;|&nbsp;
                      📅 {daysPerWeek} days/week
                    </p>
                  </div>
                </div>

                {plan.overview && (
                  <p style={styles.overview}>{plan.overview}</p>
                )}

                <h4 style={styles.weeklyTitle}>Weekly Schedule</h4>
                <div style={styles.weekGrid}>
                  {(plan.weeklySchedule || []).map((day, i) => (
                    <div key={i} style={{
                      ...styles.dayCard,
                      borderTop: '3px solid ' + dayColors[i % dayColors.length],
                    }}>
                      <p style={{
                        ...styles.dayName,
                        color: dayColors[i % dayColors.length],
                      }}>
                        {day.day}
                      </p>
                      <p style={styles.dayTopic}>{day.topic}</p>
                      <p style={styles.dayTime}>{day.duration}</p>
                      {day.tasks && (
                        <ul style={styles.dayTasks}>
                          {day.tasks.map((task, j) => (
                            <li key={j} style={styles.dayTask}>{task}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {plan.tips && (
                  <div style={styles.tipsBox}>
                    <h4 style={styles.tipsTitle}>💡 Study Tips</h4>
                    <p style={styles.tipsText}>{plan.tips}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#e2e8f0',
  },
  topNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 28px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  container: {
    padding: '32px 28px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '340px 1fr',
    gap: '24px',
  },
  inputPanel: {
    background: '#1e293b',
    borderRadius: '14px',
    padding: '24px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'fit-content',
  },
  panelTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
    formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
  },
  textarea: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: "'Segoe UI', sans-serif",
    lineHeight: '1.6',
  },
  select: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
    width: '100%',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  planBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
  },
  loadingBtn: {
    background: '#475569',
    border: 'none',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '15px',
    fontWeight: '600',
  },
  resultPanel: {
    background: '#1e293b',
    borderRadius: '14px',
    border: '1px solid #334155',
    overflow: 'hidden',
    minHeight: '400px',
  },
  emptyState: {
    padding: '48px 32px',
    textAlign: 'center',
  },
  planHeader: {
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #475569',
  },
  planTitle: {
    margin: '0 0 6px 0',
    fontSize: '18px',
    fontWeight: '800',
    color: '#f1f5f9',
  },
  planMeta: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
  },
  overview: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.7',
    margin: '0 0 20px 0',
    padding: '14px',
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  weeklyTitle: {
    margin: '0 0 14px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  dayCard: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid #334155',
  },
  dayName: {
    margin: '0 0 6px 0',
    fontSize: '13px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dayTopic: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#f1f5f9',
    lineHeight: '1.4',
  },
  dayTime: {
    margin: '0 0 8px 0',
    fontSize: '11px',
    color: '#64748b',
  },
  dayTasks: {
    margin: 0,
    paddingLeft: '16px',
  },
  dayTask: {
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '3px',
    lineHeight: '1.4',
  },
  tipsBox: {
    background: 'rgba(99,102,241,0.1)',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  tipsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#a5b4fc',
  },
  tipsText: {
    margin: 0,
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.7',
  },
};