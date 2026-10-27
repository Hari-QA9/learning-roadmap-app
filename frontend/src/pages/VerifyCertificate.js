import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';
import PublicLayout from '../components/growth/PublicLayout';
import { Icon, Loading, formatDate } from '../components/ui';

export default function VerifyCertificate() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.get(`/public/certificates/${encodeURIComponent(id)}`, { noCache: true })
      .then((r) => { setC(r.data); document.title = `Certificate ${r.data.certificate_id} · LearnMap`; })
      .catch(() => setMissing(true));
    return () => { document.title = 'LearnMap'; };
  }, [id]);

  return (
    <PublicLayout>
      <div className="verify card">
        {!c && !missing && <Loading />}
        {missing && (
          <>
            <div className="verify-icon bad"><Icon name="xCircle" size={28} /></div>
            <h1>Certificate not found</h1>
            <p className="muted">No LearnMap certificate has the ID <code>{id}</code>. Check the ID was typed exactly as printed.</p>
          </>
        )}
        {c && (
          <>
            <div className="verify-icon ok"><Icon name="checkCircle" size={28} /></div>
            <div className="tiny subtle" style={{ letterSpacing: '.14em', textTransform: 'uppercase' }}>Verified certificate</div>
            <h1>{c.name}</h1>
            <p className="muted" style={{ margin: 0 }}>completed every module and passed the final assessment for</p>
            <div className="verify-course">{c.roadmap_title}</div>
            <div className="verify-meta">
              <div><span>Issued</span><strong>{formatDate(c.issued_at, { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
              <div><span>Certificate ID</span><strong className="mono">{c.certificate_id}</strong></div>
            </div>
            {c.username && <Link className="btn btn-secondary mt-2" to={`/u/${c.username}`}>View {c.name.split(' ')[0]}’s profile</Link>}
            <p className="tiny subtle mt-2">LearnMap certificates show completion of a learning roadmap on LearnMap. They are not accredited qualifications.</p>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
