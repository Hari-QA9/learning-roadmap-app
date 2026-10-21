import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  PageHeader, Button, Card, Field, Input, Textarea, Tabs, Segmented, Loading, Badge, Icon, Modal, Ring, Alert, Spinner,
} from '../components/ui';

const EMPTY = { name: '', email: '', phone: '', location: '', linkedin: '', github: '', goal: '', summary: '', skills: '', experience: '', education: '' };
const TEMPLATES = [{ value: 'modern', label: 'Modern' }, { value: 'classic', label: 'Classic' }, { value: 'minimal', label: 'Minimal' }];

/* ---------- Turn free text into resume blocks ---------- */
function Blocks({ text, accent }) {
  if (!text?.trim()) return null;
  const lines = text.split('\n');
  const out = [];
  let bullets = [];
  const flush = () => { if (bullets.length) { out.push(<ul key={out.length} style={{ margin: '2px 0 8px', paddingLeft: 16 }}>{bullets}</ul>); bullets = []; } };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    const b = line.match(/^[-•*]\s*(.*)/);
    if (b) bullets.push(<li key={i} style={{ margin: '2px 0' }}>{b[1]}</li>);
    else {
      flush();
      const [title, ...rest] = line.split('|').map((s) => s.trim());
      out.push(
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: out.length ? 8 : 0 }}>
          <strong style={{ color: accent || '#1a1a19', fontWeight: 600 }}>{title}</strong>
          {rest.length > 0 && <span style={{ color: '#6b6a65', whiteSpace: 'nowrap' }}>{rest.join(' · ')}</span>}
        </div>
      );
    }
  });
  flush();
  return <div>{out}</div>;
}

function Preview({ r, template, certs }) {
  const skills = r.skills.split(',').map((s) => s.trim()).filter(Boolean);
  const contact = [r.email, r.phone, r.location, r.linkedin, r.github].filter(Boolean);
  const accent = template === 'modern' ? '#0071e3' : '#1d1d1f';
  const serif = template === 'classic';
  const H = ({ children }) => (
    <div style={{
      fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: template === 'modern' ? accent : '#1a1a19',
      borderBottom: template === 'minimal' ? 'none' : `1px solid ${template === 'modern' ? '#d6e6fa' : '#d4d3ce'}`, paddingBottom: 4, margin: '18px 0 8px',
    }}>{children}</div>
  );
  return (
    <div
      id="resume-preview"
      style={{
        background: '#fff', color: '#2b2b29', width: '100%', aspectRatio: '1 / 1.414',
        padding: '40px 44px', fontSize: 11.5, lineHeight: 1.55, boxShadow: 'var(--shadow)', borderRadius: 4,
        fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: template === 'classic' ? 'center' : 'left' }}>
        <div style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: template === 'classic' ? 500 : 700, color: '#1d1d1f', letterSpacing: template === 'classic' ? '0' : '-0.025em', lineHeight: 1.15 }}>
          {r.name || 'Your Name'}
        </div>
        {r.goal && <div style={{ color: accent, marginTop: 3, fontSize: 12.5 }}>{r.goal}</div>}
        {contact.length > 0 && <div style={{ color: '#6b6a65', marginTop: 6, fontSize: 10.5 }}>{contact.join('  ·  ')}</div>}
      </div>
      {r.summary && (<><H>Summary</H><div>{r.summary}</div></>)}
      {skills.length > 0 && (
        <>
          <H>Skills</H>
          {template === 'modern' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {skills.map((s, i) => <span key={`${s}-${i}`} style={{ background: '#e8f1fc', color: accent, padding: '2px 8px', borderRadius: 4, fontSize: 10.5 }}>{s}</span>)}
            </div>
          ) : <div>{skills.join(' · ')}</div>}
        </>
      )}
      {r.experience && (<><H>Experience</H><Blocks text={r.experience} /></>)}
      {r.education && (<><H>Education</H><Blocks text={r.education} /></>)}
      {certs.length > 0 && (
        <>
          <H>Certifications</H>
          {certs.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{c.roadmap_title} — LearnMap</span>
              <span style={{ color: '#6b6a65' }}>{new Date(c.issued_at).getFullYear()}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ResumeBuilder() {
  const toast = useToast();
  const [r, setR] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');
  const [template, setTemplate] = useState(() => { try { return localStorage.getItem('learnmap.resumeTemplate') || 'modern'; } catch { return 'modern'; } });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [writing, setWriting] = useState(false);
  const [certs, setCerts] = useState([]);
  const [includeCerts, setIncludeCerts] = useState(true);
  const [review, setReview] = useState(null); // { kind: 'score'|'ats', data }
  const [reviewing, setReviewing] = useState(null);
  const [atsOpen, setAtsOpen] = useState(false);
  const [jd, setJd] = useState('');
  const [exporting, setExporting] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    Promise.allSettled([api.get('/resume'), api.get('/resume/saved'), api.get('/evaluation/certificates')]).then(([p, s, c]) => {
      const base = { ...EMPTY };
      if (p.status === 'fulfilled') { base.name = p.value.data?.user?.name || ''; base.email = p.value.data?.user?.email || ''; }
      if (s.status === 'fulfilled' && s.value.data?.resume) {
        const saved = s.value.data.resume;
        Object.keys(EMPTY).forEach((k) => { if (saved[k]) base[k] = saved[k]; });
        if (saved.template) setTemplate(saved.template);
        if (typeof saved.includeCerts === 'boolean') setIncludeCerts(saved.includeCerts);
      }
      if (c.status === 'fulfilled') setCerts(c.value.data.certificates || []);
      setR(base);
      setLoading(false);
    });
  }, []);

  useEffect(() => { try { localStorage.setItem('learnmap.resumeTemplate', template); } catch {} }, [template]);

  const set = (k) => (e) => { setR((x) => ({ ...x, [k]: e.target.value })); setDirty(true); };

  const save = useCallback(async (silent) => {
    setSaving(true);
    try {
      await api.post('/resume/save', { resume_data: { ...r, template, includeCerts } });
      setDirty(false);
      setLastSaved(new Date());
      if (!silent) toast.success('Resume saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save resume'));
    } finally {
      setSaving(false);
    }
  }, [r, template, includeCerts, toast]);

  // Auto-save 2s after the last change.
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (!dirty) return;
    const t = setTimeout(() => save(true), 2000);
    return () => clearTimeout(t);
  }, [r, dirty, save]);

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const writeSummary = async () => {
    if (!r.skills.trim()) { toast.info('Add your skills first so the summary is accurate.'); setTab('skills'); return; }
    setWriting(true);
    try {
      const res = await api.post('/resume/generate-summary', { skills: r.skills, experience: r.experience, goal: r.goal });
      setR((x) => ({ ...x, summary: res.data.summary || x.summary }));
      setDirty(true);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not write a summary'));
    } finally {
      setWriting(false);
    }
  };

  const runScore = async () => {
    if (!r.skills.trim() && !r.experience.trim()) { toast.info('Fill in skills and experience first.'); return; }
    setReviewing('score');
    try {
      const res = await api.post('/resume/score', r);
      setReview({ kind: 'score', data: res.data });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not score the resume'));
    } finally {
      setReviewing(null);
    }
  };

  const runAts = async () => {
    setAtsOpen(false);
    setReviewing('ats');
    try {
      const res = await api.post('/resume/ats-check', { ...r, jobDescription: jd.trim() || undefined });
      setReview({ kind: 'ats', data: res.data });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not run the ATS check'));
    } finally {
      setReviewing(null);
    }
  };

  const download = async () => {
    const el = document.getElementById('resume-preview');
    if (!el) return;
    setExporting(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = mod.default || mod;
      const clone = el.cloneNode(true);
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0';
      clone.style.width = '794px';
      clone.style.aspectRatio = 'auto';
      clone.style.minHeight = '1123px';
      clone.style.overflow = 'visible';
      await html2pdf().set({
        margin: 0,
        filename: `${(r.name || 'resume').replace(/\s+/g, '_')}_resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
      }).from(clone).save();
    } catch (err) {
      toast.error('Could not create the PDF. Try Print → Save as PDF instead.');
    } finally {
      setExporting(false);
    }
  };

  const completeness = useMemo(() => {
    const keys = ['name', 'email', 'goal', 'summary', 'skills', 'experience', 'education'];
    return Math.round((keys.filter((k) => r[k]?.trim()).length / keys.length) * 100);
  }, [r]);

  if (loading) return <Loading label="Loading your resume…" />;

  const tips = review?.data && (Array.isArray(review.data.tips) ? review.data.tips : review.data.tips ? String(review.data.tips).split(/(?<=\.)\s+/).filter(Boolean) : []);
  const suggestions = review?.data && (Array.isArray(review.data.suggestions) ? review.data.suggestions : review.data.suggestions ? String(review.data.suggestions).split(/(?<=\.)\s+/).filter(Boolean) : []);

  return (
    <div>
      <PageHeader
        title="Resume builder"
        description="Write once, preview live, and check it against real job descriptions."
        actions={
          <>
            <span className="small subtle row" style={{ gap: 6 }}>
              {saving ? <><Spinner size={12} /> Saving…</> : dirty ? 'Unsaved changes' : lastSaved ? <><Icon name="check" size={13} /> Saved</> : null}
            </span>
            <Button icon="target" loading={reviewing === 'score'} onClick={runScore}>Score</Button>
            <Button icon="search" loading={reviewing === 'ats'} onClick={() => setAtsOpen(true)}>ATS check</Button>
            <Button variant="primary" icon="download" loading={exporting} onClick={download}>Download PDF</Button>
          </>
        }
      />

      <div className="split" style={{ alignItems: 'start' }}>
        <div className="stack-lg">
          <Card pad={false}>
            <div style={{ padding: '6px 20px 0' }}>
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[{ value: 'details', label: 'Details' }, { value: 'summary', label: 'Summary' }, { value: 'skills', label: 'Skills' }, { value: 'experience', label: 'Experience' }, { value: 'education', label: 'Education' }]}
              />
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              {tab === 'details' && (
                <div className="form-grid fade-in">
                  <Field label="Full name"><Input value={r.name} onChange={set('name')} /></Field>
                  <Field label="Target role"><Input value={r.goal} onChange={set('goal')} placeholder="QA Automation Engineer" /></Field>
                  <Field label="Email"><Input type="email" value={r.email} onChange={set('email')} /></Field>
                  <Field label="Phone" optional><Input value={r.phone} onChange={set('phone')} /></Field>
                  <Field label="Location" optional><Input value={r.location} onChange={set('location')} placeholder="Jersey City, NJ" /></Field>
                  <Field label="LinkedIn" optional><Input value={r.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/you" /></Field>
                  <Field label="GitHub / portfolio" optional className="full"><Input value={r.github} onChange={set('github')} placeholder="github.com/you" /></Field>
                </div>
              )}
              {tab === 'summary' && (
                <div className="fade-in">
                  <Field label="Professional summary" hint="3–4 sentences: who you are, what you’re great at, what you want next.">
                    <Textarea rows={6} value={r.summary} onChange={set('summary')} />
                  </Field>
                  <Button className="mt-2" icon="sparkles" loading={writing} onClick={writeSummary}>{r.summary ? 'Rewrite with AI' : 'Write with AI'}</Button>
                </div>
              )}
              {tab === 'skills' && (
                <div className="fade-in">
                  <Field label="Skills" hint="Separate with commas. Put the most relevant first.">
                    <Textarea rows={4} value={r.skills} onChange={set('skills')} placeholder="Python, Selenium, Pytest, SQL, Git, Jenkins, REST API testing" />
                  </Field>
                  <div className="row row-wrap mt-2" style={{ gap: 6 }}>
                    {r.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => <Badge key={`${s}-${i}`}>{s}</Badge>)}
                  </div>
                </div>
              )}
              {tab === 'experience' && (
                <div className="fade-in">
                  <Field label="Experience" hint="One role per block: “Title, Company | Dates” then bullet lines starting with “-”.">
                    <Textarea rows={12} value={r.experience} onChange={set('experience')} style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                      placeholder={'Senior Test Engineer, Accenture | 2021 – 2022\n- Automated 300+ regression tests with Selenium and Java\n- Cut release testing time by 40%'} />
                  </Field>
                </div>
              )}
              {tab === 'education' && (
                <div className="fade-in">
                  <Field label="Education" hint="Same format: “Degree, School | Year”, with optional bullets.">
                    <Textarea rows={7} value={r.education} onChange={set('education')} style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                      placeholder={'MS Computer Science, Long Island University | 2026\nBTech Civil Engineering, VR Siddhartha | 2018'} />
                  </Field>
                  {certs.length > 0 && (
                    <label className="checkbox mt-2">
                      <input type="checkbox" checked={includeCerts} onChange={(e) => { setIncludeCerts(e.target.checked); setDirty(true); }} />
                      Include my {certs.length} LearnMap certificate{certs.length > 1 ? 's' : ''}
                    </label>
                  )}
                </div>
              )}
            </div>
            <div className="card-foot" style={{ justifyContent: 'space-between' }}>
              <span className="small muted">{completeness}% complete</span>
              <Button variant="secondary" icon="check" loading={saving} onClick={() => save(false)}>Save</Button>
            </div>
          </Card>

          {review && (
            <Card
              className="fade-in"
              title={review.kind === 'score' ? 'Resume score' : 'ATS check'}
              description={review.kind === 'ats' && jd.trim() ? 'Compared with the job description you pasted' : undefined}
              actions={<Button variant="ghost" size="sm" icon="x" onClick={() => setReview(null)} aria-label="Close" />}
            >
              <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
                <Ring value={review.kind === 'score' ? review.data.score : review.data.atsScore} size={84} tone={(review.kind === 'score' ? review.data.score : review.data.atsScore) >= 75 ? 'success' : 'warning'} />
                <div className="grow stack">
                  {review.kind === 'score' ? (
                    <>
                      {review.data.strengths?.length > 0 && (
                        <div><div className="label mb-1">Strengths</div>{review.data.strengths.map((s, i) => <div key={i} className="row small" style={{ alignItems: 'flex-start' }}><Icon name="check" size={14} className="text-success" style={{ marginTop: 3 }} />{s}</div>)}</div>
                      )}
                      {tips.length > 0 && (
                        <div><div className="label mb-1">Improve</div>{tips.map((s, i) => <div key={i} className="row small" style={{ alignItems: 'flex-start' }}><Icon name="arrowRight" size={14} className="text-accent" style={{ marginTop: 3 }} />{s}</div>)}</div>
                      )}
                    </>
                  ) : (
                    <>
                      {review.data.keywordsFound?.length > 0 && <div><div className="label mb-1">Keywords found</div><div className="row row-wrap" style={{ gap: 5 }}>{review.data.keywordsFound.map((k, i) => <Badge key={`${k}-${i}`} tone="success">{k}</Badge>)}</div></div>}
                      {review.data.keywordsMissing?.length > 0 && <div><div className="label mb-1">Missing keywords</div><div className="row row-wrap" style={{ gap: 5 }}>{review.data.keywordsMissing.map((k, i) => <Badge key={`${k}-${i}`} tone="danger">{k}</Badge>)}</div></div>}
                      {suggestions.length > 0 && <div><div className="label mb-1">Suggestions</div>{suggestions.map((s, i) => <div key={i} className="row small" style={{ alignItems: 'flex-start' }}><Icon name="arrowRight" size={14} className="text-accent" style={{ marginTop: 3 }} />{s}</div>)}</div>}
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="sticky-top stack">
          <div className="row-between">
            <span className="small muted">Live preview</span>
            <Segmented value={template} onChange={(v) => { setTemplate(v); setDirty(true); }} options={TEMPLATES} />
          </div>
          <Preview r={r} template={template} certs={includeCerts ? certs : []} />
        </div>
      </div>

      <Modal
        open={atsOpen}
        onClose={() => setAtsOpen(false)}
        title="ATS check"
        description="Paste a job description for a targeted check, or leave it empty to compare against typical postings for your target role."
        footer={<><Button onClick={() => setAtsOpen(false)}>Cancel</Button><Button variant="primary" icon="search" onClick={runAts}>Run check</Button></>}
      >
        {!r.skills.trim() && <div className="mb-2"><Alert tone="warning">Add your skills first for a meaningful result.</Alert></div>}
        <Field label="Job description" optional>
          <Textarea rows={8} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job posting here" />
        </Field>
      </Modal>
    </div>
  );
}

export default ResumeBuilder;
