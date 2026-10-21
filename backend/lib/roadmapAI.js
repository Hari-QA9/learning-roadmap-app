// Two-pass roadmap generation:
//   1. plan  — the whole roadmap: outcomes, modules with hours, capstone
//   2. depth — each module in detail (in parallel): objectives, concrete tasks,
//              steps, "done when", resources, a mini-project, interview questions
// Resources: the AI picks from a hand-picked library of real, free resources
// (resourceLibrary.js) and may name exact pages, which are checked before use.
// Anything it can't link directly becomes a clearly-labelled search.
const { generateJSON } = require('./gemini');
const { relevantResources } = require('./resourceLibrary');
const { resolveResources } = require('./resources');

const TASK_TYPES = ['learn', 'practice', 'build', 'review'];

const { searchLink } = require('./resources');
const linkFor = (r) => searchLink(r).url;

/** The library entries that fit this learner, as a compact list for the prompt. */
function libraryFor(p, extra = '') {
  const picks = relevantResources(`${p.topic} ${p.goal || ''} ${p.background || ''} ${extra}`, 28);
  return picks.map((r) => `- ${r.id}: ${r.title} (${r.type}) — ${r.tags.slice(0, 5).join(', ')}`).join('\n');
}

const RESOURCE_RULES = `Resources:
- First choose from the VERIFIED LIBRARY below by its id ("libraryId") whenever one fits — these are real, free pages.
- If something more specific would help (an official docs page, a free textbook chapter, a well-known guide), you may give its exact "url", but only if you are confident it exists. It will be checked; broken links are replaced with a search.
- For videos, give a precise "query" (topic + a respected channel name).
- Prefer free resources. Match the field: lab protocols for lab skills, official exam sites for exams, textbooks for theory, practice sites for skills.`;

const arr = (x, n = 12) => (Array.isArray(x) ? x.filter(Boolean).map(String).slice(0, n) : []);
const num = (x, d) => { const v = Math.round(Number(x)); return Number.isFinite(v) && v > 0 ? v : d; };

function profileText(p) {
  return [
    `Topic: ${p.topic}`,
    `Learner's goal: ${p.goal || 'become confident and practical with the topic'}`,
    `Current level: ${p.level || 'beginner'}`,
    `Already knows: ${p.background || 'nothing specific'}`,
    `Time available: ${p.hoursPerWeek || 6} hours per week for ${p.duration || '4 weeks'}`,
    `Prefers learning by: ${p.style || 'a mix of videos, reading and hands-on practice'}`,
  ].join('\n');
}

async function planRoadmap(p) {
  const library = libraryFor(p);
  const data = await generateJSON(`You are an expert curriculum designer and an experienced practitioner in the learner's field (science, healthcare, business, engineering, technology, education, the arts…). Design a personalised, practical learning roadmap.

${profileText(p)}

Rules:
- Fit the total effort to the time available (hours per week × weeks). Be realistic.
- Order modules so each builds on the previous one. Skip what the learner already knows.
- Aim modules at the learner's goal (e.g. job-ready skills and portfolio work if the goal is a job).
- 4 to 7 modules. Each module has a clear outcome, not just a topic name.
- Include one capstone project that proves the goal has been met and is portfolio-worthy. Make it fit the field: e.g. a research poster or lab report for science, a case study or care plan for healthcare, a financial model for finance, a campaign for marketing, an app for software.

${RESOURCE_RULES}

VERIFIED LIBRARY (id: title):
${library}

Return JSON:
{
  "title": "specific, motivating title",
  "description": "2 sentences on what this roadmap gets the learner",
  "goal": "one-sentence measurable outcome",
  "outcomes": ["by the end you can …", "… 4-6 items"],
  "prerequisites": ["only things truly needed before starting"],
  "modules": [ { "title": "string", "summary": "1-2 sentences", "outcome": "what the learner can do after it", "est_hours": number, "week": "e.g. Week 1-2" } ],
  "capstone": { "title": "string", "brief": "2-3 sentences", "features": ["must-have feature", "..."], "stretch": ["optional extra", "..."], "showcase": "how to present it (README, demo, etc.)" },
  "resources": [ { "libraryId": "id from the library, if one fits", "title": "string", "type": "video|docs|course|article|practice|book|tool", "url": "exact page (optional)", "site": "domain", "query": "search words", "why": "one short line on why it helps" } ]
}`);

  const modules = (Array.isArray(data.modules) ? data.modules : []).slice(0, 8).map((m, i) => ({
    title: String(m.title || `Module ${i + 1}`),
    summary: String(m.summary || ''),
    outcome: String(m.outcome || ''),
    est_hours: num(m.est_hours, 6),
    week: String(m.week || `Week ${i + 1}`),
  }));
  if (!modules.length) throw new Error('The AI response was not valid JSON. Please try again.');

  return {
    title: String(data.title || `${p.topic} roadmap`),
    description: String(data.description || ''),
    goal: String(data.goal || p.goal || ''),
    outcomes: arr(data.outcomes, 8),
    prerequisites: arr(data.prerequisites, 6),
    modules,
    capstone: data.capstone && data.capstone.title ? {
      title: String(data.capstone.title),
      brief: String(data.capstone.brief || ''),
      features: arr(data.capstone.features, 10),
      stretch: arr(data.capstone.stretch, 6),
      showcase: String(data.capstone.showcase || ''),
    } : null,
    resources: await resolveResources(data.resources, 5),
  };
}

async function detailModule(p, plan, mod, index) {
  const others = plan.modules.map((m, i) => `${i + 1}. ${m.title}${i === index ? '  ← THIS MODULE' : ''}`).join('\n');
  const library = libraryFor(p, `${mod.title} ${mod.summary}`);
  const data = await generateJSON(`You are an experienced practitioner and mentor in the learner's field. Write module ${index + 1} of their roadmap in depth.

${profileText(p)}

Roadmap: ${plan.title}
All modules:
${others}

This module: "${mod.title}" — ${mod.summary}
Outcome: ${mod.outcome}
Time budget: about ${mod.est_hours} hours.

Rules:
- 4 to 7 tasks that fit the time budget. Mix types: "learn" (study a concept), "practice" (exercises), "build" (make something), "review" (consolidate / self-test).
- Every task must be concrete and specific to this topic — name the exact concepts, techniques, tools, procedures or exercises (lab methods, clinical skills, formulas, software, commands…). No vague tasks like "learn the basics".
- "instructions": 2-3 sentences telling the learner exactly what to do and why it matters.
- "steps": 3-5 short, actionable steps.
- "done_when": 1-3 checkable criteria so the learner knows they're finished.
- 1-3 resources per task.
${RESOURCE_RULES}

VERIFIED LIBRARY (id: title):
${library}
- Finish with a small module project that applies everything in this module.

Return JSON:
{
  "objectives": ["the learner will be able to …", "3-5 items"],
  "key_concepts": ["short concept names", "5-10 items"],
  "tasks": [ {
    "title": "short imperative title",
    "type": "learn|practice|build|review",
    "est_minutes": number,
    "instructions": "string",
    "steps": ["string"],
    "done_when": ["string"],
    "resources": [ { "libraryId": "id if one fits", "title": "what it is", "type": "video|docs|article|course|practice|book|tool", "url": "exact page (optional)", "site": "domain", "query": "search words" } ]
  } ],
  "project": { "title": "string", "brief": "2 sentences", "requirements": ["string"], "stretch": ["string"] },
  "interview_questions": ["realistic interview or exam question on this module", "3-5 items"],
  "common_mistakes": ["mistake learners make here", "2-4 items"]
}`);

  const rawTasks = (Array.isArray(data.tasks) ? data.tasks : []).slice(0, 8);
  const resolved = await Promise.all(rawTasks.map((t) => resolveResources(t.resources, 3)));
  const tasks = rawTasks.map((t, j) => ({
    title: String(t.title || `Task ${j + 1}`).slice(0, 250),
    type: TASK_TYPES.includes(String(t.type).toLowerCase()) ? String(t.type).toLowerCase() : 'learn',
    est_minutes: num(t.est_minutes, 45),
    instructions: String(t.instructions || ''),
    steps: arr(t.steps, 8),
    done_when: arr(t.done_when, 4),
    resources: resolved[j],
  }));

  return {
    objectives: arr(data.objectives, 6),
    key_concepts: arr(data.key_concepts, 12),
    tasks,
    project: data.project && data.project.title ? {
      title: String(data.project.title), brief: String(data.project.brief || ''),
      requirements: arr(data.project.requirements, 8), stretch: arr(data.project.stretch, 5),
    } : null,
    interview_questions: arr(data.interview_questions, 6),
    common_mistakes: arr(data.common_mistakes, 5),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run tasks with limited parallelism so free-tier rate limits aren't hit,
// retrying each one up to twice with a short back-off.
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      for (let attempt = 0; ; attempt++) {
        try { out[i] = await fn(items[i], i); break; }
        catch (err) {
          if (attempt >= 2) throw err;
          await sleep(/quota|429|rate/i.test(err.message) ? 6000 * (attempt + 1) : 1500);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function generateRoadmap(p, onProgress = () => {}) {
  onProgress('plan');
  const plan = await planRoadmap(p);
  onProgress('modules', plan.modules.length);
  const details = await pool(plan.modules, 3, (m, i) => detailModule(p, plan, m, i));
  return { plan, details };
}

module.exports = { generateRoadmap, linkFor };
