const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const { insertTask } = require('../lib/tasks');

const TEMPLATES = [
  {
    id: 1,
    category: 'Technology',
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
    category: 'Data',
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
    category: 'Technology',
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
    category: 'Technology',
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
    category: 'Design',
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
    category: 'Technology',
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
  {
    id: 7, category: 'Science & Research',
    title: 'Biology Lab Research Associate',
    description: 'Core wet-lab skills, data analysis and documentation that biotech and academic labs hire for',
    icon: '🧬', duration: '4 months',
    modules: [
      { title: 'Lab Safety & Good Practice', tasks: ['Biosafety levels and PPE', 'Aseptic technique', 'Good Laboratory Practice (GLP)', 'Keeping an electronic lab notebook'] },
      { title: 'Molecular Biology Techniques', tasks: ['DNA/RNA extraction', 'PCR and qPCR', 'Gel electrophoresis', 'Primer design basics'] },
      { title: 'Protein & Cell Methods', tasks: ['Mammalian cell culture', 'Western blotting', 'ELISA', 'Intro to flow cytometry'] },
      { title: 'Data Analysis for Biologists', tasks: ['Statistics for experiments', 'GraphPad Prism', 'Intro to R for biology', 'Making publication-quality figures'] },
      { title: 'Reading & Writing Science', tasks: ['Reading a research paper', 'Literature search with PubMed', 'Writing a lab report', 'Presenting a journal club'] },
      { title: 'Career Portfolio', tasks: ['Summarise your lab techniques', 'Research poster', 'Tailor a CV for lab roles', 'Prepare for technical interviews'] },
    ],
  },
  {
    id: 8, category: 'Healthcare',
    title: 'Registered Nurse: NCLEX & First Job',
    description: 'Clinical fundamentals, NCLEX-RN preparation and a confident start on the floor',
    icon: '🩺', duration: '4 months',
    modules: [
      { title: 'Fundamentals Review', tasks: ['Vital signs and assessment', 'Infection control', 'Medication administration safety', 'Clinical documentation'] },
      { title: 'Pharmacology', tasks: ['Drug classes', 'Dosage calculations', 'High-alert medications', 'Side effects and interactions'] },
      { title: 'Med-Surg & Specialties', tasks: ['Cardiac and respiratory care', 'Maternal and newborn care', 'Pediatrics', 'Mental health nursing'] },
      { title: 'NCLEX Strategy', tasks: ['Next Generation NCLEX question types', 'Prioritisation and delegation', 'Daily practice questions', 'Full-length practice exam'] },
      { title: 'Getting Hired', tasks: ['Nursing resume and cover letter', 'Behavioural interview (STAR) answers', 'BLS/ACLS certification', 'Choosing a new-grad residency'] },
    ],
  },
  {
    id: 9, category: 'Business & Finance',
    title: 'Financial Analyst',
    description: 'Accounting basics, Excel modelling and valuation for entry-level finance roles',
    icon: '📈', duration: '5 months',
    modules: [
      { title: 'Accounting Foundations', tasks: ['The three financial statements', 'Debits, credits and the general ledger', 'Accrual accounting and GAAP', 'Reading a 10-K'] },
      { title: 'Excel for Finance', tasks: ['Formulas and lookups', 'PivotTables', 'Charts for reporting', 'Keyboard shortcuts and clean models'] },
      { title: 'Financial Modeling', tasks: ['Three-statement model', 'Forecasting revenue and costs', 'Scenario and sensitivity analysis', 'Model checks'] },
      { title: 'Valuation', tasks: ['Discounted cash flow (DCF)', 'Comparable companies', 'Precedent transactions', 'Writing an investment memo'] },
      { title: 'Tools & Career', tasks: ['Power BI dashboard', 'SQL for financial data', 'Finance resume', 'Technical interview questions'] },
    ],
  },
  {
    id: 10, category: 'Marketing',
    title: 'Digital Marketing Specialist',
    description: 'SEO, paid ads, social, email and analytics, with a real campaign for your portfolio',
    icon: '📣', duration: '4 months',
    modules: [
      { title: 'Marketing Fundamentals', tasks: ['Customer personas', 'The marketing funnel', 'Positioning and messaging', 'Competitor research'] },
      { title: 'SEO & Content', tasks: ['Keyword research', 'On-page SEO', 'Writing blog content', 'Measuring organic traffic'] },
      { title: 'Paid & Social', tasks: ['Google Ads basics', 'Meta ads', 'Social media content calendar', 'A/B testing creatives'] },
      { title: 'Email & Analytics', tasks: ['Email campaigns and automation', 'Google Analytics 4', 'UTM tracking', 'Reporting ROI'] },
      { title: 'Portfolio Campaign', tasks: ['Plan a campaign for a local business', 'Run and track it', 'Write the case study', 'Free certifications (Google, HubSpot)'] },
    ],
  },
  {
    id: 11, category: 'Science & Research',
    title: 'Clinical Research Coordinator',
    description: 'How clinical trials run, the regulations behind them, and the skills to land a CRC role',
    icon: '🧪', duration: '3 months',
    modules: [
      { title: 'Clinical Trials 101', tasks: ['Trial phases and design', 'Roles on a study team', 'Protocols and amendments', 'Informed consent'] },
      { title: 'Regulations & Ethics', tasks: ['ICH Good Clinical Practice (GCP)', 'FDA and IRB oversight', 'HIPAA and data privacy', 'Adverse event reporting'] },
      { title: 'Study Operations', tasks: ['Patient screening and enrolment', 'Source documents and CRFs', 'EDC systems', 'Monitoring visits'] },
      { title: 'Career Prep', tasks: ['GCP certificate', 'CRC resume', 'Interview scenarios', 'Networking with research sites'] },
    ],
  },
  {
    id: 12, category: 'Engineering',
    title: 'Civil Engineer: Design Software & BIM',
    description: 'AutoCAD, Revit/BIM and structural tools used by US civil and construction firms',
    icon: '🏗️', duration: '5 months',
    modules: [
      { title: 'AutoCAD', tasks: ['Drawing and editing basics', 'Layers and annotation', 'Site plans', 'Plotting drawings'] },
      { title: 'Civil 3D', tasks: ['Surfaces and grading', 'Alignments and profiles', 'Corridors', 'Pipe networks'] },
      { title: 'Revit & BIM', tasks: ['Revit interface and families', 'Structural modelling', 'BIM coordination', 'Clash detection basics'] },
      { title: 'Structural Analysis', tasks: ['Loads and load combinations', 'Intro to STAAD.Pro or SAP2000', 'Design codes (ACI, AISC)', 'Checking results'] },
      { title: 'Path to Licensure', tasks: ['FE exam overview', 'Practice problems', 'EIT application', 'Civil engineering resume'] },
    ],
  },
  {
    id: 13, category: 'Education',
    title: 'K-12 Teacher',
    description: 'Lesson planning, classroom management and certification steps for new teachers',
    icon: '🍎', duration: '3 months',
    modules: [
      { title: 'Planning Lessons', tasks: ['Learning objectives', 'Backward design', 'Differentiated instruction', 'Assessment for learning'] },
      { title: 'Classroom Management', tasks: ['Routines and expectations', 'Positive behaviour support', 'Engagement strategies', 'Working with families'] },
      { title: 'Inclusive Teaching', tasks: ['Supporting English learners', 'IEPs and special education basics', 'Universal Design for Learning', 'Culturally responsive teaching'] },
      { title: 'Certification & Hiring', tasks: ['State certification requirements', 'Praxis exam prep', 'Teaching portfolio', 'Demo lesson for interviews'] },
    ],
  },
  {
    id: 14, category: 'Business & Finance',
    title: 'Business / Data Analyst (non-coders welcome)',
    description: 'Excel, SQL and dashboards to turn data into decisions in any industry',
    icon: '📊', duration: '4 months',
    modules: [
      { title: 'Excel Power Skills', tasks: ['Cleaning data', 'XLOOKUP and IF logic', 'PivotTables', 'Charts that tell a story'] },
      { title: 'SQL Basics', tasks: ['SELECT, WHERE, ORDER BY', 'Joins', 'GROUP BY and aggregates', 'Practice on a real dataset'] },
      { title: 'Dashboards', tasks: ['Power BI or Tableau basics', 'KPIs and metrics', 'Interactive filters', 'Publish a dashboard'] },
      { title: 'Business Thinking', tasks: ['Framing a business question', 'Requirements gathering', 'Presenting insights', 'Analyst case study for your portfolio'] },
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
