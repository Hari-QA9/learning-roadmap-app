import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [importing, setImporting] = useState(null);
  const [imported, setImported] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('http://localhost:5000/api/templates', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then((res) => setTemplates(res.data.templates))
      .catch((err) => console.log(err));
  }, [token]);

  function importTemplate(id) {
    setImporting(id);
    axios.post(
      `http://localhost:5000/api/templates/import/${id}`,
      {},
      { headers: { Authorization: 'Bearer ' + token } }
    )
      .then((res) => {
        setImported(id);
        setImporting(null);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      })
      .catch(() => setImporting(null));
  }

  return (
    <div style={styles.page}>
      <div style={styles.topNav}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <h2 style={styles.navTitle}>📋 Roadmap Templates</h2>
        <div></div>
      </div>

      <div style={styles.container}>
        <p style={styles.subtitle}>
          Choose a pre-built roadmap template and import it to your dashboard instantly
        </p>

        <div style={styles.grid}>
          {templates.map((t) => (
            <div key={t.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.icon}>{t.icon}</span>
                <div>
                  <h3 style={styles.cardTitle}>{t.title}</h3>
                  <span style={styles.duration}>⏱ {t.duration}</span>
                </div>
              </div>

              <p style={styles.cardDesc}>{t.description}</p>

              <div style={styles.moduleList}>
                {t.modules.slice(0, 3).map((m, i) => (
                  <div key={i} style={styles.moduleItem}>
                    <span style={styles.moduleDot}></span>
                    <span style={styles.moduleTitle}>{m.title}</span>
                    <span style={styles.taskCount}>{m.tasks.length} tasks</span>
                  </div>
                ))}
                {t.modules.length > 3 && (
                  <p style={styles.moreModules}>
                    +{t.modules.length - 3} more modules
                  </p>
                )}
              </div>

              <button
                style={
                  imported === t.id
                    ? styles.importedBtn
                    : importing === t.id
                    ? styles.importingBtn
                    : styles.importBtn
                }
                onClick={() => importTemplate(t.id)}
                disabled={importing === t.id || imported === t.id}
              >
                {imported === t.id
                  ? '✅ Imported! Redirecting...'
                  : importing === t.id
                  ? 'Importing...'
                  : '⬇️ Import Template'}
              </button>
            </div>
          ))}
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
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '15px',
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#1e293b',
    borderRadius: '14px',
    padding: '24px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
    icon: {
    fontSize: '40px',
    flexShrink: 0,
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  duration: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  cardDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.6',
  },
  moduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #334155',
  },
  moduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  moduleDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#6366f1',
    flexShrink: 0,
  },
  moduleTitle: {
    fontSize: '13px',
    color: '#e2e8f0',
    flex: 1,
  },
  taskCount: {
    fontSize: '11px',
    color: '#64748b',
    background: '#1e293b',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  moreModules: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#6366f1',
    fontWeight: '600',
  },
  importBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: 'auto',
  },
  importingBtn: {
    background: '#475569',
    border: 'none',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: 'auto',
  },
  importedBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: 'auto',
  },
};

