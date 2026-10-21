// Resume data model, upgrade from the old free-text format, live quality checks
// and plain-text export. No AI here — everything runs instantly as you type.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const SECTION_LABELS = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
};
export const DEFAULT_ORDER = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications'];

export const emptyEntry = (kind) => {
  switch (kind) {
    case 'experience': return { id: uid(), title: '', company: '', location: '', start: '', end: '', current: false, bullets: [''] };
    case 'projects': return { id: uid(), name: '', tech: '', link: '', start: '', end: '', bullets: [''] };
    case 'education': return { id: uid(), degree: '', school: '', location: '', start: '', end: '', details: '' };
    case 'certifications': return { id: uid(), name: '', issuer: '', date: '', link: '' };
    default: return { id: uid() };
  }
};

export const EMPTY_RESUME = () => ({
  version: 2,
  contact: { name: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '' },
  summary: '',
  skills: [{ id: uid(), group: '', items: '' }],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  order: [...DEFAULT_ORDER],
  hidden: [],
  template: 'classic',
  paper: 'letter',
  includeLearnMapCerts: true,
});

/* ---------- Upgrade the old free-text resume (v1) ---------- */
// v1 blocks looked like: "Title, Company | Dates" followed by "- bullet" lines.
function parseBlocks(text) {
  const blocks = [];
  let cur = null;
  String(text || '').split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const b = line.match(/^[-•*]\s*(.*)/);
    if (b && cur) { cur.bullets.push(b[1]); return; }
    const [head, ...rest] = line.split('|').map((s) => s.trim());
    cur = { head, dates: rest.join(' '), bullets: [] };
    blocks.push(cur);
  });
  return blocks;
}

function splitDates(dates) {
  const [start = '', end = ''] = String(dates || '').split(/\s*[–—-]\s*|\s+to\s+/i);
  const current = /present|current|now/i.test(end);
  return { start: start.trim(), end: current ? '' : end.trim(), current };
}

export function upgradeResume(saved) {
  if (!saved) return EMPTY_RESUME();
  if (saved.version === 2) {
    const base = EMPTY_RESUME();
    return { ...base, ...saved, contact: { ...base.contact, ...(saved.contact || {}) }, order: saved.order?.length ? saved.order : base.order };
  }
  const r = EMPTY_RESUME();
  r.contact = {
    name: saved.name || '', headline: saved.goal || '', email: saved.email || '', phone: saved.phone || '',
    location: saved.location || '', linkedin: saved.linkedin || '', website: saved.github || '',
  };
  r.summary = saved.summary || '';
  if (saved.skills) r.skills = [{ id: uid(), group: '', items: saved.skills }];
  r.experience = parseBlocks(saved.experience).map((b) => {
    const [title, ...company] = b.head.split(',').map((s) => s.trim());
    return { ...emptyEntry('experience'), title, company: company.join(', '), ...splitDates(b.dates), bullets: b.bullets.length ? b.bullets : [''] };
  });
  r.education = parseBlocks(saved.education).map((b) => {
    const [degree, ...school] = b.head.split(',').map((s) => s.trim());
    const d = splitDates(b.dates);
    return { ...emptyEntry('education'), degree, school: school.join(', '), start: d.end ? d.start : '', end: d.end || d.start, details: b.bullets.join('\n') };
  });
  if (saved.template) r.template = saved.template === 'minimal' ? 'compact' : saved.template;
  if (typeof saved.includeCerts === 'boolean') r.includeLearnMapCerts = saved.includeCerts;
  return r;
}

/* ---------- Helpers ---------- */
export const skillList = (r) => r.skills.flatMap((g) => String(g.items || '').split(',')).map((s) => s.trim()).filter(Boolean);
export const dateRange = (e) => [e.start, e.current ? 'Present' : e.end].filter(Boolean).join(' – ');
export const visible = (r, section) => !r.hidden.includes(section);
const cleanBullets = (e) => (e.bullets || []).map((b) => b.trim()).filter(Boolean);
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);

/** Everything the resume says, as one string (for keyword checks). */
export function resumeText(r) {
  return [
    r.contact.headline, r.summary, skillList(r).join(', '),
    ...r.experience.map((e) => [e.title, e.company, ...cleanBullets(e)].join(' ')),
    ...r.projects.map((p) => [p.name, p.tech, ...cleanBullets(p)].join(' ')),
    ...r.education.map((e) => [e.degree, e.school, e.details].join(' ')),
    ...r.certifications.map((c) => [c.name, c.issuer].join(' ')),
  ].filter(Boolean).join('\n');
}

/** Plain-text resume for pasting into application forms. */
export function toPlainText(r, learnMapCerts = []) {
  const c = r.contact;
  const out = [c.name, c.headline, [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean).join(' | '), ''];
  const H = (t) => out.push(t.toUpperCase());
  for (const s of r.order) {
    if (!visible(r, s)) continue;
    if (s === 'summary' && r.summary.trim()) { H('Summary'); out.push(r.summary.trim(), ''); }
    if (s === 'skills' && skillList(r).length) {
      H('Skills');
      r.skills.filter((g) => g.items.trim()).forEach((g) => out.push(g.group ? `${g.group}: ${g.items}` : g.items));
      out.push('');
    }
    if (s === 'experience' && r.experience.length) {
      H('Experience');
      r.experience.forEach((e) => { out.push([[e.title, e.company].filter(Boolean).join(', '), e.location, dateRange(e)].filter(Boolean).join(' | ')); cleanBullets(e).forEach((b) => out.push(`- ${b}`)); out.push(''); });
    }
    if (s === 'projects' && r.projects.length) {
      H('Projects');
      r.projects.forEach((p) => { out.push([p.name, p.tech, p.link, dateRange(p)].filter(Boolean).join(' | ')); cleanBullets(p).forEach((b) => out.push(`- ${b}`)); out.push(''); });
    }
    if (s === 'education' && r.education.length) {
      H('Education');
      r.education.forEach((e) => { out.push([[e.degree, e.school].filter(Boolean).join(', '), e.location, dateRange(e)].filter(Boolean).join(' | ')); if (e.details) out.push(e.details); });
      out.push('');
    }
    if (s === 'certifications' && (r.certifications.length || learnMapCerts.length)) {
      H('Certifications');
      r.certifications.forEach((x) => out.push([x.name, x.issuer, x.date].filter(Boolean).join(' | ')));
      learnMapCerts.forEach((x) => out.push(`${x.roadmap_title} | LearnMap | ${new Date(x.issued_at).getFullYear()}`));
      out.push('');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- Live checks ---------- */
const ACTION_VERBS = new Set(`accelerated achieved administered analyzed architected audited authored automated boosted built
championed collaborated configured consolidated constructed coordinated created cut debugged decreased defined delivered deployed
designed developed diagnosed documented doubled drove eliminated enabled engineered enhanced established evaluated executed expanded
facilitated finalized fixed founded generated grew guided identified implemented improved increased initiated innovated inspected
installed instituted integrated introduced investigated launched led maintained managed mapped mentored migrated minimized modernized
monitored negotiated optimized orchestrated organized overhauled oversaw partnered performed piloted planned prepared presented
prioritized produced programmed proposed prototyped published raised rebuilt redesigned reduced refactored reengineered resolved
restructured revamped reviewed saved scaled scheduled secured shipped simplified solved spearheaded standardized streamlined
strengthened supervised supported surveyed tested trained transformed tripled troubleshot unified upgraded validated verified wrote
calculated drafted estimated modeled coached handled operated processed tracked ran owned`.split(/\s+/));
const PRESENT_VERBS = /^(build|lead|manage|develop|design|create|maintain|write|test|automate|analyze|improve|own|run|deliver|implement)s?\b/i;
const WEAK_STARTS = /^(responsible for|worked on|helped|assisted|duties included|tasked with|involved in|participated in|in charge of)\b/i;
const CLICHES = ['hard-working', 'hardworking', 'team player', 'detail-oriented', 'detail oriented', 'go-getter', 'results-driven', 'self-starter', 'think outside the box', 'synergy', 'dynamic individual', 'passionate about'];
const PRONOUNS = /\b(I|me|my|mine|myself)\b/;
const HAS_NUMBER = /\d|%|\$|\b(one|two|three|four|five|ten|hundred|thousand|million)\b/i;
const DATE_FORMAT = /^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?\d{4}$/i;

/**
 * Score the resume against what recruiters and ATS look for.
 * Returns { score, checks: [{ id, ok, level, title, detail, section }] }.
 */
export function analyzeResume(r, { pages = 1, jobSkills = null, learnMapCerts = 0 } = {}) {
  const checks = [];
  const add = (id, weight, ok, title, detail, section, level = 'warn') => checks.push({ id, weight, ok: !!ok, title, detail, section, level: ok ? 'ok' : level });
  const c = r.contact;
  const show = (s) => visible(r, s);

  // Contact
  const missingContact = [['name', 'name'], ['email', 'email'], ['phone', 'phone'], ['location', 'city & state']].filter(([k]) => !c[k]?.trim()).map(([, l]) => l);
  add('contact', 3, !missingContact.length, 'Complete contact details', missingContact.length ? `Add your ${missingContact.join(', ')}.` : 'Name, email, phone and location are all there.', 'contact', 'error');
  add('linkedin', 1, !!c.linkedin?.trim(), 'LinkedIn profile', c.linkedin ? 'Recruiters check it — good.' : 'Most recruiters look you up on LinkedIn. Add your profile URL.', 'contact');
  add('headline', 1, !!c.headline?.trim(), 'Target job title under your name', c.headline ? `Showing “${c.headline}”.` : 'Add the role you want (e.g. “QA Automation Engineer”) so recruiters and ATS see it first.', 'contact');

  // Summary
  if (show('summary')) {
    const n = words(r.summary).length;
    add('summary', 2, n >= 30 && n <= 90, 'Summary of 2–4 sentences', !n ? 'Add a short summary: who you are, your strongest skills, what you want next.' : n < 30 ? `Only ${n} words — add your top skills and the value you bring.` : n > 90 ? `${n} words — trim to under 90 so it’s read in 10 seconds.` : `${n} words — good length.`, 'summary');
  }

  // Skills
  const skills = skillList(r);
  add('skills', 2, skills.length >= 8 && skills.length <= 30, '8–30 relevant skills', skills.length < 8 ? `You list ${skills.length}. ATS match on keywords — add the tools and languages you actually use.` : skills.length > 30 ? `You list ${skills.length}. Keep the 30 most relevant so the important ones stand out.` : `${skills.length} skills listed.`, 'skills', skills.length < 3 ? 'error' : 'warn');

  // Experience / projects
  const entries = [...(show('experience') ? r.experience : []), ...(show('projects') ? r.projects : [])];
  add('entries', 3, entries.length > 0, 'Experience or projects', entries.length ? `${r.experience.length} role${r.experience.length === 1 ? '' : 's'}, ${r.projects.length} project${r.projects.length === 1 ? '' : 's'}.` : 'Add at least one job or project — students should list 2–3 strong projects.', 'experience', 'error');

  const bullets = entries.flatMap((e) => cleanBullets(e).map((b) => ({ b, e })));
  if (bullets.length) {
    const weak = bullets.filter(({ b }) => WEAK_STARTS.test(b));
    const noVerb = bullets.filter(({ b }) => !WEAK_STARTS.test(b) && !ACTION_VERBS.has(words(b)[0]?.toLowerCase().replace(/[^a-z]/g, '')));
    add('verbs', 3, !weak.length && noVerb.length <= Math.floor(bullets.length * 0.2), 'Bullets start with strong action verbs',
      weak.length ? `${weak.length} bullet${weak.length > 1 ? 's start' : ' starts'} with weak phrases like “${words(weak[0].b).slice(0, 2).join(' ')}”. Start with what you did: Built, Automated, Reduced…` :
        noVerb.length > Math.floor(bullets.length * 0.2) ? `${noVerb.length} bullets don’t start with an action verb, e.g. “${words(noVerb[0].b).slice(0, 4).join(' ')}…”.` : 'Nice — your bullets lead with action.', 'experience');

    const quantified = bullets.filter(({ b }) => HAS_NUMBER.test(b)).length;
    const pct = Math.round((quantified / bullets.length) * 100);
    add('metrics', 3, pct >= 50, 'At least half of bullets show numbers', `${quantified} of ${bullets.length} bullets (${pct}%) have a number, %, $ or count. Recruiters trust impact they can measure — e.g. “cut test time by 40%”.`, 'experience');

    const long = bullets.filter(({ b }) => words(b).length > 32);
    const short = bullets.filter(({ b }) => words(b).length < 6);
    add('length', 2, !long.length && !short.length, 'Bullets are 1–2 lines', long.length ? `${long.length} bullet${long.length > 1 ? 's are' : ' is'} over 32 words — split or tighten.` : short.length ? `${short.length} bullet${short.length > 1 ? 's are' : ' is'} very short — add the result or tool used.` : 'Bullet lengths look good.', 'experience');

    const firstWords = bullets.map(({ b }) => words(b)[0]?.toLowerCase());
    const repeats = Object.entries(firstWords.reduce((m, w) => ({ ...m, [w]: (m[w] || 0) + 1 }), {})).filter(([w, n]) => w && n >= 3);
    add('variety', 1, !repeats.length, 'Varied verbs', repeats.length ? `“${repeats[0][0]}” starts ${repeats[0][1]} bullets — vary it (Built, Designed, Shipped…).` : 'Good verb variety.', 'experience');

    const ended = r.experience.filter((e) => !e.current && e.end);
    const tense = ended.flatMap((e) => cleanBullets(e)).filter((b) => PRESENT_VERBS.test(b));
    add('tense', 1, !tense.length, 'Past tense for past roles', tense.length ? `${tense.length} bullet${tense.length > 1 ? 's in finished roles use' : ' in a finished role uses'} present tense (“${words(tense[0]).slice(0, 3).join(' ')}…”). Use past tense: Built, Led…` : 'Tense is consistent.', 'experience');

    const perRole = r.experience.filter((e) => cleanBullets(e).length < 2 || cleanBullets(e).length > 6);
    add('bulletcount', 1, !perRole.length, '2–6 bullets per role', perRole.length ? `“${perRole[0].title || 'A role'}” has ${cleanBullets(perRole[0]).length} bullet${cleanBullets(perRole[0]).length === 1 ? '' : 's'} — aim for 2–6.` : 'Each role has a healthy number of bullets.', 'experience');
  }

  // Dates
  const dated = [...r.experience, ...r.projects, ...r.education];
  const undated = r.experience.filter((e) => !e.start || (!e.end && !e.current));
  const odd = dated.flatMap((e) => [e.start, e.end]).filter((d) => d && !DATE_FORMAT.test(d.trim()));
  add('dates', 2, !undated.length && !odd.length, 'Clear, consistent dates', undated.length ? `“${undated[0].title || 'A role'}” is missing a start or end date.` : odd.length ? `Use one format like “Jan 2024” or “2024” (found “${odd[0]}”).` : 'Dates are consistent.', 'experience');

  // Education
  if (show('education')) add('education', 2, r.education.length > 0, 'Education', r.education.length ? 'Listed.' : 'Add your degree(s) — most US job filters check for it.', 'education', 'error');

  // Language
  const all = resumeText(r);
  const pron = [r.summary, ...bullets.map((x) => x.b)].filter((s) => PRONOUNS.test(s));
  add('pronouns', 1, !pron.length, 'No “I / my”', pron.length ? 'Resumes skip first person — write “Built…” instead of “I built…”.' : 'No first-person pronouns.', 'summary');
  const cliches = CLICHES.filter((x) => all.toLowerCase().includes(x));
  add('cliches', 1, !cliches.length, 'No filler buzzwords', cliches.length ? `Replace “${cliches.join('”, “')}” with proof (a project or result).` : 'No filler phrases found.', 'summary');

  // Length
  const years = r.experience.reduce((n, e) => {
    const s = parseInt(String(e.start).match(/\d{4}/)?.[0], 10);
    const f = e.current ? new Date().getFullYear() : parseInt(String(e.end).match(/\d{4}/)?.[0], 10);
    return s && f && f >= s ? n + (f - s) : n;
  }, 0);
  const maxPages = years >= 10 ? 2 : 1;
  add('pages', 3, pages <= maxPages + 0.05, `Fits on ${maxPages} page${maxPages > 1 ? 's' : ''}`, pages <= maxPages + 0.05 ? `About ${pages.toFixed(1)} page${pages >= 1.5 ? 's' : ''}.` : `About ${pages.toFixed(1)} pages. With under 10 years of experience, recruiters expect 1 page — trim older bullets or try the Compact template.`, 'layout', 'error');

  // Certifications (light nudge only)
  if (!r.certifications.length && !learnMapCerts) add('certs', 0.5, false, 'Certifications (optional)', 'A relevant certificate (AWS, ISTQB, a finished LearnMap roadmap…) can help you pass filters.', 'certifications', 'info');

  // Job keywords
  if (jobSkills && jobSkills.length) {
    const lower = all.toLowerCase();
    const found = jobSkills.filter((s) => lower.includes(s.toLowerCase()));
    const pct = Math.round((found.length / jobSkills.length) * 100);
    add('keywords', 4, pct >= 70, 'Matches the job’s keywords', `${found.length} of ${jobSkills.length} job keywords (${pct}%). Missing: ${jobSkills.filter((s) => !found.includes(s)).slice(0, 8).join(', ') || 'none'}. Only add skills you really have.`, 'skills');
  }

  const total = checks.reduce((n, x) => n + x.weight, 0);
  const got = checks.reduce((n, x) => n + (x.ok ? x.weight : 0), 0);
  return { score: total ? Math.round((got / total) * 100) : 0, checks };
}
