const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { generateJSON, getModel, sendAIError } = require('../lib/gemini');
const { insertTask } = require('../lib/tasks');
const { generateRoadmap } = require('../lib/roadmapAI');
const rateLimit = require('../lib/rateLimit');
const roadmapLimit = rateLimit({ max: 10, name: 'roadmaps' });
const aiLimit = rateLimit({ max: 60, name: 'requests' });

const q = () => db.promise();
const soft = (p) => p.catch((e) => console.log('[ai] skipped:', e.message));

// Insert a row; if an optional column doesn't exist in this database yet, retry without it.
async function insertOptional(table, base, optional) {
  const cols = { ...base, ...optional };
  for (let attempt = 0; attempt < 3; attempt++) {
    const keys = Object.keys(cols);
    try {
      const [r] = await q().query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => cols[k]));
      return r;
    } catch (err) {
      const bad = Object.keys(optional).find((k) => k in cols && new RegExp(`\\b${k}\\b`, 'i').test(err.message));
      if (!bad) throw err;
      delete cols[bad];
    }
  }
  throw new Error(`Could not insert into ${table}`);
}

// GENERATE ROADMAP — personalised, two-pass, saved with full details
router.post('/generate', auth, roadmapLimit, async (req, res) => {
  const b = req.body || {};
  const topic = String(b.topic || '').trim();
  if (!topic) return res.status(400).json({ message: 'Topic is required' });
  const profile = {
    topic,
    goal: String(b.goal || '').trim(),
    level: b.level || 'beginner',
    background: String(b.background || '').trim(),
    hoursPerWeek: Math.min(60, Math.max(1, parseInt(b.hoursPerWeek, 10) || 6)),
    duration: b.duration || '4 weeks',
    style: b.style || '',
  };

  let result;
  try {
    result = await generateRoadmap(profile);
  } catch (err) {
    return sendAIError(res, err, 'Could not generate the roadmap. Please try again.');
  }

  const { plan, details } = result;
  try {
    const totalHours = plan.modules.reduce((n, m) => n + (m.est_hours || 0), 0);
    const r = await insertOptional('roadmaps',
      { user_id: req.user.id, title: plan.title, description: plan.description, goal: plan.goal, duration: profile.duration, status: 'active' },
      { details: JSON.stringify({
        version: 2, profile, outcomes: plan.outcomes, prerequisites: plan.prerequisites,
        capstone: plan.capstone, total_hours: totalHours, hours_per_week: profile.hoursPerWeek,
      }) }
    );
    const roadmapId = r.insertId;

    for (let i = 0; i < plan.modules.length; i++) {
      const mod = plan.modules[i];
      const d = details[i] || { tasks: [] };
      const m = await insertOptional('modules',
        { roadmap_id: roadmapId, title: mod.title, description: mod.summary, order_index: i, position: i },
        { details: JSON.stringify({
          outcome: mod.outcome, est_hours: mod.est_hours, week: mod.week,
          objectives: d.objectives, key_concepts: d.key_concepts, project: d.project,
          interview_questions: d.interview_questions, common_mistakes: d.common_mistakes,
        }) }
      );
      for (let j = 0; j < d.tasks.length; j++) {
        const t = d.tasks[j];
        await insertTask({
          userId: req.user.id, roadmapId, moduleId: m.insertId, title: t.title, description: t.instructions,
          position: j, taskType: t.type, estMinutes: t.est_minutes,
          details: { steps: t.steps, done_when: t.done_when, resources: t.resources },
        });
      }
    }

    for (const res0 of plan.resources) {
      await soft(q().query(
        'INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)',
        [roadmapId, res0.title, res0.url, res0.type, 1]
      ));
    }

    await soft(q().query('UPDATE user_stats SET xp_points = xp_points + 30 WHERE user_id = ?', [req.user.id]));
    await soft(q().query('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [req.user.id, 'AI Generated Roadmap', `Generated roadmap for: ${topic}`]));
    await soft(q().query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [req.user.id, 'Roadmap ready', `Your AI roadmap “${plan.title}” is ready.`]));
    for (const badgeId of [1, 3]) {
      await soft((async () => {
        const [has] = await q().query('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?', [req.user.id, badgeId]);
        if (has.length === 0) await q().query('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [req.user.id, badgeId]);
      })());
    }

    res.json({
      message: 'Roadmap generated successfully',
      roadmapId,
      data: {
        title: plan.title, description: plan.description, goal: plan.goal, outcomes: plan.outcomes,
        total_hours: totalHours, capstone: plan.capstone,
        modules: plan.modules.map((m, i) => ({ ...m, tasks: (details[i]?.tasks || []).map((t) => ({ title: t.title, type: t.type, est_minutes: t.est_minutes })) })),
        resources: plan.resources,
      },
    });
  } catch (err) {
    console.error('AI roadmap save error:', err.message);
    res.status(500).json({ message: 'The roadmap was generated but could not be saved.' });
  }
});

// EXPLAIN A TASK — a mini lesson for one task, cached on the task
router.post('/explain-task/:taskId', auth, aiLimit, async (req, res) => {
  try {
    const [rows] = await q().query(
      `SELECT t.*, m.title AS module_title, r.title AS roadmap_title, r.details AS roadmap_details
       FROM tasks t JOIN modules m ON m.id = t.module_id JOIN roadmaps r ON r.id = m.roadmap_id
       WHERE t.id = ? AND r.user_id = ?`,
      [req.params.taskId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Task not found' });
    const t = rows[0];
    let details = {};
    try { details = t.details ? JSON.parse(t.details) : {}; } catch (e) { details = {}; }
    if (details.explanation && !req.body?.refresh) return res.json({ explanation: details.explanation, cached: true });

    let level = 'beginner';
    try { level = JSON.parse(t.roadmap_details || '{}').profile?.level || level; } catch (e) { /* ignore */ }

    const explanation = (await getModel({
      system: 'You are a patient expert tutor in whatever subject the learner is studying (science, health, business, engineering, technology, the arts…). Teach one concept at a time with clear headings, short paragraphs, bullet lists and real-world examples from that field. Use code blocks only when the topic involves code. Be concrete and accurate.',
    }).generateContent(`Teach me this task from my learning roadmap.

Roadmap: ${t.roadmap_title}
Module: ${t.module_title}
Task: ${t.title}
${t.description ? `Details: ${t.description}` : ''}
My level: ${level}

Structure your answer exactly like this:
## The idea
(plain-language explanation, 1-2 short paragraphs)
## Example
(a small, realistic worked example — code if relevant)
## Try it yourself
(one practice exercise with a hint)
## Common mistakes
(2-4 bullets)
## Check your understanding
(2-3 quick questions)`)).response.text();

    details.explanation = explanation;
    await soft(q().query('UPDATE tasks SET details = ? WHERE id = ?', [JSON.stringify(details), t.id]));
    res.json({ explanation });
  } catch (err) {
    sendAIError(res, err, 'Could not explain this task right now. Please try again.');
  }
});

// AI CHAT — accepts optional history: [{ role: 'user'|'assistant', content }]
router.post('/chat', auth, aiLimit, async (req, res) => {
  const { message, history } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ message: 'Message is required' });

  try {
    const model = getModel({
      system: 'You are LearnMap’s learning assistant. Explain clearly and concisely for a student. Use short paragraphs, bullet lists and small code examples when useful. Use **bold** sparingly.',
    });
    const past = (Array.isArray(history) ? history : [])
      .filter((m) => m && m.content)
      .slice(-12)
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }));
    // Gemini requires the history to start with a user turn.
    while (past.length && past[0].role !== 'user') past.shift();
    const chat = model.startChat({ history: past });
    const result = await chat.sendMessage(message.trim());
    res.json({ reply: result.response.text() });
  } catch (err) {
    sendAIError(res, err, 'The assistant could not answer right now. Please try again.');
  }
});

// CAREER ADVICE
router.post('/career-advice', auth, aiLimit, async (req, res) => {
  const { skills, experience, interests, education, location } = req.body;
  if (!skills || !skills.trim()) return res.status(400).json({ message: 'Please list at least one skill.' });

  try {
    const data = await generateJSON(`You are an expert, realistic career advisor.
Profile:
- Skills: ${skills}
- Experience: ${experience || 'Not provided'}
- Interests: ${interests || 'Not provided'}
- Education: ${education || 'Not provided'}
- Location / market: ${location || 'United States'}

Return JSON with exactly this shape:
{
  "summary": "2-3 sentence honest assessment",
  "roles": [ { "title": "string", "salary": "typical range for the market, e.g. $85k–$120k", "match": 0-100, "why": "one sentence" } ],
  "skillGaps": [ { "skill": "string", "priority": "high|medium|low", "how": "one sentence on how to learn it" } ],
  "companies": ["string"],
  "nextSteps": ["concrete action", "..."],
  "advice": "one short paragraph"
}
Give 3-5 roles sorted by match, 4-6 skill gaps, 5-8 companies, 3-5 next steps.`);
    res.json(data);
  } catch (err) {
    sendAIError(res, err, 'Could not get career advice. Please try again.');
  }
});

// STUDY PLAN
router.post('/study-plan', auth, aiLimit, async (req, res) => {
  const { goal, hoursPerDay, daysPerWeek, currentLevel, skills, weeks } = req.body;
  if (!goal || !goal.trim()) return res.status(400).json({ message: 'Please describe your goal.' });
  const days = Math.min(7, Math.max(1, parseInt(daysPerWeek, 10) || 5));
  const hours = Math.min(12, Math.max(0.5, parseFloat(hoursPerDay) || 2));

  try {
    const data = await generateJSON(`You are an expert study planner. Build a realistic weekly study schedule.
Goal: ${goal}
Current skills: ${skills || 'None'}
Level: ${currentLevel || 'beginner'}
Hours per day: ${hours}
Study days per week: ${days}
${weeks ? `Total length: ${weeks} weeks` : ''}

Return JSON with exactly this shape:
{
  "title": "string",
  "totalDuration": "e.g. 10 weeks",
  "overview": "2 sentences",
  "weeklySchedule": [ { "day": "Monday", "topic": "string", "duration": "${hours} hours", "tasks": ["string", "string", "string"] } ],
  "milestones": [ { "week": "Week 2", "goal": "string" } ],
  "tips": ["string", "string", "string"]
}
weeklySchedule must contain exactly ${days} entries using real weekday names.`);
    res.json(data);
  } catch (err) {
    sendAIError(res, err, 'Could not create the study plan. Please try again.');
  }
});

module.exports = router;
