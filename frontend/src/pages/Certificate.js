import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, EmptyState, Loading, Icon, formatDate } from '../components/ui';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function printCertificate(cert) {
  const w = window.open('', '_blank');
  if (!w) return false;
  const date = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Certificate — ${esc(cert.roadmap_title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @page { size: landscape; margin: 0; }
    body { margin: 0; font-family: Inter, sans-serif; background: #fff; color: #1a1a19; }
    .cert { width: 1000px; height: 680px; margin: 30px auto; box-sizing: border-box; padding: 64px 80px; border: 1px solid #d4d3ce; position: relative; display: flex; flex-direction: column; }
    .cert::before { content: ''; position: absolute; inset: 14px; border: 1px solid #e6e5e1; pointer-events: none; }
    .brand { font-family: Fraunces, serif; font-size: 20px; }
    .eyebrow { margin-top: 56px; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: #8f8e88; }
    .name { font-family: Fraunces, serif; font-size: 56px; font-weight: 400; margin: 18px 0 6px; letter-spacing: -0.02em; }
    .text { font-size: 16px; color: #5d5c57; line-height: 1.7; max-width: 640px; }
    .course { font-family: Fraunces, serif; font-size: 28px; color: #33409e; margin: 8px 0 0; }
    .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; font-size: 13px; color: #5d5c57; }
    .foot b { display: block; color: #1a1a19; font-weight: 500; margin-bottom: 2px; }
  </style></head><body>
  <div class="cert">
    <div class="brand">LearnMap</div>
    <div class="eyebrow">Certificate of completion</div>
    <div class="name">${esc(cert.user_name)}</div>
    <div class="text">has successfully completed every module and passed the final assessment for</div>
    <div class="course">${esc(cert.roadmap_title)}</div>
    <div class="foot">
      <div><b>${date}</b>Date issued</div>
      <div style="text-align:right"><b>${esc(cert.certificate_id)}</b>Certificate ID</div>
    </div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
  </body></html>`);
  w.document.close();
  return true;
}

function Certificate() {
  const { roadmapId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/evaluation/certificates')
      .then((r) => setCerts(r.data.certificates || []))
      .catch((e) => toast.error(errorMessage(e, 'Could not load certificates')))
      .finally(() => setLoading(false));
  }, [toast]);

  // Show the certificate for this roadmap first.
  const sorted = [...certs].sort((a, b) => (String(b.roadmap_id) === roadmapId) - (String(a.roadmap_id) === roadmapId));

  return (
    <>
      <PageHeader title="Certificates" description="Earned by completing a roadmap and passing its final assessment." />
      {loading ? (
        <Card><Loading /></Card>
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState icon="award" title="No certificates yet" description="Finish every module in a roadmap, pass the assessments, then take the final assessment."
            action={<Button variant="primary" onClick={() => navigate('/roadmaps')}>Go to roadmaps</Button>} />
        </Card>
      ) : (
        <div className="stack-lg">
          {sorted.map((c, i) => {
            const featured = i === 0 && String(c.roadmap_id) === roadmapId;
            return (
              <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: featured ? '48px 48px 36px' : '24px 28px', borderBottom: '1px solid var(--border)', background: featured ? 'var(--surface)' : undefined }}>
                  <div className="tiny subtle" style={{ letterSpacing: '.14em', textTransform: 'uppercase' }}>Certificate of completion</div>
                  <div className="display" style={{ fontSize: featured ? 40 : 24, marginTop: 10, letterSpacing: '-0.02em' }}>{c.user_name}</div>
                  <p className="mt-1">has completed</p>
                  <div className="display text-accent" style={{ fontSize: featured ? 24 : 18, marginTop: 4 }}>{c.roadmap_title}</div>
                </div>
                <div className="row-between row-wrap" style={{ padding: '14px 28px' }}>
                  <div className="row small muted" style={{ gap: 16 }}>
                    <span className="row" style={{ gap: 6 }}><Icon name="calendar" size={14} /> {formatDate(c.issued_at, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="mono tiny">{c.certificate_id}</span>
                  </div>
                  <Button variant={featured ? 'primary' : 'secondary'} size="sm" icon="download" onClick={() => { if (!printCertificate(c)) toast.error('Allow pop-ups to download the certificate'); }}>
                    Download PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default Certificate;
