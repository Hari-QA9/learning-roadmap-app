import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { useToast } from '../Toast';
import { Modal, Button, Field, Textarea, Select, Badge, Ring, Icon, Loading, Segmented } from '../ui';

/**
 * Tailor the resume to one job. Step 1: pick a job (from the board/tracker) or paste one.
 * Step 2: review suggestions and apply them one by one — nothing changes until you click Apply.
 */
export default function TailorModal({ open, onClose, resume, initialJobId, onApply, onStart, onJobPicked }) {
  const toast = useToast();
  const [mode, setMode] = useState('saved');
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState(initialJobId ? String(initialJobId) : '');
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState({});

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setApplied({});
    Promise.allSettled([api.get('/applications'), api.get('/jobs/recommended', { params: { limit: 10 } })]).then(([a, r]) => {
      const list = [];
      const seen = new Set();
      if (a.status === 'fulfilled') (a.value.data || []).filter((x) => x.job_id).forEach((x) => { if (!seen.has(x.job_id)) { seen.add(x.job_id); list.push({ id: x.job_id, label: `${x.job_title}${x.company ? ` — ${x.company}` : ''}`, group: 'Your saved & applied jobs' }); } });
      if (r.status === 'fulfilled') (r.value.data.jobs || []).forEach((x) => { if (!seen.has(x.id)) { seen.add(x.id); list.push({ id: x.id, label: `${x.title}${x.company ? ` — ${x.company}` : ''}${x.match != null ? ` (${x.match}% match)` : ''}`, group: 'Recommended for you' }); } });
      setJobs(list);
      if (initialJobId) { setJobId(String(initialJobId)); setMode('saved'); } else if (!list.length) setMode('paste');
    });
  }, [open, initialJobId]);

  const run = async () => {
    if (mode === 'saved' && !jobId) return toast.error('Pick a job first');
    if (mode === 'paste' && jd.trim().length < 80) return toast.error('Paste the full job description');
    setBusy(true);
    try {
      const body = mode === 'saved' ? { resume, jobId: Number(jobId) } : { resume, jobDescription: jd };
      const r = await api.post('/resume/tailor', body);
      setResult(r.data);
      onJobPicked?.(mode === 'saved' ? Number(jobId) : null, r.data.job);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not tailor your resume'));
    } finally {
      setBusy(false);
    }
  };

  const findBullet = (id) => {
    const m = String(id || '').match(/^([EP])(\d+)\.(\d+)$/);
    if (!m) return null;
    const list = m[1] === 'E' ? resume.experience : resume.projects;
    const entry = list[Number(m[2])];
    if (!entry || entry.bullets[Number(m[3])] == null) return null;
    return { kind: m[1] === 'E' ? 'experience' : 'projects', entryIndex: Number(m[2]), bulletIndex: Number(m[3]), original: entry.bullets[Number(m[3])], where: entry.title || entry.name };
  };

  const apply = async (key, change) => {
    const ok = await onStart?.();
    if (ok === false) return;
    onApply(change);
    setApplied((a) => ({ ...a, [key]: true }));
  };

  const edits = (result?.bullet_edits || []).map((e) => ({ ...e, target: findBullet(e.id) })).filter((e) => e.target && e.improved);
  const applyAll = async () => {
    const ok = await onStart?.();
    if (ok === false) return;
    if (result.summary && !applied.summary) onApply({ type: 'summary', value: result.summary });
    if (result.headline && !applied.headline && result.headline.trim().toLowerCase() !== (resume.contact.headline || '').trim().toLowerCase()) onApply({ type: 'headline', value: result.headline });
    (result.skills_to_add || []).forEach((s, i) => !applied[`s${i}`] && onApply({ type: 'skill', value: s.skill }));
    edits.forEach((e, i) => !applied[`b${i}`] && onApply({ type: 'bullet', ...e.target, value: e.improved }));
    const all = { summary: true, headline: true };
    (result.skills_to_add || []).forEach((_, i) => { all[`s${i}`] = true; });
    edits.forEach((_, i) => { all[`b${i}`] = true; });
    setApplied(all);
    toast.success('All suggestions applied');
  };

  const groups = jobs.reduce((m, j) => ({ ...m, [j.group]: [...(m[j.group] || []), j] }), {});

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={result ? `Tailored for ${result.job?.title || 'this job'}` : 'Tailor your resume to a job'}
      description={result ? 'Review each change. Your main resume stays as it is — changes go into a separate version for this job.' : 'AI compares your resume with the job and suggests honest, specific edits.'}
      footer={result ? (
        <>
          <Button variant="ghost" onClick={() => setResult(null)}>Pick another job</Button>
          <Button onClick={applyAll} icon="check">Apply all</Button>
          <Button variant="primary" onClick={onClose}>Done</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="sparkles" loading={busy} onClick={run}>Tailor my resume</Button>
        </>
      )}
    >
      {busy ? <Loading label="Reading the job and your resume…" /> : !result ? (
        <div className="stack">
          <Segmented value={mode} onChange={setMode} options={[{ value: 'saved', label: 'From job board' }, { value: 'paste', label: 'Paste a job' }]} />
          {mode === 'saved' ? (
            jobs.length ? (
              <Field label="Job">
                <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  <option value="">Choose a job…</option>
                  {Object.entries(groups).map(([g, list]) => (
                    <optgroup key={g} label={g}>{list.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}</optgroup>
                  ))}
                </Select>
              </Field>
            ) : <p className="small muted">No saved jobs yet. Save one on the Job board, or paste a job description.</p>
          ) : (
            <Field label="Job description" hint="Paste the full posting from LinkedIn, Indeed or a company site.">
              <Textarea rows={10} value={jd} onChange={(e) => setJd(e.target.value)} />
            </Field>
          )}
        </div>
      ) : (
        <div className="stack-lg">
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <Ring value={result.match_score || 0} size={72} tone={(result.match_score || 0) >= 70 ? 'success' : 'warning'} />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Match before changes</div>
              <div className="small muted">Apply the suggestions below, then watch your live score update.</div>
            </div>
          </div>

          {(result.keywords_present?.length > 0 || result.gaps?.length > 0) && (
            <div className="grid-2">
              {result.keywords_present?.length > 0 && (
                <div><div className="section-label" style={{ marginTop: 0 }}>Keywords you already have</div><div className="chip-row">{result.keywords_present.map((k) => <span key={k} className="skill have"><Icon name="check" size={11} />{k}</span>)}</div></div>
              )}
              {result.gaps?.length > 0 && (
                <div>
                  <div className="section-label" style={{ marginTop: 0 }}>Gaps (don’t fake these)</div>
                  <div className="stack-sm">{result.gaps.map((g) => <div key={g.skill} className="tiny"><strong>{g.skill}</strong> — <span className="muted">{g.advice}</span></div>)}</div>
                </div>
              )}
            </div>
          )}

          {result.headline && result.headline.trim().toLowerCase() !== (resume.contact.headline || '').trim().toLowerCase() && (
            <Suggestion title="Title under your name" before={resume.contact.headline} after={result.headline} done={applied.headline} onApply={() => apply('headline', { type: 'headline', value: result.headline })} />
          )}
          {result.summary && (
            <Suggestion title="Summary" before={resume.summary} after={result.summary} done={applied.summary} onApply={() => apply('summary', { type: 'summary', value: result.summary })} />
          )}
          {result.skills_to_add?.length > 0 && (
            <div>
              <div className="section-label">Skills to add (you already show these)</div>
              <div className="stack-sm">
                {result.skills_to_add.map((s, i) => (
                  <div key={s.skill} className="gap-item row-between">
                    <div><strong className="small">{s.skill}</strong><div className="tiny muted">{s.why}</div></div>
                    <Button size="sm" variant={applied[`s${i}`] ? 'ghost' : 'secondary'} icon={applied[`s${i}`] ? 'check' : 'plus'} disabled={applied[`s${i}`]} onClick={() => apply(`s${i}`, { type: 'skill', value: s.skill })}>{applied[`s${i}`] ? 'Added' : 'Add'}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {edits.length > 0 && (
            <div>
              <div className="section-label">Bullet rewrites</div>
              <div className="stack-sm">
                {edits.map((e, i) => (
                  <Suggestion key={e.id} title={e.target.where} why={e.why} before={e.target.original} after={e.improved} done={applied[`b${i}`]}
                    onApply={() => apply(`b${i}`, { type: 'bullet', ...e.target, value: e.improved })} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Suggestion({ title, why, before, after, done, onApply }) {
  return (
    <div className="gap-item suggestion">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="tiny subtle">{title}{why ? ` · ${why}` : ''}</div>
        {done ? <Badge tone="success" dot>Applied</Badge> : <Button size="sm" icon="check" onClick={onApply}>Apply</Button>}
      </div>
      {before && <div className="suggestion-before small">{before}</div>}
      <div className="suggestion-after small">{after}</div>
    </div>
  );
}
