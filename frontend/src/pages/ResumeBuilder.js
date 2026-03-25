import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#e2e8f0',
  },
  loadingContainer: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
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
  navActions: {
    display: 'flex',
    gap: '10px',
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
  saveBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  savingBtn: {
    background: '#475569',
    border: 'none',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: '600',
  },
  savedBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  printBtn: {
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  mainLayout: {
    display: 'flex',
    height: 'calc(100vh - 61px)',
    overflow: 'hidden',
  },
  editorPanel: {
    width: '420px',
    minWidth: '380px',
    background: '#1e293b',
    borderRight: '1px solid #334155',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '16px',
    borderBottom: '1px solid #334155',
    background: '#0f172a',
  },
  tab: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
  },
  activeTab: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #6366f1',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  formSection: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  hint: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    color: '#64748b',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginBottom: '14px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
  },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
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
    width: '100%',
  },
  aiBtn: {
    marginTop: '12px',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    border: 'none',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  generatingBtn: {
    marginTop: '12px',
    background: '#475569',
    border: 'none',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: '600',
  },
  skillPreview: {
    marginTop: '12px',
    padding: '12px',
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  previewLabel: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  skillTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  skillTag: {
    background: 'rgba(99,102,241,0.2)',
    color: '#a5b4fc',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  previewPanel: {
    flex: 1,
    overflowY: 'auto',
    background: '#f8fafc',
    padding: '40px',
  },
  resumeHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '24px',
    color: '#fff',
  },
  resumeInitial: {
    width: '64px',
    height: '64px',
    minWidth: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '800',
    color: '#fff',
  },
  resumeName: {
    margin: '0 0 4px 0',
    fontSize: '26px',
    fontWeight: '800',
    color: '#f1f5f9',
  },
  resumeGoal: {
    margin: '0 0 10px 0',
    fontSize: '15px',
    color: '#a5b4fc',
    fontWeight: '500',
  },
  contactRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  contactItem: {
    fontSize: '12px',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.08)',
    padding: '3px 10px',
    borderRadius: '12px',
  },
  resumeBody: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  },
  resumeSection: {
    marginBottom: '24px',
  },
  resumeSectionTitle: {
    margin: '0 0 6px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  resumeDivider: {
    height: '2px',
    background: 'linear-gradient(90deg, #6366f1, transparent)',
    borderRadius: '2px',
    marginBottom: '12px',
  },
  resumeText: {
    margin: 0,
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.7',
  },
  resumeSkillTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  resumeSkillTag: {
    background: '#ede9fe',
    color: '#6d28d9',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #ddd6fe',
  },
  resumePre: {
    margin: 0,
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    fontFamily: "'Segoe UI', sans-serif",
  },
  roadmapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  roadmapItem: {
    fontSize: '13px',
    color: '#475569',
    padding: '6px 12px',
    background: '#f1f5f9',
    borderRadius: '6px',
    borderLeft: '3px solid #6366f1',
  },
  badgeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  badge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #fde68a',
  },
};

export default function ResumeBuilder() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [template, setTemplate] = useState('modern');
const [atsResult, setAtsResult] = useState(null);
const [atsChecking, setAtsChecking] = useState(false);

  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [goal, setGoal] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await axios.get('http://localhost:5000/api/resume', {
          headers: { Authorization: 'Bearer ' + token }
        });
        setUserData(profileRes.data);
        setName(profileRes.data.user?.name || '');
        setEmail(profileRes.data.user?.email || '');

        const resumeRes = await axios.get('http://localhost:5000/api/resume/saved', {
          headers: { Authorization: 'Bearer ' + token }
        });
        
        if (resumeRes.data.resume) {
          const r = resumeRes.data.resume;
          setPhone(r.phone || '');
          setUserLocation(r.location || '');
          setLinkedin(r.linkedin || '');
          setGithub(r.github || '');
          setSummary(r.summary || '');
          setSkills(r.skills || '');
          setExperience(r.experience || '');
          setEducation(r.education || '');
          setGoal(r.goal || '');
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  function generateSummary() {
    if (!skills.trim()) {
      alert('Please enter your skills first!');
      return;
    }
    setGenerating(true);
    axios.post(
      'http://localhost:5000/api/resume/generate-summary',
      { skills, experience, goal },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setSummary(res.data.summary);
      })
      .catch((err) => console.error(err))
      .finally(() => setGenerating(false));
  }

  function saveResume() {
    setSaving(true);
    axios.post(
      'http://localhost:5000/api/resume/save',
      {
        resume_data: {
          name, email, phone,
          location: userLocation,
          linkedin, github, summary,
          skills, experience, education, goal
        }
      },
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch((err) => console.error(err))
      .finally(() => setSaving(false));
  }

  const [score, setScore] = useState(null);
const [scoring, setScoring] = useState(false);

function generateScore() {
  if (!summary && !skills && !experience) {
    alert('Please fill in at least summary, skills, and experience first!');
    return;
  }
  setScoring(true);
  axios.post(
    'http://localhost:5000/api/resume/score',
    { name, summary, skills, experience, education, goal },
    { headers: { Authorization: 'Bearer ' + token } }
  )
    .then((res) => {
      setScore(res.data);
      setScoring(false);
    })
    .catch(() => setScoring(false));
}

function downloadPDF() {
  const element = document.getElementById('resume-preview');
  const options = {
    margin: 10,
    filename: (name || 'resume') + '_resume.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  const html2pdf = require('html2pdf.js');
  html2pdf().set(options).from(element).save();
}

function checkATS() {
  if (!skills.trim() || !experience.trim()) {
    alert('Please fill in skills and experience first!');
    return;
  }
  setAtsChecking(true);
  axios.post(
    'http://localhost:5000/api/resume/ats-check',
    { name, summary, skills, experience, education, goal },
    { headers: { Authorization: 'Bearer ' + token } }
  )
    .then((res) => {
      setAtsResult(res.data);
      setAtsChecking(false);
    })
    .catch(() => setAtsChecking(false));
}




  const skillsList = skills
    ? skills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const allRoadmaps = userData?.allRoadmaps || [];
  const badges = userData?.badges || [];
  const sections = ['personal', 'summary', 'skills', 'experience', 'education'];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>
          Loading Resume Builder...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topNav}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          Back
        </button>
        <h2 style={styles.navTitle}>Resume Builder</h2>
        <div style={styles.navActions}>
          <button style={styles.printBtn} onClick={() => window.print()}>
            Print PDF
</button>

<button
  style={{
    background: atsChecking
      ? '#475569'
      : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  }}
  onClick={checkATS}
  disabled={atsChecking}
>
  {atsChecking ? 'Checking...' : 'ATS Check'}
</button>

            <button
  style={{
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  }}
  onClick={downloadPDF}
>
  Download PDF
</button>

            <button
  style={{
    background: scoring
      ? '#475569'
      : 'linear-gradient(135deg, #f59e0b, #ef4444)',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  }}
  onClick={generateScore}
  disabled={scoring}
>
  {scoring ? 'Scoring...' : 'Score My Resume'}
</button>

          
          <button
            style={
              saved ? styles.savedBtn : saving ? styles.savingBtn : styles.saveBtn
            }
            onClick={saveResume}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Resume'}
          </button>
        </div>
      </div>

      {score && (
  <div style={{
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '16px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: score.score >= 80
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : score.score >= 60
          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
          : 'linear-gradient(135deg, #ef4444, #dc2626)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: '800',
        color: '#fff',
        flexShrink: 0,
      }}>
        {score.score}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>
          Resume Score
        </p>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          {score.score >= 80 ? 'Excellent!' : score.score >= 60 ? 'Good, needs improvement' : 'Needs work'}
        </p>
      </div>
    </div>

    <div style={{ flex: 1 }}>
      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
        Tips to Improve:
      </p>
      <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
        {score.tips}
      </p>
    </div>

    <button
      onClick={() => setScore(null)}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        fontSize: '18px',
      }}
    >
      ✕
    </button>
  </div>
)}

{atsResult && (
  <div style={{
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '20px 28px',
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>
        ATS Compatibility Report
      </h3>
      <button
        onClick={() => setAtsResult(null)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '18px',
        }}
      >
        ✕
      </button>
    </div>

    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

      {/* ATS SCORE */}
      <div style={{
        background: '#0f172a',
        borderRadius: '10px',
        padding: '16px 20px',
        minWidth: '140px',
        textAlign: 'center',
        border: '1px solid #334155',
      }}>
        <div style={{
          fontSize: '36px',
          fontWeight: '800',
          color: atsResult.atsScore >= 80
            ? '#10b981'
            : atsResult.atsScore >= 60
            ? '#f59e0b'
            : '#ef4444',
        }}>
          {atsResult.atsScore}%
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          ATS Score
        </p>
      </div>

      {/* KEYWORDS FOUND */}
      <div style={{
        background: '#0f172a',
        borderRadius: '10px',
        padding: '16px 20px',
        flex: 1,
        border: '1px solid #334155',
        minWidth: '200px',
      }}>
        <p style={{
          margin: '0 0 10px 0',
          fontSize: '12px',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: '600',
        }}>
          Keywords Found
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(atsResult.keywordsFound || []).map((kw, i) => (
            <span key={i} style={{
              background: 'rgba(16,185,129,0.15)',
              color: '#10b981',
              padding: '3px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* KEYWORDS MISSING */}
      <div style={{
        background: '#0f172a',
        borderRadius: '10px',
        padding: '16px 20px',
        flex: 1,
        border: '1px solid #334155',
        minWidth: '200px',
      }}>
        <p style={{
          margin: '0 0 10px 0',
          fontSize: '12px',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: '600',
        }}>
          Keywords Missing
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(atsResult.keywordsMissing || []).map((kw, i) => (
            <span key={i} style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              padding: '3px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              border: '1px solid rgba(239,68,68,0.3)',
            }}>
              {kw}
            </span>
          ))}
        </div>
      </div>

    </div>

    {/* SUGGESTIONS */}
    {atsResult.suggestions && (
      <div style={{
        marginTop: '14px',
        background: '#0f172a',
        borderRadius: '10px',
        padding: '16px 20px',
        border: '1px solid #334155',
      }}>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: '600',
        }}>
          Suggestions to Improve ATS Score
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.7' }}>
          {atsResult.suggestions}
        </p>
      </div>
    )}
  </div>
)}


      <div style={styles.mainLayout}>
        <div style={styles.editorPanel}>
            {/* TEMPLATE SELECTOR */}
<div style={{
  padding: '16px',
  borderBottom: '1px solid #334155',
  background: '#0f172a',
}}>
  <p style={{
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600',
  }}>
    Choose Template
  </p>
  <div style={{ display: 'flex', gap: '8px' }}>
    {[
      { id: 'modern', label: 'Modern', color: '#6366f1' },
      { id: 'classic', label: 'Classic', color: '#475569' },
      { id: 'creative', label: 'Creative', color: '#10b981' },
    ].map((t) => (
      <button
        key={t.id}
        onClick={() => setTemplate(t.id)}
        style={{
          flex: 1,
          padding: '8px 4px',
          borderRadius: '8px',
          border: template === t.id
            ? '2px solid ' + t.color
            : '2px solid #334155',
          background: template === t.id
            ? t.color + '22'
            : 'transparent',
          color: template === t.id ? t.color : '#64748b',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600',
          transition: 'all 0.2s',
        }}
      >
        {t.label}
      </button>
    ))}
  </div>
</div>

          <div style={styles.sectionTabs}>
            {sections.map((sec) => (
              <button
                key={sec}
                style={activeSection === sec ? styles.activeTab : styles.tab}
                onClick={() => setActiveSection(sec)}
              >
                {sec.charAt(0).toUpperCase() + sec.slice(1)}
              </button>
            ))}
          </div>

          {activeSection === 'personal' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Personal Information</h3>
              {[
                { label: 'Full Name', val: name, fn: setName, type: 'text', placeholder: 'John Doe' },
                { label: 'Email', val: email, fn: setEmail, type: 'email', placeholder: 'john@email.com' },
                { label: 'Phone', val: phone, fn: setPhone, type: 'text', placeholder: '+1 (555) 000-0000' },
                { label: 'Location', val: userLocation, fn: setUserLocation, type: 'text', placeholder: 'City, State' },
                { label: 'LinkedIn URL', val: linkedin, fn: setLinkedin, type: 'text', placeholder: 'linkedin.com/in/yourname' },
                { label: 'GitHub URL', val: github, fn: setGithub, type: 'text', placeholder: 'github.com/yourname' },
                { label: 'Career Goal', val: goal, fn: setGoal, type: 'text', placeholder: 'e.g. Full Stack Developer' },
              ].map((f, i) => (
                <div key={i} style={styles.formGroup}>
                  <label style={styles.label}>{f.label}</label>
                  <input
                    type={f.type}
                    value={f.val}
                    placeholder={f.placeholder}
                    onChange={(e) => f.fn(e.target.value)}
                    style={styles.input}
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === 'summary' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Professional Summary</h3>
              <p style={styles.hint}>
                Fill in your skills first, then click Generate with AI.
              </p>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Write your summary or click Generate with AI..."
                style={styles.textarea}
                rows={6}
              />
              <button
                style={generating ? styles.generatingBtn : styles.aiBtn}
                onClick={generateSummary}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          )}

          {activeSection === 'skills' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Skills</h3>
              <p style={styles.hint}>Enter skills separated by commas.</p>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Node.js, MySQL, Python, Git..."
                style={styles.textarea}
                rows={5}
              />
              {skillsList.length > 0 && (
                <div style={styles.skillPreview}>
                  <p style={styles.previewLabel}>Preview:</p>
                  <div style={styles.skillTags}>
                    {skillsList.map((skill, i) => (
                      <span key={i} style={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'experience' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Work Experience</h3>
              <p style={styles.hint}>
                Add each job on a new line. Example: Company | Role | Year
              </p>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder={
                  'Google | Software Engineer Intern | 2024\n- Built REST APIs\n- Improved performance by 30%'
                }
                style={styles.textarea}
                rows={10}
              />
            </div>
          )}

          {activeSection === 'education' && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Education</h3>
              <p style={styles.hint}>
                Add your degrees and certifications.
              </p>
              <textarea
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder={
                  'Masters in Computer Science | NJIT | 2024\nBachelors in IT | XYZ University | 2022'
                }
                style={styles.textarea}
                rows={6}
              />
            </div>
          )}
        </div>
<div style={styles.previewPanel} id="resume-preview">

  {/* ── MODERN TEMPLATE ── */}
  {template === 'modern' && (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '20px',
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '24px',
      }}>
        <div style={styles.resumeInitial}>
          {name ? name.charAt(0).toUpperCase() : 'Y'}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={styles.resumeName}>{name || 'Your Name'}</h1>
          <p style={styles.resumeGoal}>{goal || 'Career Goal'}</p>
          <div style={styles.contactRow}>
            {email && <span style={styles.contactItem}>{email}</span>}
            {phone && <span style={styles.contactItem}>{phone}</span>}
            {userLocation && <span style={styles.contactItem}>{userLocation}</span>}
            {linkedin && <span style={styles.contactItem}>{linkedin}</span>}
            {github && <span style={styles.contactItem}>{github}</span>}
          </div>
        </div>
      </div>
      <div style={styles.resumeBody}>
        {summary && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeSectionTitle}>Professional Summary</h3>
            <div style={styles.resumeDivider}></div>
            <p style={styles.resumeText}>{summary}</p>
          </div>
        )}
        {skillsList.length > 0 && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeSectionTitle}>Technical Skills</h3>
            <div style={styles.resumeDivider}></div>
            <div style={styles.resumeSkillTags}>
              {skillsList.map((skill, i) => (
                <span key={i} style={styles.resumeSkillTag}>{skill}</span>
              ))}
            </div>
          </div>
        )}
        {experience && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeSectionTitle}>Work Experience</h3>
            <div style={styles.resumeDivider}></div>
            <pre style={styles.resumePre}>{experience}</pre>
          </div>
        )}
        {education && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeSectionTitle}>Education</h3>
            <div style={styles.resumeDivider}></div>
            <pre style={styles.resumePre}>{education}</pre>
          </div>
        )}
        {allRoadmaps.length > 0 && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeSectionTitle}>Learning Roadmaps</h3>
            <div style={styles.resumeDivider}></div>
            <div style={styles.roadmapList}>
              {allRoadmaps.map((r, i) => (
                <div key={i} style={styles.roadmapItem}>{r.title}</div>
              ))}
            </div>
          </div>
        )}
        {badges.length > 0 && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeSectionTitle}>Achievements</h3>
            <div style={styles.resumeDivider}></div>
            <div style={styles.badgeList}>
              {badges.map((b, i) => (
                <span key={i} style={styles.badge}>{b.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )}

  {/* ── CLASSIC TEMPLATE ── */}
  {template === 'classic' && (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '40px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      color: '#1e293b',
    }}>
      <div style={{
        textAlign: 'center',
        borderBottom: '3px double #1e293b',
        paddingBottom: '20px',
        marginBottom: '24px',
      }}>
        <h1 style={{
          margin: '0 0 6px 0',
          fontSize: '30px',
          fontWeight: '800',
          color: '#0f172a',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {name || 'Your Name'}
        </h1>
        <p style={{
          margin: '0 0 10px 0',
          fontSize: '14px',
          color: '#475569',
          fontWeight: '500',
        }}>
          {goal || 'Career Goal / Job Title'}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '13px',
          color: '#475569',
        }}>
          {email && <span>{email}</span>}
          {phone && <span>{phone}</span>}
          {userLocation && <span>{userLocation}</span>}
          {linkedin && <span>{linkedin}</span>}
          {github && <span>{github}</span>}
        </div>
      </div>

      {summary && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#0f172a',
            margin: '0 0 8px 0',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '4px',
          }}>
            Professional Summary
          </h3>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: 0 }}>
            {summary}
          </p>
        </div>
      )}

      {skillsList.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#0f172a',
            margin: '0 0 8px 0',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '4px',
          }}>
            Skills
          </h3>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
            {skillsList.join(' • ')}
          </p>
        </div>
      )}

      {experience && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#0f172a',
            margin: '0 0 8px 0',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '4px',
          }}>
            Work Experience
          </h3>
          <pre style={{
            fontSize: '13px',
            color: '#475569',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            fontFamily: "'Segoe UI', sans-serif",
            margin: 0,
          }}>
            {experience}
          </pre>
        </div>
      )}

      {education && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#0f172a',
            margin: '0 0 8px 0',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '4px',
          }}>
            Education
          </h3>
          <pre style={{
            fontSize: '13px',
            color: '#475569',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            fontFamily: "'Segoe UI', sans-serif",
            margin: 0,
          }}>
            {education}
          </pre>
        </div>
      )}

      {allRoadmaps.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#0f172a',
            margin: '0 0 8px 0',
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '4px',
          }}>
            Learning Roadmaps
          </h3>
          {allRoadmaps.map((r, i) => (
            <p key={i} style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>
              • {r.title}
            </p>
          ))}
        </div>
      )}
    </div>
  )}

  {/* ── CREATIVE TEMPLATE ── */}
  {template === 'creative' && (
    <div style={{
      display: 'flex',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
      minHeight: '600px',
    }}>
      {/* LEFT SIDEBAR */}
      <div style={{
        width: '35%',
        background: 'linear-gradient(180deg, #10b981, #059669)',
        padding: '32px 24px',
        color: '#fff',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: '800',
          marginBottom: '16px',
          border: '3px solid rgba(255,255,255,0.4)',
        }}>
          {name ? name.charAt(0).toUpperCase() : 'Y'}
        </div>

        <h1 style={{
          margin: '0 0 4px 0',
          fontSize: '22px',
          fontWeight: '800',
          lineHeight: '1.2',
        }}>
          {name || 'Your Name'}
        </h1>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '13px',
          opacity: 0.85,
          fontWeight: '500',
        }}>
          {goal || 'Career Goal'}
        </p>

        <div style={{ marginBottom: '24px' }}>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            opacity: 0.7,
            fontWeight: '700',
          }}>
            Contact
          </p>
          {email && <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.9 }}>{email}</p>}
          {phone && <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.9 }}>{phone}</p>}
          {userLocation && <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.9 }}>{userLocation}</p>}
          {linkedin && <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.9 }}>{linkedin}</p>}
          {github && <p style={{ margin: '4px 0', fontSize: '12px', opacity: 0.9 }}>{github}</p>}
        </div>

        {skillsList.length > 0 && (
          <div>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: 0.7,
              fontWeight: '700',
            }}>
              Skills
            </p>
            {skillsList.map((skill, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', opacity: 0.9 }}>{skill}</p>
                <div style={{
                  height: '4px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                }}>
                  <div style={{
                    height: '4px',
                    width: '80%',
                    background: '#fff',
                    borderRadius: '2px',
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT CONTENT */}
      <div style={{
        flex: 1,
        background: '#fff',
        padding: '32px 28px',
      }}>
        {summary && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#10b981',
            }}>
              About Me
            </h3>
            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, #10b981, transparent)',
              marginBottom: '10px',
              borderRadius: '2px',
            }}></div>
            <p style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: '1.7',
              margin: 0,
            }}>
              {summary}
            </p>
          </div>
        )}

        {experience && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#10b981',
            }}>
              Work Experience
            </h3>
            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, #10b981, transparent)',
              marginBottom: '10px',
              borderRadius: '2px',
            }}></div>
            <pre style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Segoe UI', sans-serif",
              margin: 0,
            }}>
              {experience}
            </pre>
          </div>
        )}

        {education && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#10b981',
            }}>
              Education
            </h3>
            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, #10b981, transparent)',
              marginBottom: '10px',
              borderRadius: '2px',
            }}></div>
            <pre style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Segoe UI', sans-serif",
              margin: 0,
            }}>
              {education}
            </pre>
          </div>
        )}

        {allRoadmaps.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#10b981',
            }}>
              Learning Roadmaps
            </h3>
            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, #10b981, transparent)',
              marginBottom: '10px',
              borderRadius: '2px',
            }}></div>
            {allRoadmaps.map((r, i) => (
              <p key={i} style={{
                margin: '4px 0',
                fontSize: '13px',
                color: '#475569',
              }}>
                • {r.title}
              </p>
            ))}
          </div>
        )}

        {badges.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#10b981',
            }}>
              Achievements
            </h3>
            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, #10b981, transparent)',
              marginBottom: '10px',
              borderRadius: '2px',
            }}></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {badges.map((b, i) => (
                <span key={i} style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: '1px solid #a7f3d0',
                }}>
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )}

</div>

      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            box-shadow: none;
            padding: 0;
          }
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}