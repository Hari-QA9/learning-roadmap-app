const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { generateJSON, getModel, sendAIError } = require('../lib/gemini');
const { insertTask } = require('../lib/tasks');

const q = () => db.promise();
const soft = (p) => p.catch((e) => console.log('[ai] skipped:', e.message));

// GENERATE ROADMAP — creates the roadmap, modules, tasks and resources
router.post('/generate', auth, async (req, res) => {
  const { topic, duration, level } = req.body;
  if (!topic || !topic.trim()) return res.status(400).json({ message: 'Topic is required' });

  let data;
  try {
    data = await generateJSON(`Create a practical learning roadmap for "${topic.trim()}".
Duration: ${duration || '4 weeks'}. Learner level: ${level || 'beginner'}.
Use 4-7 modules, each with 3-5 concrete tasks. Include 4-8 genuinely free resources with real, well-known URLs
(official docs, freeCodeCamp, MDN, YouTube channels, Coursera audit, etc.).
Return JSON with exactly this shape:
{
  "title": "string",
  "description": "one or two sentences",
  "goal": "one sentence outcome",
  "modules": [ { "title": "string", "description": "string", "tasks": [ { "title": "string", "description": "string" } ] } ],
  "resources": [ { "title": "string", "url": "https://...", "type": "video|article|course|docs" } ]
}`);
  } catch (err) {
    return sendAIError(res, err, 'Could not generate the roadmap. Please try again.');
  }

  try {
    const modules = Array.isArray(data.modules) ? data.modules : [];
    const resources = Array.isArray(data.resources) ? data.resources : [];

    const [r] = await q().query(
      'INSERT INTO roadmaps (user_id, title, description, goal, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, data.title || `${topic} roadmap`, data.description || '', data.goal || '', duration || '4 weeks', 'active']
    );
    const roadmapId = r.insertId;

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i] || {};
      const [m] = await q().query(
        'INSERT INTO modules (roadmap_id, title, description, order_index, position) VALUES (?, ?, ?, ?, ?)',
        [roadmapId, mod.title || `Module ${i + 1}`, mod.description || '', i, i]
      );
      const tasks = Array.isArray(mod.tasks) ? mod.tasks : [];
      for (let j = 0; j < tasks.length; j++) {
        const t = typeof tasks[j] === 'string' ? { title: tasks[j] } : tasks[j] || {};
        await insertTask({ userId: req.user.id, roadmapId, moduleId: m.insertId, title: t.title || `Task ${j + 1}`, description: t.description || '', position: j });
      }
    }

    for (let k = 0; k < resources.length; k++) {
      const res0 = resources[k] || {};
      await soft(q().query(
        'INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)',
        [roadmapId, res0.title || `Resource ${k + 1}`, res0.url || '', res0.type || 'article', 1]
      ));
    }

    await soft(q().query('UPDATE user_stats SET xp_points = xp_points + 30 WHERE user_id = ?', [req.user.id]));
    await soft(q().query('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [req.user.id, 'AI Generated Roadmap', `Generated roadmap for: ${topic}`]));
    await soft(q().query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [req.user.id, 'Roadmap ready', `Your AI roadmap for ${topic} is ready.`]));
    for (const badgeId of [1, 3]) {
      await soft((async () => {
        const [has] = await q().query('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?', [req.user.id, badgeId]);
        if (has.length === 0) await q().query('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [req.user.id, badgeId]);
      })());
    }

    res.json({ message: 'Roadmap generated successfully', roadmapId, data });
  } catch (err) {
    console.error('AI roadmap save error:', err.message);
    res.status(500).json({ message: 'The roadmap was generated but could not be saved.' });
  }
});

// AI CHAT — accepts optional history: [{ role: 'user'|'assistant', content }]
router.post('/chat', auth, async (req, res) => {
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
router.post('/career-advice', auth, async (req, res) => {
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
router.post('/study-plan', auth, async (req, res) => {
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
