// Reads a saved resume (old free-text format or the new structured one) and
// returns plain strings, so the job board and AI prompts work with either.
const parse = (v) => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return {}; } };
const bullets = (e) => (e.bullets || []).map((b) => String(b).trim()).filter(Boolean);
const range = (e) => [e.start, e.current ? 'Present' : e.end].filter(Boolean).join(' – ');

function resumeToText(raw) {
  const r = parse(raw);
  if (r.version !== 2) {
    return {
      name: r.name || '', headline: r.goal || '', summary: r.summary || '', skills: r.skills || '',
      experience: r.experience || '', projects: '', education: r.education || '', certifications: '',
    };
  }
  const c = r.contact || {};
  return {
    name: c.name || '',
    headline: c.headline || '',
    summary: r.summary || '',
    skills: (r.skills || []).flatMap((g) => String(g.items || '').split(',')).map((s) => s.trim()).filter(Boolean).join(', '),
    experience: (r.experience || []).map((e) => [`${[e.title, e.company].filter(Boolean).join(', ')} | ${range(e)}`, ...bullets(e).map((b) => `- ${b}`)].join('\n')).join('\n\n'),
    projects: (r.projects || []).map((p) => [`${[p.name, p.tech].filter(Boolean).join(' — ')} | ${range(p)}`, ...bullets(p).map((b) => `- ${b}`)].join('\n')).join('\n\n'),
    education: (r.education || []).map((e) => `${[e.degree, e.school].filter(Boolean).join(', ')} | ${range(e)}${e.details ? `\n${e.details}` : ''}`).join('\n'),
    certifications: (r.certifications || []).map((x) => [x.name, x.issuer, x.date].filter(Boolean).join(' | ')).join('\n'),
  };
}

/** One block of text for AI prompts. */
function resumeForPrompt(raw) {
  const t = resumeToText(raw);
  return `Name: ${t.name}
Target role: ${t.headline || 'not set'}
Summary: ${t.summary || 'not provided'}
Skills: ${t.skills || 'not provided'}
Experience:
${t.experience || 'not provided'}
Projects:
${t.projects || 'none'}
Education:
${t.education || 'not provided'}
Certifications:
${t.certifications || 'none'}`.slice(0, 9000);
}

module.exports = { resumeToText, resumeForPrompt };
