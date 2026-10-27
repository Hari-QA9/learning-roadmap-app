const express = require('express');
require('dotenv').config();
// Keep recent errors for the admin dashboard.
require('./lib/errorLog').installErrorLog();
const { securityHeaders, corsMiddleware, checkProductionConfig } = require('./lib/security');

checkProductionConfig();

const app = express();

app.disable('x-powered-by');
// Hosting providers (Render, Railway…) sit in front of the app; trust their forwarded HTTPS/IP headers.
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(corsMiddleware());
app.use(express.json({ limit: '1mb' }));

// Routes
const authRoutes = require('./routes/auth');
const roadmapRoutes = require('./routes/roadmaps');
const moduleRoutes = require('./routes/modules');
const taskRoutes = require('./routes/tasks');
const resourceRoutes = require('./routes/resources');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');
const notesRoutes = require('./routes/notes');
const notificationsRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const quizRoutes = require('./routes/quiz');
const badgesRoutes = require('./routes/badges');
const feedbackRoutes = require('./routes/feedback');
const commentsRoutes = require('./routes/comments');
const resumeRoutes = require('./routes/resume');
const templateRoutes = require('./routes/templates');
const evaluationRoutes = require('./routes/evaluation');
const jobsRoutes = require('./routes/jobs');
const applicationsRoutes = require('./routes/applications');
const settingsRoutes = require('./routes/settings');
const interviewRoutes = require('./routes/interviews');
const calendarRoutes = require('./routes/calendar');
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/account');
const growthRoutes = require('./routes/growth');
const publicRoutes = require('./routes/public');
const learningRoutes = require('./routes/learning');
const communityRoutes = require('./routes/community');

app.use('/api/auth', authRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/community', communityRoutes);

app.get('/', (req, res) => res.send('Learning Roadmap API Running'));
// Health check for the hosting provider (also confirms the database answers).
app.get('/api/health', async (req, res) => {
  try {
    await require('./db').promise().query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, message: 'Database unavailable' });
  }
});

// Unknown API routes and unexpected errors return JSON instead of an HTML error page.
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'That request is too large.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid request.' });
  console.error('Unhandled error:', err?.message || err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Add any new columns the app needs (only adds; never removes data).
  require('./lib/migrate')().catch((e) => console.warn('[migrate] skipped:', e.message));
  require('./lib/mailer').verifyMail();
  // Keep the job board fresh (pulls public job APIs every few hours).
  require('./lib/jobSources').scheduleJobRefresh();
  // Reminders, weekly summaries, job alerts and follow-ups (hourly).
  require('./lib/scheduler').startScheduler();
});