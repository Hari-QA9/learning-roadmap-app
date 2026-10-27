import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Card, Button, Field, Input, Textarea, Ring, Icon, Loading, SkeletonRows, timeAgo } from '../components/ui';
import { copyText } from '../lib/growth';

function CopyBox({ text, label = 'Copy' }) {
  const toast = useToast();
  return (
    <div className="copy-box">
      <div className="grow" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
      <Button size="sm" variant="ghost" icon="copy" aria-label={label} onClick={async () => { if (await copyText(text)) toast.success('Copied'); }} />
    </div>
  );
}

/** LinkedIn profile helper: headline options, About section, rewritten bullets, skills and a checklist. */
export default function LinkedInHelper() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [result, setResult] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/career/linkedin', { noCache: true }).then((r) => {
      const s = r.data.saved;
      setForm(s ? s.data.inputs : { target_role: r.data.prefill.target_role, headline: r.data.prefill.headline, about: r.data.prefill.about });
      if (s) { setResult(s.data.result); setSavedAt(s.updated_at); }
    }).catch(() => setForm({ target_role: '', headline: '', about: '' }));
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.post('/career/linkedin', form, { timeout: 120000 });
      setResult(r.data.result); setSavedAt(new Date().toISOString());
      toast.success('Your LinkedIn makeover is ready');
    } catch (e) { toast.error(errorMessage(e, 'Could not review your profile')); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader eyebrow="Career" title="LinkedIn helper" description="Recruiters search LinkedIn by keywords. Get a headline, About section and skills that put you in front of them — based on your real resume." />
      <div className="split">
        <Card title="Your profile today" description="We pre-filled this from your resume. Paste what’s on LinkedIn now for a sharper review.">
          {!form ? <SkeletonRows rows={4} /> : busy ? <Loading label="Reviewing your profile like a recruiter…" /> : (
            <div className="stack-sm">
              <Field label="Role you’re aiming for"><Input value={form.target_role} onChange={set('target_role')} placeholder="e.g. QA Automation Engineer, Clinical Research Coordinator" /></Field>
              <Field label="Current headline" optional><Input value={form.headline} onChange={set('headline')} placeholder="The line under your name" /></Field>
              <Field label="Current About section" optional><Textarea rows={6} value={form.about} onChange={set('about')} /></Field>
              <Button variant="primary" icon="sparkles" disabled={!form.target_role?.trim()} onClick={run}>{result ? 'Review again' : 'Improve my profile'}</Button>
              {savedAt && <div className="tiny subtle">Last review {timeAgo(savedAt)}</div>}
            </div>
          )}
        </Card>

        {result ? (
          <div className="stack-lg">
            <Card>
              <div className="row" style={{ gap: 16 }}>
                <Ring value={result.score} size={72} stroke={7} tone={result.score >= 75 ? 'success' : result.score >= 50 ? 'accent' : 'warning'} label={`${result.score}`} />
                <div><div style={{ fontWeight: 600, fontSize: 17, color: 'var(--text)' }}>Profile strength for “{form.target_role}”</div><div className="small muted">Use the suggestions below to raise it — most take 2 minutes.</div></div>
              </div>
            </Card>
            <Card title="Headline options" description="Pick one — it’s the most searched part of your profile.">
              <div className="stack-sm">{result.headlines.map((h, i) => <CopyBox key={i} text={h} label="Copy headline" />)}</div>
            </Card>
            <Card title="About section"><CopyBox text={result.about} label="Copy About section" /></Card>
            {result.experience_bullets?.length > 0 && (
              <Card title="Experience bullets">
                <div className="stack-sm">
                  {result.experience_bullets.map((e, i) => (
                    <div key={i}><div className="small" style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{e.role}</div><CopyBox text={e.bullets.map((b) => `• ${b}`).join('\n')} label={`Copy bullets for ${e.role}`} /></div>
                  ))}
                </div>
              </Card>
            )}
            <Card title="Skills to list" actions={<Button size="sm" variant="ghost" icon="copy" onClick={async () => { if (await copyText(result.skills.join(', '))) toast.success('Skills copied'); }}>Copy all</Button>}>
              <div className="row row-wrap" style={{ gap: 6 }}>{result.skills.map((s) => <span key={s} className="skill">{s}</span>)}</div>
            </Card>
            {result.checklist?.length > 0 && (
              <Card title="Quick wins" pad={false}>
                <div className="list">
                  {result.checklist.map((c, i) => (
                    <label key={i} className="list-row" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ marginTop: 4 }} />
                      <div className="grow"><div style={{ fontWeight: 500, color: 'var(--text)' }}>{c.item}</div><div className="tiny subtle">{c.why}</div></div>
                    </label>
                  ))}
                </div>
              </Card>
            )}
            {result.open_to_work && <Card title="“Open to work” note"><CopyBox text={result.open_to_work} /></Card>}
          </div>
        ) : (
          <Card>
            <div className="stack-sm small muted" style={{ padding: 8 }}>
              <div className="row" style={{ gap: 8 }}><Icon name="target" size={16} className="text-accent" /> 3 keyword-rich headline options</div>
              <div className="row" style={{ gap: 8 }}><Icon name="file" size={16} className="text-accent" /> A new About section that hooks recruiters</div>
              <div className="row" style={{ gap: 8 }}><Icon name="zap" size={16} className="text-accent" /> Rewritten, quantified experience bullets</div>
              <div className="row" style={{ gap: 8 }}><Icon name="list" size={16} className="text-accent" /> The skills recruiters search for, and quick wins</div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
