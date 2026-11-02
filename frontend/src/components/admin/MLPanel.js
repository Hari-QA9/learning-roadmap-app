import React, { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useToast } from '../Toast';
import { Card, Badge, Button, Icon, SkeletonRows, formatDate } from '../ui';

const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
const num = (x, d = 2) => (x === null || x === undefined ? '—' : Number(x).toFixed(d));

/** Admin: the machine-learning features — quit-risk model, at-risk learners, nudge experiment, embeddings, memory models. */
export default function MLPanel() {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get('/admin/ml', { noCache: true }).then((r) => setD(r.data)).catch(() => setD({ error: true })), []);
  useEffect(() => { load(); }, [load]);

  const train = async () => {
    setBusy(true);
    try { const r = await api.post('/admin/ml/quit-risk/train', { days: 120 }, { timeout: 300000 }); toast.success(r.data.message); load(); }
    catch (e) { toast.error(errorMessage(e, 'Training failed')); }
    finally { setBusy(false); }
  };

  if (!d) return <Card className="mt-3"><SkeletonRows rows={4} /></Card>;
  if (d.error) return <Card className="mt-3"><div className="small muted">Could not load ML status.</div></Card>;
  const qr = d.quit_risk;
  const m = qr.model;
  const ex = qr.experiment;
  return (
    <div className="stack-lg mt-3">
      <Card title="Quit-risk model" description="Predicts which active learners will go quiet for the next 14 days, so they get a nudge first."
        actions={<Button size="sm" icon="refresh" loading={busy} onClick={train}>Rebuild &amp; train</Button>}>
        <div className="ml-grid">
          <div><div className="tiny subtle">Model</div><div className="row" style={{ gap: 6 }}><strong>{m.kind === 'baseline' ? 'Baseline (hand-set)' : 'Logistic regression'}</strong>{m.kind !== 'baseline' && <Badge tone="success">Trained</Badge>}</div>{m.trained_at && <div className="tiny subtle">{formatDate(m.trained_at)}</div>}</div>
          <div><div className="tiny subtle">Test AUC</div><strong>{num(m.metrics?.auc)}</strong><div className="tiny subtle">baseline {num(m.metrics?.baseline_auc)} · 0.5 = chance</div></div>
          <div><div className="tiny subtle">Precision, top 20%</div><strong>{pct(m.metrics?.precision_top20)}</strong><div className="tiny subtle">vs. {pct(m.metrics?.base_rate)} base quit rate</div></div>
          <div><div className="tiny subtle">Training data</div><strong>{qr.labelled}</strong><div className="tiny subtle">labelled of {qr.snapshots} snapshots</div></div>
        </div>
        <p className="tiny subtle" style={{ margin: '12px 0 0' }}>
          Retrains weekly once there are 200+ labelled snapshots, and only replaces the current model if it beats chance on the newest days. “Rebuild &amp; train” rebuilds 120 days of history first.
        </p>
      </Card>

      <div className="split">
        <Card title="Learners most at risk" description={qr.day ? `Snapshot of ${formatDate(qr.day)}` : 'No snapshot yet — the scheduler makes one daily'} pad={false}>
          {qr.at_risk.length === 0 ? <div className="list-row small muted">Nobody active in the last 14 days yet.</div> : (
            <div className="list">
              {qr.at_risk.map((r, i) => (
                <div key={i} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div className={`risk-dot ${r.risk >= 60 ? 'high' : r.risk >= 35 ? 'mid' : ''}`}>{r.risk}%</div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 500, color: 'var(--text)' }}>{r.name}</div>
                    <div className="tiny subtle">{r.reasons.length ? r.reasons.join(' · ') : 'steady'} · last active {r.days_since_active === 0 ? 'today' : `${r.days_since_active}d ago`}</div>
                  </div>
                  {r.nudged ? <Badge tone="accent">Nudged</Badge> : r.holdout ? <Badge>Holdout</Badge> : null}
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="stack-lg">
          <Card title="Do nudges help?" description="High-risk learners: nudged vs. a random 10% holdout who never get one">
            <div className="ml-grid two">
              <div><div className="tiny subtle">Nudged — quit rate</div><strong>{pct(ex.nudged.quit_rate)}</strong><div className="tiny subtle">{ex.nudged.n} learners</div></div>
              <div><div className="tiny subtle">Holdout — quit rate</div><strong>{pct(ex.holdout.quit_rate)}</strong><div className="tiny subtle">{ex.holdout.n} learners</div></div>
            </div>
            <p className="tiny subtle" style={{ margin: '10px 0 0' }}>Results appear 14 days after the first nudges. A lower quit rate for nudged learners means the nudges work.</p>
          </Card>
          <Card title="Smart matching & search" description="Meaning-based job matching and Explore search (embeddings)">
            <div className="row small" style={{ gap: 8 }}><Icon name={d.embeddings.enabled ? 'checkCircle' : 'alert'} size={14} style={{ color: d.embeddings.enabled ? 'var(--success)' : 'var(--warning)' }} />{d.embeddings.enabled ? `On · ${d.embeddings.model}` : 'Off — needs GEMINI_API_KEY (keyword matching is used meanwhile)'}</div>
            <div className="tiny subtle mt-1">{d.embeddings.counts.job || 0} job posts · {d.embeddings.counts.roadmap || 0} roadmaps embedded</div>
          </Card>
          <Card title="Personal memory models" description="Review cards scheduled by FSRS, fitted to each member">
            <div className="small"><strong>{d.memory.personalised}</strong> members personalised · <strong>{d.memory.reviews_logged}</strong> reviews logged</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
