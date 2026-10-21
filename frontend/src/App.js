import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { ThemeProvider } from './lib/theme';
import { isLoggedIn } from './lib/api';
import { ToastProvider } from './components/Toast';
import AppShell from './components/AppShell';

import {
  Landing, Login, Signup, ForgotPassword, ResetPassword, Dashboard, Roadmaps, RoadmapDetail, AIGenerator,
  Profile, Notifications, Quiz, QuizPerformance, Feedback, Chat, ResumeBuilder, Templates, CareerAdvisor,
  StudyPlanner, ModuleEvaluation, RoadmapEvaluation, Certificate, Jobs, JobDetail, Applications, preloadAllWhenIdle,
} from './lib/pages';

function PrivateRoute({ children }) {
  const location = useLocation();
  // Remember where the user was going so login can send them back there.
  if (!isLoggedIn()) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function PublicOnly({ children }) {
  if (isLoggedIn()) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  useEffect(() => { preloadAllWhenIdle(); }, []);
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<div className="route-loading" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/roadmaps" element={<Roadmaps />} />
              <Route path="/roadmaps/:id" element={<RoadmapDetail />} />
              <Route path="/ai-generator" element={<AIGenerator />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/quiz/:moduleId" element={<Quiz />} />
              <Route path="/quiz-performance" element={<QuizPerformance />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/resume-builder" element={<ResumeBuilder />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/career-advisor" element={<CareerAdvisor />} />
              <Route path="/study-planner" element={<StudyPlanner />} />
              <Route path="/module-evaluation/:moduleId" element={<ModuleEvaluation />} />
              <Route path="/roadmap-evaluation/:roadmapId" element={<RoadmapEvaluation />} />
              <Route path="/certificates" element={<Certificate />} />
              <Route path="/certificate/:roadmapId" element={<Certificate />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/applications" element={<Applications />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
