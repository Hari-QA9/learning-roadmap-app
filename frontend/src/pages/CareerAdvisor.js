import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CareerAdvisor() {
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [interests, setInterests] = useState('');
  const [education, setEducation] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  function getAdvice() {
    if (!skills.trim()) {
      alert('Please enter your skills first!');
      return;
    }
    
    setLoading(true);
    axios.post(
      'http://localhost:5000/api/ai/career-advice',
      { skills, experience, interests, education },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setResult(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching advice:", err);
        setLoading(false);
      });
  }

  return (
    <div style={styles.page}>
      <div style={styles.topNav}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <h2 style={styles.navTitle}>🎯 AI Career Advisor</h2>
        <div></div>
      </div>

      <div style={styles.container}>
        <div style={styles.layout}>

          {/* INPUT PANEL */}
          <div style={styles.inputPanel}>
            <h3 style={styles.panelTitle}>Tell Us About Yourself</h3>

            {[
              { label: 'Your Skills', val: skills, fn: setSkills, placeholder: 'React, Python, SQL, Machine Learning...', rows: 3 },
              { label: 'Years of Experience', val: experience, fn: setExperience, placeholder: 'e.g. 2 years as a web developer intern', rows: 2 },
              { label: 'Interests & Passions', val: interests, fn: setInterests, placeholder: 'e.g. I love building apps, working with AI...', rows: 2 },
              { label: 'Education', val: education, fn: setEducation, placeholder: 'e.g. Masters in Computer Science', rows: 2 },
            ].map((f, i) => (
              <div key={i} style={styles.formGroup}>
                <label style={styles.label}>{f.label}</label>
                <textarea
                  value={f.val}
                  onChange={(e) => f.fn(e.target.value)}
                  placeholder={f.placeholder}
                  rows={f.rows}
                  style={styles.textarea}
                />
              </div>
            ))}

            <button
              style={loading ? styles.loadingBtn : styles.adviceBtn}
              onClick={getAdvice}
              disabled={loading}
            >
              {loading ? '🤖 Analyzing...' : '🎯 Get Career Advice'}
            </button>
          </div>

          {/* RESULT PANEL */}
          <div style={styles.resultPanel}>
            {!result && !loading && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎯</div>
                <h3 style={styles.emptyTitle}>AI Career Advisor</h3>
                <p style={styles.emptyText}>
                  Fill in your details and get personalized career advice,
                  job recommendations, and skill gap analysis powered by AI.
                </p>
                <div style={styles.featureList}>
                  {[
                    '💼 Top job roles that match your profile',
                    '📈 Salary ranges for your skills',
                    '🔧 Skills you need to learn next',
                    '🗺️ Recommended learning roadmaps',
                    '🏢 Companies that hire for your profile',
                  ].map((f, i) => (
                    <div key={i} style={styles.featureItem}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div style={styles.loadingState}>
                <div style={styles.emptyIcon}>🤖</div>
                <p style={{ color: '#94a3b8', fontSize: '16px' }}>
                  AI is analyzing your profile...
                </p>
              </div>
            )}

            {result && (
              <div style={styles.resultContent}>

                {/* TOP ROLES */}
                {result.roles && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>💼 Best Career Roles For You</h3>
                    <div style={styles.rolesGrid}>
                      {result.roles.map((role, i) => (
                        <div key={i} style={styles.roleCard}>
                          <p style={styles.roleName}>{role.title}</p>
                          <p style={styles.roleSalary}>{role.salary}</p>
                          <p style={styles.roleMatch}>
                            <span style={{
                              color: role.match >= 80 ? '#10b981' : role.match >= 60 ? '#f59e0b' : '#ef4444',
                              fontWeight: '700',
                            }}>
                              {role.match}% match
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SKILL GAPS */}
                {result.skillGaps && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>🔧 Skills to Learn Next</h3>
                    <div style={styles.tagRow}>
                      {result.skillGaps.map((skill, i) => (
                        <span key={i} style={styles.skillGapTag}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* COMPANIES */}
                {result.companies && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>🏢 Companies That Hire You</h3>
                    <div style={styles.tagRow}>
                      {result.companies.map((c, i) => (
                        <span key={i} style={styles.companyTag}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ADVICE */}
                {result.advice && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>💡 Personalized Advice</h3>
                    <p style={styles.adviceText}>{result.advice}</p>
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
    gridTemplateColumns: '380px 1fr',
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
  adviceBtn: {
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
  },
  emptyState: {
    padding: '48px 32px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '56px',
    marginBottom: '16px',
  },
  emptyTitle: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  emptyText: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.7',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
    maxWidth: '320px',
    margin: '0 auto',
  },
    featureItem: {
    fontSize: '14px',
    color: '#94a3b8',
    padding: '10px 14px',
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  loadingState: {
    padding: '48px 32px',
    textAlign: 'center',
  },
  resultContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '18px',
    border: '1px solid #334155',
  },
  sectionTitle: {
    margin: '0 0 14px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  },
  roleCard: {
    background: '#1e293b',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  roleName: {
    margin: '0 0 6px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  roleSalary: {
    margin: '0 0 6px 0',
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '600',
  },
  roleMatch: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  skillGapTag: {
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    padding: '5px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    border: '1px solid rgba(239,68,68,0.3)',
    fontWeight: '500',
  },
  companyTag: {
    background: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    padding: '5px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    border: '1px solid rgba(99,102,241,0.3)',
    fontWeight: '500',
  },
  adviceText: {
    margin: 0,
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.8',
  },
};