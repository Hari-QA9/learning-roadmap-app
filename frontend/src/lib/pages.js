import React from 'react';

// Each page is its own small file that downloads only when needed.
// `preload()` starts the download early (on hover, or when the browser is idle),
// so by the time you click, the page is already there.
function lazyPage(load) {
  const Component = React.lazy(load);
  Component.preload = load;
  return Component;
}

export const Landing = lazyPage(() => import('../pages/Landing'));
export const Login = lazyPage(() => import('../pages/Login'));
export const Signup = lazyPage(() => import('../pages/Signup'));
export const ForgotPassword = lazyPage(() => import('../pages/ForgotPassword'));
export const ResetPassword = lazyPage(() => import('../pages/ResetPassword'));
export const Dashboard = lazyPage(() => import('../pages/Dashboard'));
export const Roadmaps = lazyPage(() => import('../pages/Roadmaps'));
export const RoadmapDetail = lazyPage(() => import('../pages/RoadmapDetail'));
export const AIGenerator = lazyPage(() => import('../pages/AIGenerator'));
export const Profile = lazyPage(() => import('../pages/Profile'));
export const Notifications = lazyPage(() => import('../pages/Notifications'));
export const Quiz = lazyPage(() => import('../pages/Quiz'));
export const QuizPerformance = lazyPage(() => import('../pages/QuizPerformance'));
export const Feedback = lazyPage(() => import('../pages/Feedback'));
export const Chat = lazyPage(() => import('../pages/Chat'));
export const ResumeBuilder = lazyPage(() => import('../pages/ResumeBuilder'));
export const Templates = lazyPage(() => import('../pages/Templates'));
export const CareerAdvisor = lazyPage(() => import('../pages/CareerAdvisor'));
export const StudyPlanner = lazyPage(() => import('../pages/StudyPlanner'));
export const ModuleEvaluation = lazyPage(() => import('../pages/ModuleEvaluation'));
export const RoadmapEvaluation = lazyPage(() => import('../pages/RoadmapEvaluation'));
export const Certificate = lazyPage(() => import('../pages/Certificate'));
export const Jobs = lazyPage(() => import('../pages/Jobs'));
export const JobDetail = lazyPage(() => import('../pages/JobDetail'));
export const Applications = lazyPage(() => import('../pages/Applications'));
export const Welcome = lazyPage(() => import('../pages/Welcome'));
export const Interview = lazyPage(() => import('../pages/Interview'));
export const VerifyEmail = lazyPage(() => import('../pages/VerifyEmail'));
export const Admin = lazyPage(() => import('../pages/Admin'));
export const InterviewSession = lazyPage(() => import('../pages/InterviewSession'));
export const Legal = lazyPage(() => import('../pages/Legal'));
export const PublicProfile = lazyPage(() => import('../pages/PublicProfile'));
export const SharedRoadmap = lazyPage(() => import('../pages/SharedRoadmap'));
export const VerifyCertificate = lazyPage(() => import('../pages/VerifyCertificate'));
export const Join = lazyPage(() => import('../pages/Join'));
export const Review = lazyPage(() => import('../pages/Review'));
export const Focus = lazyPage(() => import('../pages/Focus'));
export const Groups = lazyPage(() => import('../pages/Groups'));
export const GroupDetail = lazyPage(() => import('../pages/GroupDetail'));
export const Buddies = lazyPage(() => import('../pages/Buddies'));
export const Challenges = lazyPage(() => import('../pages/Challenges'));
export const JoinCommunity = lazyPage(() => import('../pages/JoinCommunity'));

// Path → page, used to preload on hover.
export const PRELOAD = {
  '/dashboard': Dashboard, '/roadmaps': Roadmaps, '/templates': Templates, '/study-planner': StudyPlanner,
  '/quiz': Quiz, '/quiz-performance': QuizPerformance, '/certificates': Certificate, '/career-advisor': CareerAdvisor,
  '/resume-builder': ResumeBuilder, '/ai-generator': AIGenerator, '/chat': Chat, '/profile': Profile,
  '/review': Review, '/focus': Focus, '/groups': Groups, '/buddies': Buddies, '/challenges': Challenges, '/notifications': Notifications, '/jobs': Jobs, '/applications': Applications, '/interview': Interview, '/feedback': Feedback, '/login': Login, '/signup': Signup,
};

export function preload(path) {
  const page = PRELOAD[path];
  if (page) page.preload().catch(() => {});
}

/** After the first screen is up, quietly fetch every page so later clicks are instant. */
export function preloadAllWhenIdle() {
  const run = () => Object.values(PRELOAD).concat([RoadmapDetail, JobDetail]).forEach((p) => p.preload().catch(() => {}));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}
