import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import {
  PageHeader, Button, Card, Field, Textarea, Select, Segmented, Loading, Icon, Modal, Badge, Ring, Dropdown, Spinner, ConfirmDialog, Input,
} from '../components/ui';
import ResumePaper, { PrintableResume, PAPER, TEMPLATES, MARGIN_X, MARGIN_Y } from '../components/resume/ResumePaper';
import { ContactEditor, SummaryEditor, SkillsEditor, EntriesEditor, PublicationsEditor } from '../components/resume/Editors';
import HealthPanel from '../components/resume/HealthPanel';
import TailorModal from '../components/resume/TailorModal';
import {
  upgradeResume, analyzeResume, toPlainText, skillList, uid, SECTION_LABELS, EXTRA_SECTIONS,
} from '../lib/resume';

const withIds = (list = []) => list.map((x) => ({ ...x, id: x.id || uid(), ...(Array.isArray(x.bullets) ? { bullets: x.bullets.length ? x.bullets : [''] } : {}) }));

function ResumeBuilder() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [r, setR] = useState(null);
  const [target, setTarget] = useState({ kind: 'main' }); // or { kind: 'version', id, name, job_id }
  const [versions, setVersions] = useState([]);
  const [certs, setCerts] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [pages, setPages] = useState(1);
  const [job, setJob] = useState(null); // { id, title, company, skills } for live keyword checks
  const [tailorOpen, setTailorOpen] = useState(false);
  const [tailorJobId, setTailorJobId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const tailorJobRef = useRef(null);
  const skipSave = useRef(true);

  /* ---------- Load ---------- */
  const loadVersions = useCallback(() => api.get('/resume/versions', { noCache: true }).then((x) => setVersions(x.data || [])).catch(() => {}), []);

  useEffect(() => {
    Promise.allSettled([api.get('/resume'), api.get('/resume/saved', { noCache: true }), api.get('/evaluation/certificates')]).then(([p, s, c]) => {
      const saved = s.status === 'fulfilled' ? s.value.data?.resume : null;
      const res = upgradeResume(saved);
      if (!saved && p.status === 'fulfilled') {
        res.contact.name = p.value.data?.user?.name || '';
        res.contact.email = p.value.data?.user?.email || '';
      }
      if (c.status === 'fulfilled') setCerts(c.value.data.certificates || []);
      skipSave.current = true;
      setR(res);
    });
    loadVersions();
  }, [loadVersions]);

  // Opened from a job page: /resume-builder?job=123
  useEffect(() => {
    const id = params.get('job');
    if (id && r) {
      setTailorJobId(Number(id));
      setTailorOpen(true);
      params.delete('job');
      setParams(params, { replace: true });
    }
  }, [params, r, setParams]);

  // Job keywords for the live check (from the version's job or the job being tailored).
  const jobId = target.job_id || tailorJobId;
  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    api.get(`/jobs/${jobId}`).then((x) => setJob({ id: jobId, title: x.data.job.title, company: x.data.job.company, skills: x.data.job.skills || [] })).catch(() => setJob(null));
  }, [jobId]);

  /* ---------- Save ---------- */
  const save = useCallback(async (silent = true, data = r, to = target) => {
    if (!data) return;
    setSaving(true);
    try {
      if (to.kind === 'version') await api.put(`/resume/versions/${to.id}`, { data });
      else await api.post('/resume/save', { resume_data: data });
      setDirty(false);
      setLastSaved(new Date());
      if (!silent) toast.success('Saved');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save'));
    } finally {
      setSaving(false);
    }
  }, [r, target, toast]);

  useEffect(() => {
    if (!r) return;
    if (skipSave.current) { skipSave.current = false; return; }
    setDirty(true);
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
  }, [r]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const update = (patch) => setR((x) => ({ ...x, ...patch }));

  /* ---------- Versions ---------- */
  const switchTo = async (value) => {
    if (dirty) await save(true);
    try {
      if (value === 'main') {
        const s = await api.get('/resume/saved', { noCache: true });
        skipSave.current = true;
        setR(upgradeResume(s.data.resume));
        setTarget({ kind: 'main' });
        setTailorJobId(null);
      } else {
        const v = await api.get(`/resume/versions/${value}`, { noCache: true });
        skipSave.current = true;
        setR(upgradeResume(v.data.data));
        setTarget({ kind: 'version', id: v.data.id, name: v.data.name, job_id: v.data.job_id });
      }
      setDirty(false);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not open that version'));
    }
  };

  const createVersion = async (name, jobIdForVersion) => {
    if (dirty) await save(true);
    const res = await api.post('/resume/versions', { name, job_id: jobIdForVersion || null, data: r });
    setTarget({ kind: 'version', id: res.data.id, name, job_id: jobIdForVersion || null });
    setDirty(false);
    loadVersions();
    return res.data.id;
  };

  const duplicate = async () => {
    try {
      await createVersion(`${target.kind === 'main' ? 'Copy of main resume' : `Copy of ${target.name}`}`);
      toast.success('Created a new version — edits now go there');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not create a version'));
    }
  };

  const renameVersion = async () => {
    try {
      await api.put(`/resume/versions/${target.id}`, { name: renaming });
      setTarget((t) => ({ ...t, name: renaming }));
      setRenaming(null);
      loadVersions();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not rename'));
    }
  };

  const deleteVersion = async () => {
    const id = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/resume/versions/${id}`);
      if (target.kind === 'version' && target.id === id) await switchTo('main');
      loadVersions();
      toast.success('Version deleted');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not delete'));
    }
  };

  /* ---------- Tailor ---------- */
  // Before the first change is applied, put the tailored edits in their own version.
  const ensureTailoredVersion = async () => {
    if (target.kind === 'version') return true;
    const j = tailorJobRef.current;
    const name = j && j.title ? `${j.company ? `${j.company} — ` : ''}${j.title}` : 'Tailored resume';
    try {
      await createVersion(name.slice(0, 120), j?.id);
      toast.info(`Saved as a new version: “${name}”. Your main resume is unchanged.`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not create a tailored version'));
      return false;
    }
  };

  const applyChange = (ch) => {
    setR((x) => {
      if (ch.type === 'summary') return { ...x, summary: ch.value };
      if (ch.type === 'headline') return { ...x, contact: { ...x.contact, headline: ch.value } };
      if (ch.type === 'skill') {
        if (skillList(x).some((s) => s.toLowerCase() === ch.value.toLowerCase())) return x;
        const skills = [...x.skills];
        const g = skills[0] || { id: uid(), group: '', items: '' };
        skills[0] = { ...g, items: g.items.trim() ? `${g.items.replace(/,\s*$/, '')}, ${ch.value}` : ch.value };
        return { ...x, skills };
      }
      if (ch.type === 'bullet') {
        const list = x[ch.kind].map((e, i) => (i === ch.entryIndex ? { ...e, bullets: e.bullets.map((b, k) => (k === ch.bulletIndex ? ch.value : b)) } : e));
        return { ...x, [ch.kind]: list };
      }
      return x;
    });
  };

  /* ---------- Import ---------- */
  const runImport = async () => {
    setImporting(true);
    try {
      const res = await api.post('/resume/import', { text: importText });
      const d = res.data.resume || {};
      const next = upgradeResume({
        version: 2,
        ...r,
        contact: { ...r.contact, ...Object.fromEntries(Object.entries(d.contact || {}).filter(([, v]) => v)) },
        summary: d.summary || r.summary,
        skills: d.skills?.length ? withIds(d.skills) : r.skills,
        experience: withIds(d.experience || []),
        projects: withIds(d.projects || []),
        education: withIds(d.education || []),
        certifications: withIds(d.certifications || []),
        research: withIds(d.research || []),
        publications: withIds((d.publications || []).filter((x) => x.citation)),
        volunteer: withIds(d.volunteer || []),
        awards: withIds(d.awards || []),
      });
      EXTRA_SECTIONS.forEach((k) => { if (next[k].length && !next.order.includes(k)) next.order.push(k); });
      setR(next);
      setImportOpen(false);
      setImportText('');
      toast.success('Imported — check each section and fix anything the AI misread');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not import'));
    } finally {
      setImporting(false);
    }
  };

  /* ---------- Other actions ---------- */
  const runReview = async () => {
    setReviewing(true);
    try {
      const res = await api.post('/resume/score', { resume: r });
      setReview(res.data);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not review the resume'));
    } finally {
      setReviewing(false);
    }
  };

  const syncSkills = async () => {
    setSyncing(true);
    try {
      const p = await api.get('/jobs/profile', { noCache: true });
      const prof = p.data || {};
      await api.put('/jobs/profile', {
        ...prof,
        skills: skillList(r),
        target_roles: prof.target_roles?.length ? prof.target_roles : [r.contact.headline].filter(Boolean),
      });
      toast.success('Job matches now use these skills');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update job matching'));
    } finally {
      setSyncing(false);
    }
  };

  const shownCerts = r && r.includeLearnvoyCerts ? certs : [];

  const copyText = () => {
    navigator.clipboard?.writeText(toPlainText(r, shownCerts))
      .then(() => toast.success('Copied as plain text — paste it into application forms'))
      .catch(() => toast.error('Could not copy'));
  };

  const downloadPdf = async () => {
    if (dirty) await save(true);
    const paper = PAPER[r.paper] || PAPER.letter;
    const style = document.createElement('style');
    style.textContent = `@page { size: ${paper.css}; margin: ${MARGIN_Y}px ${MARGIN_X}px; }`;
    document.head.appendChild(style);
    const oldTitle = document.title;
    document.title = `${(r.contact.name || 'Resume').trim().replace(/\s+/g, '_')}_Resume`;
    document.documentElement.classList.add('print-resume');
    const done = () => {
      document.documentElement.classList.remove('print-resume');
      document.title = oldTitle;
      style.remove();
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  };

  const jump = (section) => {
    const id = { contact: 'sec-contact', layout: 'sec-preview' }[section] || `sec-${section}`;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const moveSection = (s, dir) => {
    const order = [...r.order];
    const i = order.indexOf(s);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    update({ order });
  };
  const addSection = (s) => {
    if (r.order.includes(s)) return;
    const order = [...r.order];
    const at = s === 'research' ? Math.max(0, order.indexOf('experience') + 1) : order.length;
    order.splice(at || order.length, 0, s);
    update({ order, hidden: r.hidden.filter((x) => x !== s) });
    setTimeout(() => jump(s), 60);
  };
  const removeSection = (s) => update({ order: r.order.filter((x) => x !== s) });
  const toggleHidden = (s) => update({ hidden: r.hidden.includes(s) ? r.hidden.filter((x) => x !== s) : [...r.hidden, s] });

  const analysis = useMemo(() => (r ? analyzeResume(r, { pages, jobSkills: job?.skills, learnMapCerts: shownCerts.length }) : null), [r, pages, job, shownCerts.length]);
  const onPages = useCallback((n) => setPages(n), []);

  if (!r) return <Loading label="Loading your resume…" />;

  const context = { targetRole: r.contact.headline, keywords: job?.skills?.join(', ') };
  const sectionBody = {
    summary: <SummaryEditor value={r.summary} onChange={(v) => update({ summary: v })} resume={r} jobTitle={job?.title} />,
    skills: <SkillsEditor value={r.skills} onChange={(v) => update({ skills: v })} onSync={syncSkills} syncing={syncing} />,
    experience: <EntriesEditor kind="experience" value={r.experience} onChange={(v) => update({ experience: v })} context={context} />,
    projects: <EntriesEditor kind="projects" value={r.projects} onChange={(v) => update({ projects: v })} context={context} />,
    education: <EntriesEditor kind="education" value={r.education} onChange={(v) => update({ education: v })} />,
    research: <EntriesEditor kind="research" value={r.research} onChange={(v) => update({ research: v })} context={context} />,
    volunteer: <EntriesEditor kind="volunteer" value={r.volunteer} onChange={(v) => update({ volunteer: v })} context={context} />,
    publications: <PublicationsEditor value={r.publications} onChange={(v) => update({ publications: v })} />,
    awards: <EntriesEditor kind="awards" value={r.awards} onChange={(v) => update({ awards: v })} />,
    certifications: (
      <>
        <EntriesEditor kind="certifications" value={r.certifications} onChange={(v) => update({ certifications: v })} />
        {certs.length > 0 && (
          <label className="checkbox mt-2">
            <input type="checkbox" checked={r.includeLearnvoyCerts} onChange={(e) => update({ includeLearnvoyCerts: e.target.checked })} />
            Include my {certs.length} Learnvoy certificate{certs.length > 1 ? 's' : ''}
          </label>
        )}
      </>
    ),
  };

  return (
    <div className="resume-page">
      <PageHeader
        eyebrow="Career"
        title="Resume builder"
        description="An ATS-friendly resume with live feedback as you type, AI help on every bullet, and a tailored version for each job."
        actions={
          <>
            <span className="small subtle row nowrap" style={{ gap: 6 }}>
              {saving ? <><Spinner size={12} /> Saving…</> : dirty ? 'Editing…' : lastSaved ? <><Icon name="check" size={13} /> Saved</> : null}
            </span>
            <Button icon="upload" onClick={() => setImportOpen(true)}>Import</Button>
            <Button icon="target" onClick={() => { setTailorJobId(null); setTailorOpen(true); }}>Tailor to a job</Button>
            <Dropdown trigger={({ toggle }) => <Button variant="primary" icon="download" iconRight="chevronDown" onClick={toggle}>Export</Button>}>
              <button className="menu-item" onClick={downloadPdf}><Icon name="file" size={15} /> Download PDF</button>
              <button className="menu-item" onClick={copyText}><Icon name="copy" size={15} /> Copy as plain text</button>
            </Dropdown>
          </>
        }
      />

      <div className="version-bar">
        <Icon name="layers" size={15} style={{ color: 'var(--text-3)' }} />
        <Select value={target.kind === 'main' ? 'main' : String(target.id)} onChange={(e) => switchTo(e.target.value)} aria-label="Resume version" className="version-select">
          <option value="main">Main resume</option>
          {versions.length > 0 && (
            <optgroup label="Tailored versions">
              {versions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </optgroup>
          )}
        </Select>
        {target.kind === 'version' && <Badge tone="accent">Tailored{job ? ` for ${job.title}` : ''}</Badge>}
        <div className="grow" />
        <Segmented
          value={r.kind || 'resume'}
          onChange={(v) => update(v === 'cv' ? { kind: v, order: r.order.includes('publications') ? r.order : [...r.order, 'publications'] } : { kind: v })}
          options={[{ value: 'resume', label: 'Resume' }, { value: 'cv', label: 'Academic CV' }]}
        />
        <Button size="sm" variant="ghost" icon="copy" onClick={duplicate}>Duplicate</Button>
        {target.kind === 'version' && (
          <>
            <Button size="sm" variant="ghost" icon="edit" onClick={() => setRenaming(target.name)}>Rename</Button>
            <Button size="sm" variant="ghost" icon="trash" onClick={() => setToDelete(target.id)}>Delete</Button>
          </>
        )}
      </div>

      <div className="resume-layout">
        <div className="stack-lg resume-editor">
          <Card id="sec-contact" title="Contact" description="How recruiters reach you">
            <ContactEditor value={r.contact} onChange={(v) => update({ contact: v })} />
          </Card>

          {r.order.map((s, i) => (
            <Card
              key={s}
              id={`sec-${s}`}
              title={SECTION_LABELS[s]}
              className={r.hidden.includes(s) ? 'section-hidden' : ''}
              actions={
                <div className="row" style={{ gap: 0 }}>
                  {EXTRA_SECTIONS.includes(s) && <Button size="sm" variant="ghost" icon="trash" onClick={() => removeSection(s)} aria-label={`Remove ${SECTION_LABELS[s]}`} title="Remove section (its content is kept)" />}
                  <Button size="sm" variant="ghost" icon={r.hidden.includes(s) ? 'eyeOff' : 'eye'} onClick={() => toggleHidden(s)} aria-label={r.hidden.includes(s) ? `Show ${SECTION_LABELS[s]}` : `Hide ${SECTION_LABELS[s]}`} title={r.hidden.includes(s) ? 'Hidden from resume' : 'Shown on resume'} />
                  <Button size="sm" variant="ghost" icon="chevronDown" style={{ transform: 'rotate(180deg)' }} disabled={i === 0} onClick={() => moveSection(s, -1)} aria-label={`Move ${SECTION_LABELS[s]} up`} />
                  <Button size="sm" variant="ghost" icon="chevronDown" disabled={i === r.order.length - 1} onClick={() => moveSection(s, 1)} aria-label={`Move ${SECTION_LABELS[s]} down`} />
                </div>
              }
            >
              {sectionBody[s]}
            </Card>
          ))}

          {EXTRA_SECTIONS.some((s) => !r.order.includes(s)) && (
            <div className="add-section">
              <span className="small muted">Add a section:</span>
              {EXTRA_SECTIONS.filter((s) => !r.order.includes(s)).map((s) => (
                <button key={s} type="button" className="filter-chip" onClick={() => addSection(s)}><Icon name="plus" size={11} /> {SECTION_LABELS[s]}</button>
              ))}
            </div>
          )}
        </div>

        <div className="resume-side">
          <div className="sticky-top stack">
            <HealthPanel analysis={analysis} onJump={jump} jobLabel={job ? `${job.title}${job.company ? ` at ${job.company}` : ''}` : ''} />
            <div id="sec-preview" className="row-between row-wrap" style={{ gap: 8 }}>
              <Segmented value={r.template} onChange={(v) => update({ template: v })} options={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))} />
              <div className="row" style={{ gap: 8 }}>
                <Select value={r.paper} onChange={(e) => update({ paper: e.target.value })} aria-label="Paper size" className="select-sm" style={{ width: 'auto' }}>
                  {Object.entries(PAPER).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                </Select>
                <span className={`small nowrap ${pages > 1.05 ? 'text-warning' : 'subtle'}`}>{pages <= 1.02 ? '1 page' : `${pages.toFixed(1)} pages`}</span>
              </div>
            </div>
            <ResumePaper r={r} certs={shownCerts} onPages={onPages} />
            <div className="row-between">
              <Button size="sm" variant="ghost" icon="sparkles" loading={reviewing} onClick={runReview}>Recruiter review</Button>
              <span className="tiny subtle">All templates are single-column, real text — safe for ATS.</span>
            </div>
          </div>
        </div>
      </div>

      {createPortal(<PrintableResume r={r} certs={shownCerts} />, document.body)}

      <TailorModal
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        resume={r}
        initialJobId={tailorJobId}
        onStart={ensureTailoredVersion}
        onApply={applyChange}
        onJobPicked={(id, j) => { tailorJobRef.current = { id, ...j }; if (id) setTailorJobId(id); }}
      />

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        size="lg"
        title="Import your existing resume"
        description="Open your current resume (PDF or Word) or LinkedIn profile, select all the text, copy it, and paste it here. AI sorts it into sections without changing your words."
        footer={<><Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button><Button variant="primary" icon="upload" loading={importing} onClick={runImport}>Import</Button></>}
      >
        {(r.experience.length > 0 || r.projects.length > 0) && <p className="small text-warning mb-2">This replaces the experience, projects, education and certifications in the version you’re editing. Duplicate it first if you want to keep a copy.</p>}
        <Textarea rows={14} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste your resume text here" />
      </Modal>

      <Modal open={!!review} onClose={() => setReview(null)} title="Recruiter review" description="A frank first-impression read, like a recruiter’s 6-second scan.">
        {review && (
          <div className="stack">
            <div className="row" style={{ gap: 16 }}>
              <Ring value={review.score || 0} size={72} tone={(review.score || 0) >= 75 ? 'success' : 'warning'} />
              <p className="small" style={{ color: 'var(--text)' }}>{review.first_impression}</p>
            </div>
            {review.strengths?.length > 0 && <div><div className="section-label">Strengths</div><ul className="check-list">{review.strengths.map((s, i) => <li key={i}><Icon name="checkCircle" size={14} className="text-success" />{s}</li>)}</ul></div>}
            {review.tips?.length > 0 && <div><div className="section-label">Improve</div><ul className="check-list">{review.tips.map((s, i) => <li key={i}><Icon name="arrowRight" size={14} />{s}</li>)}</ul></div>}
          </div>
        )}
      </Modal>

      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title="Rename version"
        footer={<><Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" onClick={renameVersion}>Save</Button></>}>
        <Field label="Name"><Input value={renaming || ''} onChange={(e) => setRenaming(e.target.value)} /></Field>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Delete this version?" description="Your main resume and other versions are not affected." onConfirm={deleteVersion} onCancel={() => setToDelete(null)} />
    </div>
  );
}

export default ResumeBuilder;
