const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const { insertTask } = require('../lib/tasks');

const TEMPLATES = [
  {
    id: 1,
    title: 'Full Stack Web Developer',
    description: 'Complete roadmap to become a full stack developer',
    icon: '💻',
    duration: '6 months',
    modules: [
      { title: 'HTML & CSS Basics', tasks: ['Learn HTML tags', 'CSS Flexbox', 'CSS Grid', 'Responsive Design'] },
      { title: 'JavaScript', tasks: ['Variables & Functions', 'DOM Manipulation', 'ES6+ Features', 'Async/Await'] },
      { title: 'React Frontend', tasks: ['Components & Props', 'useState & useEffect', 'React Router', 'API Integration'] },
      { title: 'Node.js Backend', tasks: ['Express Setup', 'REST APIs', 'Middleware', 'Authentication with JWT'] },
      { title: 'Database', tasks: ['MySQL Basics', 'CRUD Operations', 'Joins & Queries', 'Database Design'] },
      { title: 'Deployment', tasks: ['Git & GitHub', 'Deploy Backend', 'Deploy Frontend', 'Domain Setup'] },
    ],
  },
  {
    id: 2,
    title: 'Data Science & ML',
    description: 'Learn data science and machine learning from scratch',
    icon: '🤖',
    duration: '8 months',
    modules: [
      { title: 'Python Basics', tasks: ['Variables & Loops', 'Functions', 'OOP in Python', 'File Handling'] },
      { title: 'Data Analysis', tasks: ['NumPy', 'Pandas', 'Data Cleaning', 'Exploratory Analysis'] },
      { title: 'Data Visualization', tasks: ['Matplotlib', 'Seaborn', 'Plotly', 'Dashboard with Streamlit'] },
      { title: 'Machine Learning', tasks: ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation', 'scikit-learn'] },
      { title: 'Deep Learning', tasks: ['Neural Networks', 'TensorFlow Basics', 'CNN', 'NLP Basics'] },
      { title: 'Projects', tasks: ['EDA Project', 'Classification Project', 'Regression Project', 'Deploy ML Model'] },
    ],
  },
  {
    id: 3,
    title: 'Cloud & DevOps Engineer',
    description: 'Master cloud computing and DevOps practices',
    icon: '☁️',
    duration: '6 months',
    modules: [
      { title: 'Linux Basics', tasks: ['Terminal Commands', 'File System', 'Shell Scripting', 'Permissions'] },
      { title: 'Docker', tasks: ['Containers Basics', 'Dockerfile', 'Docker Compose', 'Docker Hub'] },
      { title: 'Kubernetes', tasks: ['K8s Architecture', 'Pods & Services', 'Deployments', 'Helm Charts'] },
      { title: 'AWS', tasks: ['EC2 & S3', 'Lambda Functions', 'RDS', 'CloudFormation'] },
      { title: 'CI/CD', tasks: ['GitHub Actions', 'Jenkins Basics', 'Automated Testing', 'Pipeline Setup'] },
      { title: 'Monitoring', tasks: ['Prometheus', 'Grafana', 'Log Management', 'Alerting'] },
    ],
  },
  {
    id: 4,
    title: 'Android App Developer',
    description: 'Build Android apps from beginner to advanced',
    icon: '📱',
    duration: '5 months',
    modules: [
      { title: 'Java/Kotlin Basics', tasks: ['OOP Concepts', 'Kotlin Syntax', 'Coroutines', 'Collections'] },
      { title: 'Android Fundamentals', tasks: ['Activities & Fragments', 'Layouts & Views', 'Intents', 'Lifecycle'] },
      { title: 'UI Development', tasks: ['Material Design', 'RecyclerView', 'Navigation Component', 'Animations'] },
      { title: 'Data & Storage', tasks: ['Room Database', 'SharedPreferences', 'REST APIs with Retrofit', 'Firebase'] },
      { title: 'Advanced Topics', tasks: ['MVVM Architecture', 'Dependency Injection', 'WorkManager', 'Testing'] },
      { title: 'Publishing', tasks: ['App Signing', 'Play Store Setup', 'App Optimization', 'Analytics'] },
    ],
  },
  {
    id: 5,
    title: 'UI/UX Designer',
    description: 'Learn UI/UX design principles and tools',
    icon: '🎨',
    duration: '4 months',
    modules: [
      { title: 'Design Basics', tasks: ['Color Theory', 'Typography', 'Layout Principles', 'Visual Hierarchy'] },
      { title: 'Figma', tasks: ['Figma Interface', 'Components & Variants', 'Auto Layout', 'Prototyping'] },
      { title: 'UX Research', tasks: ['User Interviews', 'Personas', 'User Journey Maps', 'Usability Testing'] },
      { title: 'Wireframing', tasks: ['Low Fidelity Wireframes', 'High Fidelity Mockups', 'Design Systems', 'Handoff to Dev'] },
      { title: 'Portfolio', tasks: ['Case Study 1', 'Case Study 2', 'Portfolio Website', 'Behance Profile'] },
    ],
  },
  {
    id: 6,
    title: 'Cybersecurity Specialist',
    description: 'Learn ethical hacking and cybersecurity',
    icon: '🔐',
    duration: '7 months',
    modules: [
      { title: 'Networking Basics', tasks: ['TCP/IP', 'DNS & HTTP', 'Firewalls', 'VPN & Proxies'] },
      { title: 'Linux for Security', tasks: ['Kali Linux Setup', 'Terminal Tools', 'File Permissions', 'Logs'] },
      { title: 'Ethical Hacking', tasks: ['Reconnaissance', 'Scanning & Enumeration', 'Exploitation', 'Post Exploitation'] },
      { title: 'Web Security', tasks: ['OWASP Top 10', 'SQL Injection', 'XSS Attacks', 'CSRF'] },
      { title: 'Certifications', tasks: ['CompTIA Security+', 'CEH Prep', 'Practice Labs', 'Mock Exams'] },
    ],
  },
];

// GET all templates
router.get('/', verifyToken, (req, res) => {
  res.json({ templates: TEMPLATES });
});

// POST import a template as a new roadmap
router.post('/import/:id', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const template = TEMPLATES.find((t) => t.id === parseInt(req.params.id, 10));
  if (!template) return res.status(404).json({ message: 'Template not found' });

  try {
    const q = db.promise();
    const [result] = await q.query(
      'INSERT INTO roadmaps (user_id, title, description, duration, status) VALUES (?, ?, ?, ?, ?)',
      [userId, template.title, template.description, template.duration, 'active']
    );
    const roadmapId = result.insertId;

    for (let m = 0; m < template.modules.length; m++) {
      const mod = template.modules[m];
      const [modResult] = await q.query(
        'INSERT INTO modules (roadmap_id, title, position, order_index) VALUES (?, ?, ?, ?)',
        [roadmapId, mod.title, m, m]
      );
      for (let t = 0; t < mod.tasks.length; t++) {
        await insertTask({ userId, roadmapId, moduleId: modResult.insertId, title: mod.tasks[t], position: t });
      }
    }

    await q.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [userId, 'Imported Template', `Imported template: ${template.title}`]
    ).catch(() => {});

    res.json({ message: 'Roadmap imported!', roadmapId });
  } catch (err) {
    console.error('Template import error:', err.message);
    res.status(500).json({ message: 'Could not import template' });
  }
});

module.exports = router;
