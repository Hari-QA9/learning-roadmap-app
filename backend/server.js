const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/', (req, res) => res.send('Learning Roadmap API Running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const resumeRoutes = require('./routes/resume');
app.use('/api/resume', resumeRoutes);

const templateRoutes = require('./routes/templates');
app.use('/api/templates', templateRoutes);


});
