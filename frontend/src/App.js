import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/Toast';
import AppShell from './components/AppShell';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Roadmaps from './pages/Roadmaps';
import RoadmapDetail from './pages/RoadmapDetail';
import AIGenerator from './pages/AIGenerator';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Quiz from './pages/Quiz';
import QuizPerformance from './pages/QuizPerformance';
import Feedback from './pages/Feedback';
import Chat from './pages/Chat';
import ResumeBuilder from './pages/ResumeBuilder';
import Templates from './pages/Templates';
import CareerAdvisor from './pages/CareerAdvisor';
import StudyPlanner from './pages/StudyPlanner';
import ModuleEvaluation from './pages/ModuleEvaluation';
import RoadmapEvaluation from './pages/RoadmapEvaluation';
import Certificate from './pages/Certificate';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
