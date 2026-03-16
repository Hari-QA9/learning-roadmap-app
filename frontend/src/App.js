import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Roadmaps from './pages/Roadmaps';
import RoadmapDetail from './pages/RoadmapDetail';
import AIGenerator from './pages/AIGenerator';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps"
          element={
            <ProtectedRoute>
              <Roadmaps />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps/:id"
          element={
            <ProtectedRoute>
              <RoadmapDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-generator"
          element={
            <ProtectedRoute>
              <AIGenerator />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
