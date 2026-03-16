require('dotenv').config();
//require('dotenv').config();
//console.log('GEMINI KEY LOADED:', process.env.GEMINI_API_KEY);

const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL');
});

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      const token = jwt.sign(
        { id: result.insertId, email, name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Account created',
        token,
        user: { id: result.insertId, name, email }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
});
// ============================================
// MIDDLEWARE - Verify JWT Token
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ============================================
// ROADMAP ROUTES
// ============================================

// Get all roadmaps for logged in user
app.get('/api/roadmaps', authenticateToken, (req, res) => {
  const sql = `
    SELECT r.*,
      COUNT(DISTINCT m.id) as total_modules,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
    FROM roadmaps r
    LEFT JOIN modules m ON r.id = m.roadmap_id
    LEFT JOIN tasks t ON m.id = t.module_id
    WHERE r.user_id = ?
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err) {
      console.error('Error fetching roadmaps:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const roadmaps = rows.map(r => ({
      ...r,
      progress: r.total_tasks > 0
        ? Math.round((r.completed_tasks / r.total_tasks) * 100)
        : 0
    }));

    res.json(roadmaps);
  });
});

// Get single roadmap
app.get('/api/roadmaps/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM roadmaps WHERE id = ? AND user_id = ?';
  db.query(sql, [id, req.user.id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    res.json(rows[0]);
  });
});

// Create roadmap
app.post('/api/roadmaps', authenticateToken, (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const sql = 'INSERT INTO roadmaps (user_id, title, description) VALUES (?, ?, ?)';
  db.query(sql, [req.user.id, title, description || ''], (err, result) => {
    if (err) {
      console.error('Error creating roadmap:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      id: result.insertId,
      user_id: req.user.id,
      title,
      description,
      created_at: new Date()
    });
  });
});

// Update roadmap
app.put('/api/roadmaps/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  const checkSql = 'SELECT id FROM roadmaps WHERE id = ? AND user_id = ?';
  db.query(checkSql, [id, req.user.id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const sql = 'UPDATE roadmaps SET title = ?, description = ? WHERE id = ?';
    db.query(sql, [title, description, id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: Number(id), title, description });
    });
  });
});

// Delete roadmap
app.delete('/api/roadmaps/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const checkSql = 'SELECT id FROM roadmaps WHERE id = ? AND user_id = ?';
  db.query(checkSql, [id, req.user.id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const sql = 'DELETE FROM roadmaps WHERE id = ?';
    db.query(sql, [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Roadmap deleted' });
    });
  });
});

// ============================================
// MODULE ROUTES
// ============================================

// Get modules for a roadmap
app.get('/api/modules/:roadmapId', authenticateToken, (req, res) => {
  const { roadmapId } = req.params;

  const sql = `
    SELECT m.*,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
    FROM modules m
    LEFT JOIN tasks t ON m.id = t.module_id
    WHERE m.roadmap_id = ?
    GROUP BY m.id
    ORDER BY m.position
  `;

  db.query(sql, [roadmapId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create module
app.post('/api/modules', authenticateToken, (req, res) => {
  const { roadmap_id, title } = req.body;

  if (!roadmap_id || !title) {
    return res.status(400).json({ error: 'Roadmap ID and title required' });
  }

  // Get next position
  const posSql = 'SELECT COUNT(*) as count FROM modules WHERE roadmap_id = ?';
  db.query(posSql, [roadmap_id], (err, result) => {
    const position = result[0].count + 1;

    const sql = 'INSERT INTO modules (roadmap_id, title, position) VALUES (?, ?, ?)';
    db.query(sql, [roadmap_id, title, position], (err, insertResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        id: insertResult.insertId,
        roadmap_id,
        title,
        position,
        created_at: new Date()
      });
    });
  });
});

// Delete module
app.delete('/api/modules/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM modules WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Module deleted' });
  });
});

// ============================================
// TASK ROUTES
// ============================================

// Get tasks for a module
app.get('/api/tasks/:moduleId', authenticateToken, (req, res) => {
  const { moduleId } = req.params;

  const sql = 'SELECT * FROM tasks WHERE module_id = ? AND user_id = ? ORDER BY position';
  db.query(sql, [moduleId, req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create task
app.post('/api/tasks', authenticateToken, (req, res) => {
  const { module_id, title, due_date } = req.body;

  if (!module_id || !title) {
    return res.status(400).json({ error: 'Module ID and title required' });
  }

  const posSql = 'SELECT COUNT(*) as count FROM tasks WHERE module_id = ?';
  db.query(posSql, [module_id], (err, result) => {
    const position = result[0].count + 1;

    const sql = 'INSERT INTO tasks (module_id, user_id, title, due_date, position) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [module_id, req.user.id, title, due_date || null, position], (err, insertResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        id: insertResult.insertId,
        module_id,
        user_id: req.user.id,
        title,
        status: 'not_started',
        due_date,
        position
      });
    });
  });
});

// Update task status
app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, title, due_date } = req.body;

  const sql = 'UPDATE tasks SET status = ?, title = ?, due_date = ? WHERE id = ? AND user_id = ?';
  db.query(sql, [status, title, due_date, id, req.user.id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: Number(id), status, title, due_date });
  });
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
  db.query(sql, [id, req.user.id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Task deleted' });
  });
});
// ============================================
// AI AGENT ROUTES - Google Gemini (Free)
// ============================================
const { GoogleGenerativeAI } = require('@google/generative-ai');

//const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// AI Chat endpoint
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = 'You are a helpful AI study assistant for a Learning Roadmap app. Help users with learning advice, study tips, programming questions, and roadmap suggestions. Keep responses concise and practical. Use bullet points when listing items.\n\nUser question: ' + message;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'AI request failed: ' + error.message });
  }
});

// AI Roadmap Generator
app.post('/api/ai/generate-roadmap', authenticateToken, async (req, res) => {
  const { goal, duration, level } = req.body;

  if (!goal) {
    return res.status(400).json({ error: 'Goal is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    //const prompt = 'Create a learning roadmap for: ' + goal + '. Duration: ' + (duration || '3 months') + '. Level: ' + (level || 'beginner') + '. Return ONLY a valid JSON object with this exact format, no markdown, no extra text, no code blocks: { "title": "roadmap title", "description": "brief description", "modules": [{ "title": "module title", "tasks": [{ "title": "task title" }] }] }. Include 4-6 modules with 3-5 tasks each.';
   // const prompt = 'Create a learning roadmap for: ' + goal + '. Duration: ' + (duration || '3 months') + '. Level: ' + (level || 'beginner') + '. Return ONLY a valid JSON object with this exact format, no markdown, no extra text, no code blocks: { "title": "roadmap title", "description": "brief description", "modules": [{ "title": "module title", "tasks": [{ "title": "task title", "resources": [{ "title": "resource title", "url": "actual free URL", "type": "video or article or course or documentation" }] }] }] }. For each task include 2-3 free learning resources. Use real URLs from these free sites only: YouTube freecodecamp channel (youtube.com/@freecodecamp), YouTube Traversy Media (youtube.com/@TraversyMedia), MDN Web Docs (developer.mozilla.org), freeCodeCamp (freecodecamp.org), W3Schools (w3schools.com), The Odin Project (theodinproject.com), official documentation sites like react.dev, nodejs.org, python.org. Include 4-5 modules with 3-4 tasks each.';
   const prompt = 'You are a learning roadmap generator. Create a roadmap for: ' + goal + '. Duration: ' + (duration || '3 months') + '. Level: ' + (level || 'beginner') + '. Respond with ONLY this JSON structure, no other text: {"title":"roadmap title","description":"short description","modules":[{"title":"module title","tasks":[{"title":"task title","resources":[{"title":"free resource name","url":"https://actual-url.com","type":"video"}]}]}]}. Rules: 1) Include 4 modules. 2) Each module has 3 tasks. 3) Each task has exactly 2 free resources. 4) Use ONLY free resources: YouTube (freecodecamp, traversymedia), MDN (developer.mozilla.org), freeCodeCamp (freecodecamp.org), W3Schools (w3schools.com). 5) Return valid JSON only.';
 
   const result = await model.generateContent(prompt);
    const response = await result.response;
    var text = response.text().trim();
    // ADD THIS LINE
console.log('AI RAW RESPONSE:', text);

   // Remove markdown code blocks
text = text.replace(/```json/gi, '');
text = text.replace(/```/g, '');
text = text.trim();

// Find JSON start and end
var jsonStart = text.indexOf('{');
var jsonEnd = text.lastIndexOf('}');
if (jsonStart !== -1 && jsonEnd !== -1) {
  text = text.substring(jsonStart, jsonEnd + 1);
}

console.log('CLEANED TEXT:', text.substring(0, 100));
    var roadmapData = JSON.parse(text);
    res.json(roadmapData);

  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'Failed to generate: ' + error.message });
  }
});
app.get('/api/ai/models', async (req, res) => {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RESOURCE ROUTES
// ============================================

// Get all resources for a task
app.get('/api/resources/:taskId', authenticateToken, (req, res) => {
  const { taskId } = req.params;

  const sql = 'SELECT * FROM resources WHERE task_id = ? ORDER BY created_at';
  db.query(sql, [taskId], (err, rows) => {
    if (err) {
      console.error('Error fetching resources:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add resource to task
app.post('/api/resources', authenticateToken, (req, res) => {
  const { task_id, title, url, type } = req.body;

  if (!task_id || !title) {
    return res.status(400).json({ error: 'Task ID and title required' });
  }

  const sql = 'INSERT INTO resources (task_id, title, url, type) VALUES (?, ?, ?, ?)';
  db.query(sql, [task_id, title, url || '', type || 'article'], (err, result) => {
    if (err) {
      console.error('Error adding resource:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      id: result.insertId,
      task_id,
      title,
      url,
      type: type || 'article',
      is_completed: 0
    });
  });
});

// Toggle resource completed
app.put('/api/resources/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { is_completed, title, url, type } = req.body;

  const sql = 'UPDATE resources SET is_completed = ?, title = ?, url = ?, type = ? WHERE id = ?';
  db.query(sql, [is_completed ? 1 : 0, title, url, type, id], (err) => {
    if (err) {
      console.error('Error updating resource:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: Number(id), is_completed, title, url, type });
  });
});

// Delete resource
app.delete('/api/resources/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM resources WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Error deleting resource:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Resource deleted' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
