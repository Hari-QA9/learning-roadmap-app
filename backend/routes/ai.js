const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to clean AI response
function cleanJSON(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\n?/, '');
  cleaned = cleaned.replace(/^```\n?/, '');
  cleaned = cleaned.replace(/```$/, '');
  cleaned = cleaned.trim();
  return cleaned;
}

// GENERATE ROADMAP
router.post('/generate', auth, async (req, res) => {
  const { topic, duration } = req.body;

  if (!topic) {
    return res.status(400).json({ message: 'Topic is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Create a learning roadmap for "${topic}" with duration "${duration || '4 weeks'}".
Return ONLY valid JSON, no markdown, no backticks, no extra text:
{
  "title": "title here",
  "description": "description here",
  "goal": "goal here",
  "modules": [
    {
      "title": "module title",
      "description": "module description",
      "tasks": [
        {
          "title": "task title",
          "description": "task description"
        }
      ]
    }
  ],
  "resources": [
    {
      "title": "resource title",
      "url": "https://example.com",
      "type": "video",
      "is_free": true
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = cleanJSON(text);

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseErr) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    // Save roadmap
    const [roadmapResult] = await db.promise().query(
      'INSERT INTO roadmaps (user_id, title, description, goal, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        data.title || topic + ' Roadmap',
        data.description || '',
        data.goal || '',
        duration || '4 weeks',
        'active'
      ]
    );
    const roadmapId = roadmapResult.insertId;
    console.log('Roadmap saved with ID:', roadmapId);

    // Save modules and tasks
    if (data.modules && data.modules.length > 0) {
      for (let i = 0; i < data.modules.length; i++) {
        const mod = data.modules[i];
        try {
          const [moduleResult] = await db.promise().query(
            'INSERT INTO modules (roadmap_id, title, description, order_index, position) VALUES (?, ?, ?, ?, ?)',
            [
              roadmapId,
              mod.title || 'Module ' + (i + 1),
              mod.description || '',
              i,
              i
            ]
          );
          const moduleId = moduleResult.insertId;
          console.log('Module saved:', mod.title);

          if (mod.tasks && mod.tasks.length > 0) {
            for (let j = 0; j < mod.tasks.length; j++) {
              const task = mod.tasks[j];
              try {
                await db.promise().query(
                  'INSERT INTO tasks (module_id, title, description, status, position) VALUES (?, ?, ?, ?, ?)',
                  [
                    moduleId,
                    task.title || 'Task ' + (j + 1),
                    task.description || '',
                    'pending',
                    j
                  ]
                );
              } catch (taskErr) {
                console.log('Task error:', taskErr.message);
              }
            }
          }

        } catch (modErr) {
          console.log('Module error:', modErr.message);
        }
      }
    }

    // Save resources
    if (data.resources && data.resources.length > 0) {
      for (let k = 0; k < data.resources.length; k++) {
        const resource = data.resources[k];
        try {
          await db.promise().query(
            'INSERT INTO resources (roadmap_id, title, url, type, is_free) VALUES (?, ?, ?, ?, ?)',
            [
              roadmapId,
              resource.title || 'Resource ' + (k + 1),
              resource.url || '',
              resource.type || 'article',
              1
            ]
          );
          console.log('Resource saved:', resource.title);
        } catch (resourceErr) {
          console.log('Resource error:', resourceErr.message);
        }
      }
    }

    // Give XP points
    try {
      await db.promise().query(
        'UPDATE user_stats SET xp_points = xp_points + 30 WHERE user_id = ?',
        [req.user.id]
      );
    } catch (xpErr) {
      console.log('XP error:', xpErr.message);
    }

    // Log activity
    try {
      await db.promise().query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'AI Generated Roadmap', 'Generated roadmap for: ' + topic]
      );
    } catch (logErr) {
      console.log('Log error:', logErr.message);
    }

    // Send notification
    try {
      await db.promise().query(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [req.user.id, 'Roadmap Created!', 'Your AI roadmap for ' + topic + ' is ready!']
      );
    } catch (notifErr) {
      console.log('Notification error:', notifErr.message);
    }

    // Check and award badges
    try {
      const [roadmapCount] = await db.promise().query(
        'SELECT COUNT(*) as total FROM roadmaps WHERE user_id = ?',
        [req.user.id]
      );
      if (roadmapCount.total >= 1) {
        const [existing] = await db.promise().query(
          'SELECT * FROM user_badges WHERE user_id = ? AND badge_id = 1',
          [req.user.id]
        );
        if (existing.length === 0) {
          await db.promise().query(
            'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
            [req.user.id, 1]
          );
          console.log('Badge awarded: First Roadmap');
        }
      }
      const [existingAI] = await db.promise().query(
        'SELECT * FROM user_badges WHERE user_id = ? AND badge_id = 3',
        [req.user.id]
      );
      if (existingAI.length === 0) {
        await db.promise().query(
          'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
          [req.user.id, 3]
        );
        console.log('Badge awarded: AI Explorer');
      }
    } catch (badgeErr) {
      console.log('Badge error:', badgeErr.message);
    }

    res.json({
      message: 'Roadmap generated successfully',
      roadmapId: roadmapId,
      data: data
    });

  } catch (err) {
    console.error('AI Generate error:', err);
    res.status(500).json({
      message: 'AI generation failed',
      error: err.message
    });
  }
});

// AI CHAT
router.post('/chat', auth, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = 'You are a helpful learning assistant for students. Answer this question clearly and helpfully: ' + message;
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    res.json({ reply: reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      message: 'Chat failed',
      error: err.message
    });
  }
});

module.exports = router;
