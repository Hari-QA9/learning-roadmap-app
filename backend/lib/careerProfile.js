// A member's career profile (target roles, skills…) used for job matching.
// Falls back to the skills in their saved resume.
const db = require('../db');
const { normaliseSkills } = require('./skills');
const { resumeToText } = require('./resumeText');

const q = () => db.promise();
const parse = (v, d) => { if (!v) return d; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return d; } };

async function loadProfile(userId) {
  const [rows] = await q().query('SELECT * FROM career_profiles WHERE user_id = ?', [userId]);
  const p = rows[0] || {};
  let skills = parse(p.skills, []);
  let fromResume = false;
  if (!skills.length) {
    // Fall back to the skills in the member's saved resume.
    const [r] = await q().query('SELECT resume_data FROM user_resumes WHERE user_id = ? LIMIT 1', [userId]).catch(() => [[]]);
    const resume = r[0] ? resumeToText(r[0].resume_data) : {};
    skills = normaliseSkills(resume.skills || '');
    fromResume = skills.length > 0;
  }
  return {
    target_roles: parse(p.target_roles, []),
    skills,
    level: p.level || '',
    locations: parse(p.locations, []),
    remote_only: !!Number(p.remote_only || 0),
    exists: !!rows[0],
    fromResume,
  };
}

module.exports = { loadProfile };
