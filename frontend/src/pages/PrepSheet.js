import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { PageHeader, Card, Button, EmptyState, SkeletonRows, Icon } from '../components/ui';
import { copyText } from '../lib/growth';
import { useToast } from '../components/Toast';

function Section({ title, icon, children }) {
  return (
    <Card>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}><Icon name={icon} size={16} className="text-accent" /><h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2></div>
      {children}
    </Card>
  );
}

/** A one-page interview prep sheet for a specific job. Printable. */
export default function PrepSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/career/docs/${id}`, { noCache: true }).then((r) => setD(r.data)).catch((e) => setError(errorMessage(e, 'Prep sheet not found'))); }, [id]);

  if (error) return <EmptyState icon="file" title="Prep sheet not found" description={error} action={<Button onClick={() => navigate('/interview')}>Back</Button>} />;
  if (!d) return <Card><SkeletonRows rows={6} /></Card>;
  const s = d.data;
  const startMock = () => navigate(d.job_id ? `/interview?job=${d.job_id}` : `/interview?role=${encodeURIComponent(s.role)}&company=${encodeURIComponent(s.company || '')}`);

  return (
    <div className="prep-sheet">
      <PageHeader back="/interview" eyebrow="Interview prep sheet" title={d.title}
        actions={<><Button icon="print" onClick={() => window.print()}>Print</Button><Button variant="primary" icon="play" onClick={startMock}>Practice this interview</Button></>} />
      <div className="stack-lg">
        <Section title="Your 60-second pitch" icon="message">
          <p className="prep-pitch">{s.pitch}</p>
          <Button size="sm" variant="ghost" icon="copy" onClick={async () => { if (await copyText(s.pitch)) toast.success('Copied'); }}>Copy</Button>
        </Section>
        <div className="grid-2">
          <Section title="Strengths to emphasise" icon="zap"><ul className="prep-list">{s.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></Section>
          <Section title="Research before you go" icon="search"><ul className="prep-list">{s.research.map((x, i) => <li key={i}>{x}</li>)}</ul></Section>
        </div>
        <Section title="Likely questions — and how to answer" icon="quiz">
          <div className="stack-sm">
            {s.likely_questions.map((q, i) => (
              <div key={i} className="prep-q">
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{i + 1}. {q.question}</div>
                {q.why && <div className="tiny subtle mt-1">What they’re testing: {q.why}</div>}
                <div className="small mt-1" style={{ color: 'var(--text-2)' }}>{q.outline}</div>
              </div>
            ))}
          </div>
        </Section>
        {s.gaps?.length > 0 && (
          <Section title="Possible gaps — handle them honestly" icon="alert">
            <div className="stack-sm">{s.gaps.map((g, i) => <div key={i}><strong style={{ color: 'var(--text)' }}>{g.gap}</strong><div className="small muted">{g.how_to_address}</div></div>)}</div>
          </Section>
        )}
        <div className="grid-2">
          <Section title="Questions to ask them" icon="send"><ul className="prep-list">{s.questions_to_ask.map((x, i) => <li key={i}>{x}</li>)}</ul></Section>
          <Section title="Your first 90 days" icon="calendar"><ul className="prep-list">{s.first_90_days.map((x, i) => <li key={i}>{x}</li>)}</ul></Section>
        </div>
      </div>
    </div>
  );
}
