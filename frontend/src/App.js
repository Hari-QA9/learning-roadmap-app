import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { ThemeProvider } from './lib/theme';
import { isLoggedIn } from './lib/api';
import { ToastProvider } from './components/Toast';
import AppShell from './components/AppShell';
import { captureInvite } from './lib/growth';
import { FocusProvider } from './lib/focus';
import { I18nProvider } from './lib/i18n';

import {
  Landing, Login, Signup, ForgotPassword, ResetPassword, Dashboard, Roadmaps, RoadmapDetail, AIGenerator,
  Profile, Notifications, Quiz, QuizPerformance, Feedback, Chat, ResumeBuilder, Templates, CareerAdvisor,
  StudyPlanner, ModuleEvaluation, RoadmapEvaluation, Certificate, Jobs, JobDetail, Applications, Welcome, Interview, InterviewSession, VerifyEmail, Admin, Legal, PublicProfile, SharedRoadmap, VerifyCertificate, Join, Review, Focus, Groups, GroupDetail, Buddies, Challenges, JoinCommunity, CoverLetters, LinkedInHelper, PrepSheet, Insights, Explore, Import, Classes, ClassDetail, preloadAllWhenIdle,
} from './lib/pages';

// Remember a friend's ?invite= code from whatever page the visitor lands on.
captureInvite();

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
    <I18nProvider>
    <ThemeProvider>
      <ToastProvider>
        <FocusProvider>
        <Router>
          <Suspense fallback={<div className="route-loading" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/privacy" element={<Legal page="privacy" />} />
            <Route path="/terms" element={<Legal page="terms" />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/r/:slug" element={<SharedRoadmap />} />
            <Route path="/verify/:id" element={<VerifyCertificate />} />
            <Route path="/join/:code" element={<Join />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/g/:code" element={<JoinCommunity kind="group" />} />
            <Route path="/buddy/:code" element={<JoinCommunity kind="buddy" />} />
            <Route path="/class/:code" element={<JoinCommunity kind="class" />} />

            <Route path="/welcome" element={<PrivateRoute><Welcome /></PrivateRoute>} />

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
              <Route path="/interview" element={<Interview />} />
              <Route path="/interview/:id" element={<InterviewSession />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/review" element={<Review />} />
              <Route path="/focus" element={<Focus />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/buddies" element={<Buddies />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/cover-letters" element={<CoverLetters />} />
              <Route path="/linkedin" element={<LinkedInHelper />} />
              <Route path="/interview-prep/:id" element={<PrepSheet />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/discover" element={<Explore inApp />} />
              <Route path="/import" element={<Import />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/:id" element={<ClassDetail />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
        </FocusProvider>
      </ToastProvider>
    </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
