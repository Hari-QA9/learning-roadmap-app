import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Certificate() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const newCert = location.state?.certificate || null;
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('http://localhost:5000/api/evaluation/certificates', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then((res) => {
        setCertificates(res.data.certificates);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  function printCertificate(cert) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Certificate - ${cert.roadmap_title}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Georgia', serif; background: #fff; }
          .cert { width: 800px; margin: 40px auto; padding: 60px; border: 12px double #b8860b; text-align: center; background: linear-gradient(135deg, #fffdf0, #fff9e6); position: relative; }
          .cert::before { content: ''; position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; border: 2px solid #b8860b; pointer-events: none; }
          h1 { font-size: 48px; color: #b8860b; margin: 0 0 8px 0; letter-spacing: 0.05em; }
          h2 { font-size: 18px; color: #64748b; font-weight: normal; margin: 0 0 40px 0; letter-spacing: 0.2em; text-transform: uppercase; }
          .name { font-size: 36px; color: #1e293b; font-weight: bold; margin: 20px 0; border-bottom: 2px solid #b8860b; padding-bottom: 10px; display: inline-block; }
          .course { font-size: 24px; color: #6366f1; font-weight: bold; margin: 16px 0; }
          .desc { font-size: 16px; color: #475569; margin: 24px 0; line-height: 1.8; }
          .certid { font-size: 12px; color: #94a3b8; margin-top: 40px; }
                    .date { font-size: 14px; color: #64748b; margin-top: 8px; }
          .seal { font-size: 64px; margin: 20px 0; }
          .signature { margin-top: 40px; border-top: 1px solid #b8860b; padding-top: 10px; display: inline-block; font-size: 14px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="cert">
          <div class="seal">🏆</div>
          <h1>Certificate</h1>
          <h2>of Completion</h2>
          <p class="desc">This is to certify that</p>
          <div class="name">${cert.user_name}</div>
          <p class="desc">has successfully completed the course</p>
          <div class="course">${cert.roadmap_title}</div>
          <p class="desc">by demonstrating proficiency through module evaluations<br/>and a final comprehensive assessment with a passing score.</p>
          <div class="signature">Learning Roadmap App — Nephilims</div>
          <p class="date">Issued on: ${new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p class="certid">Certificate ID: ${cert.certificate_id}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Loading certificates...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topNav}>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <h2 style={styles.navTitle}>🏆 My Certificates</h2>
        <div></div>
      </div>

      <div style={styles.container}>

        {/* NEW CERTIFICATE BANNER */}
        {newCert && (
          <div style={styles.newCertBanner}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '800', color: '#f1f5f9' }}>
              Congratulations!
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#94a3b8' }}>
              You have earned a certificate for completing <strong style={{ color: '#a5b4fc' }}>{newCert.roadmap_title}</strong>
            </p>
            <button
              style={styles.downloadBtn}
              onClick={() => printCertificate(newCert)}
            >
              🖨️ Print / Download Certificate
            </button>
          </div>
        )}

        {/* CERTIFICATES LIST */}
        {certificates.length === 0 && !newCert ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#f1f5f9' }}>
              No Certificates Yet
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
              Complete a full roadmap and pass all evaluations to earn your certificate!
            </p>
            <button
              style={styles.goRoadmapBtn}
              onClick={() => navigate('/dashboard')}
            >
              Go to My Roadmaps
            </button>
          </div>
        ) : (
          <div>
            <h3 style={styles.sectionTitle}>All Earned Certificates</h3>
            <div style={styles.certGrid}>
              {certificates.map((cert, i) => (
                <div key={i} style={styles.certCard}>
                  <div style={styles.certIcon}>🏆</div>
                  <div style={styles.certInfo}>
                    <h4 style={styles.certTitle}>{cert.roadmap_title}</h4>
                    <p style={styles.certDate}>
                      Issued: {new Date(cert.issued_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                    <p style={styles.certId}>ID: {cert.certificate_id}</p>
                  </div>
                  <button
                    style={styles.printBtn}
                    onClick={() => printCertificate(cert)}
                  >
                    🖨️ Print
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  newCertBanner: {
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    border: '2px solid #b8860b',
    marginBottom: '32px',
    boxShadow: '0 0 40px rgba(184,134,11,0.2)',
  },
  downloadBtn: {
    background: 'linear-gradient(135deg, #b8860b, #d4a017)',
    border: 'none',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '700',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
  },
  goRoadmapBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  certGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  certCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  certIcon: {
    fontSize: '36px',
    flexShrink: 0,
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  certDate: {
    margin: '0 0 2px 0',
    fontSize: '13px',
    color: '#64748b',
  },
  certId: {
    margin: 0,
    fontSize: '11px',
    color: '#475569',
    fontFamily: 'monospace',
  },
  printBtn: {
    background: 'linear-gradient(135deg, #b8860b, #d4a017)',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    flexShrink: 0,
  },
};

