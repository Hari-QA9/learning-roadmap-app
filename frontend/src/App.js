import React from 'react';
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


function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/roadmaps" element={<PrivateRoute><Roadmaps /></PrivateRoute>} />
        <Route path="/roadmap/:id" element={<PrivateRoute><RoadmapDetail /></PrivateRoute>} />
        <Route path="/ai-generator" element={<PrivateRoute><AIGenerator /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/quiz-performance" element={<PrivateRoute><QuizPerformance /></PrivateRoute>} />
        <Route path="/feedback" element={<PrivateRoute><Feedback /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/resume" element={<PrivateRoute><ResumeBuilder /></PrivateRoute>} />

      </Routes>
    </Router>
  );
}

export default App;
