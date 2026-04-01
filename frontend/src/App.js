import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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

export const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/roadmaps"
            element={
              <PrivateRoute>
                <Roadmaps />
              </PrivateRoute>
            }
          />

          <Route
            path="/roadmaps/:id"
            element={
              <PrivateRoute>
                <RoadmapDetail />
              </PrivateRoute>
            }
          />

          <Route
            path="/ai-generator"
            element={
              <PrivateRoute>
                <AIGenerator />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route
  path="/quiz"
  element={
    <PrivateRoute>
      <Quiz />
    </PrivateRoute>
  }
/>

          <Route
            path="/quiz/:moduleId"
            element={
              <PrivateRoute>
                <Quiz />
              </PrivateRoute>
            }
          />

          <Route
            path="/quiz-performance"
            element={
              <PrivateRoute>
                <QuizPerformance />
              </PrivateRoute>
            }
          />

          <Route
            path="/feedback"
            element={
              <PrivateRoute>
                <Feedback />
              </PrivateRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />

          <Route
            path="/resume-builder"
            element={
              <PrivateRoute>
                <ResumeBuilder />
              </PrivateRoute>
            }
          />

          <Route
            path="/templates"
            element={
              <PrivateRoute>
                <Templates />
              </PrivateRoute>
            }
          />

          <Route
            path="/career-advisor"
            element={
              <PrivateRoute>
                <CareerAdvisor />
              </PrivateRoute>
            }
          />

          <Route
            path="/study-planner"
            element={
              <PrivateRoute>
                <StudyPlanner />
              </PrivateRoute>
            }
          />

          <Route
            path="/module-evaluation/:moduleId"
            element={
              <PrivateRoute>
                <ModuleEvaluation />
              </PrivateRoute>
            }
          />

          <Route
            path="/roadmap-evaluation/:roadmapId"
            element={
              <PrivateRoute>
                <RoadmapEvaluation />
              </PrivateRoute>
            }
          />

          <Route
            path="/certificate/:roadmapId"
            element={
              <PrivateRoute>
                <Certificate />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;