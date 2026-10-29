import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, getUser, clearCache } from '../lib/api';
import { useToast } from '../components/Toast';
import { Button, Field, Input, Textarea, Select, Icon, Badge } from '../components/ui';
import { browserTz } from '../components/NotificationSettings';

const FIELDS = [
  { value: 'Technology', icon: 'zap', roles: 'Software Engineer, QA Engineer, Data Analyst', skills: 'Python, SQL, Git' },
  { value: 'Science & Research', icon: 'brain', roles: 'Research Associate, Lab Technician', skills: 'Cell culture, PCR, Excel' },
  { value: 'Healthcare', icon: 'target', roles: 'Registered Nurse, Medical Assistant', skills: 'Patient care, BLS, EHR' },
  { value: 'Business & Finance', icon: 'chart', roles: 'Financial Analyst, Accountant', skills: 'Excel, Accounting, QuickBooks' },
  { value: 'Marketing', icon: 'send', roles: 'Marketing Coordinator, Social Media Specialist', skills: 'SEO, Canva, Google Analytics' },
  { value: 'Engineering', icon: 'settings', roles: 'Civil Engineer, Mechanical Engineer', skills: 'AutoCAD, Revit, MATLAB' },
  { value: 'Education', icon: 'book', roles: 'Teacher, Tutor', skills: 'Lesson planning, Classroom management' },
  { value: 'Design', icon: 'edit', roles: 'UX Designer, Graphic Designer', skills: 'Figma, Adobe Creative Suite' },
  { value: 'Other', icon: 'compass', roles: 'Your target role', skills: 'Your top skills' },
];
const GOALS = [
  { value: 'job', label: 'Get a job or internship' },
  { value: 'switch', label: 'Switch careers' },
  { value: 'skill', label: 'Learn a new skill' },
  { value: 'exam', label: 'Pass an exam or certification' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const toast = useToast();
  const name = (getUser()?.name || '').split(' ')[0];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ field: '', goal: 'job', target_role: '', skills: '', level: 'entry', hours: 6 });
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const field = FIELDS.find((f) => f.value === form.field);

  useEffect(() => { api.get('/templates').then((r) => setTemplates(r.data.templates || [])).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const finish = async () => {
    setSaving(true);
    try {
      await api.post('/settings/onboarding', { ...form, timezone: browserTz() });
      clearCache();
      setStep(3);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save your answers'));
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    await api.post('/settings/onboarding/skip', { timezone: browserTz() }).catch(() => {});
    navigate('/dashboard', { replace: true });
  };

  const addTemplate = async (t) => {
    try {
      const r = await api.post(`/templates/import/${t.id}`);
      navigate(`/roadmaps/${r.data.roadmapId}`, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, 'Could not add the template'));
    }
  };

  const suggested = templates.filter((t) => t.category === form.field || (form.field === 'Technology' && ['Technology', 'Data'].includes(t.category))).slice(0, 3);
  const topic = form.target_role ? `${form.target_role.split(',')[0].trim()}${form.goal === 'exam' ? ' exam preparation' : ''}` : '';

  return (
    <div className="welcome">
      <div className="welcome-card fade-in">
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}><span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span><strong>Learnvoy</strong></div>
          {step < 3 && <button type="button" className="btn btn-ghost btn-sm" onClick={skip}>Skip for now</button>}
        </div>
        {step < 3 && <div className="welcome-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>}

        {step === 0 && (
          <div className="stack-lg">
            <div>
              <h1>Welcome{name ? `, ${name}` : ''}!</h1>
              <p className="muted">Three quick questions so Learnvoy fits your field — it works for science, healthcare, business, tech and more.</p>
            </div>
            <div>
              <div className="label mb-2">What field are you in (or heading into)?</div>
              <div className="field-grid">
                {FIELDS.map((f) => (
                  <button key={f.value} type="button" className={`field-option ${form.field === f.value ? 'active' : ''}`} onClick={() => setForm((x) => ({ ...x, field: f.value }))}>
                    <Icon name={f.icon} size={16} /> {f.value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-2">What’s your main goal?</div>
              <div className="chip-row">
                {GOALS.map((g) => <button key={g.value} type="button" className={`filter-chip ${form.goal === g.value ? 'active' : ''}`} onClick={() => setForm((x) => ({ ...x, goal: g.value }))}>{g.label}</button>)}
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" iconRight="arrowRight" disabled={!form.field} onClick={() => setStep(1)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="stack-lg">
            <div>
              <h1>Where are you headed?</h1>
              <p className="muted">We use this to match jobs, start your resume and suggest a roadmap.</p>
            </div>
            <Field label={form.goal === 'exam' ? 'Exam or certification' : 'Target role'} hint="Separate several with commas.">
              <Input autoFocus value={form.target_role} onChange={set('target_role')} placeholder={form.goal === 'exam' ? 'e.g. NCLEX-RN, CPA, AWS Cloud Practitioner' : `e.g. ${field?.roles || 'Research Associate'}`} />
            </Field>
            <Field label="Skills you already have" hint="Anything counts — class labs, part-time jobs, projects.">
              <Textarea rows={3} value={form.skills} onChange={set('skills')} placeholder={`e.g. ${field?.skills || 'Excel, communication'}`} />
            </Field>
            <Field label="Experience level">
              <Select value={form.level} onChange={set('level')}>
                <option value="intern">Student / intern</option>
                <option value="entry">Entry level (0–2 years)</option>
                <option value="mid">Mid level (3–6 years)</option>
                <option value="senior">Senior (7+ years)</option>
              </Select>
            </Field>
            <div className="row-between">
              <Button variant="ghost" icon="arrowLeft" onClick={() => setStep(0)}>Back</Button>
              <Button variant="primary" iconRight="arrowRight" disabled={!form.target_role.trim()} onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack-lg">
            <div>
              <h1>How much time can you give it?</h1>
              <p className="muted">We’ll size your roadmap and daily goal to fit your week.</p>
            </div>
            <div className="chip-row">
              {[[3, '2–3 hrs/week'], [6, '5–6 hrs/week'], [10, '10 hrs/week'], [20, '20+ hrs/week']].map(([h, l]) => (
                <button key={h} type="button" className={`filter-chip ${Number(form.hours) === h ? 'active' : ''}`} onClick={() => setForm((x) => ({ ...x, hours: h }))}>{l}</button>
              ))}
            </div>
            <div className="row-between">
              <Button variant="ghost" icon="arrowLeft" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" loading={saving} icon="check" onClick={finish}>Finish setup</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack-lg">
            <div>
              <Badge tone="success" dot>All set</Badge>
              <h1 className="mt-2">Let’s start your first roadmap</h1>
              <p className="muted">Your job matches and a starter resume are ready. Pick a starting point:</p>
            </div>
            <button type="button" className="start-option primary" onClick={() => navigate(`/ai-generator?topic=${encodeURIComponent(topic)}`, { replace: true })}>
              <span className="list-icon"><Icon name="wand" size={16} /></span>
              <span className="grow"><strong>Build a personal roadmap with AI</strong><span className="tiny subtle">{topic ? `For “${topic}” — tailored to your skills and ${form.hours} hrs/week` : 'Tailored to your goal and schedule'}</span></span>
              <Icon name="chevronRight" size={16} />
            </button>
            {suggested.map((t) => (
              <button key={t.id} type="button" className="start-option" onClick={() => addTemplate(t)}>
                <span className="list-icon"><Icon name="layers" size={16} /></span>
                <span className="grow"><strong>{t.title}</strong><span className="tiny subtle">Template · {t.modules.length} modules · {t.duration}</span></span>
                <Icon name="chevronRight" size={16} />
              </button>
            ))}
            <div className="row-between row-wrap">
              <Button variant="ghost" icon="briefcase" onClick={() => navigate('/jobs', { replace: true })}>See my job matches</Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard', { replace: true })}>Go to dashboard</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
