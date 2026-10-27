import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';

// Plain-language Privacy Policy and Terms. Set REACT_APP_CONTACT_EMAIL in frontend/.env
// (or the hosting settings) so members have an address to write to.
const CONTACT = process.env.REACT_APP_CONTACT_EMAIL || '';
const UPDATED = 'October 26, 2026';

const Contact = () => (CONTACT
  ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
  : <>the <Link to="/feedback">Feedback</Link> page in the app</>);

function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated {UPDATED}</p>
      <p>LearnMap helps you plan what to learn, track your progress, build a resume and find jobs. This page explains, in plain language, what we store, why, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> name, email address and a securely hashed password (we never see or store the password itself). If you use Sign in with Google, we receive your name and email from Google.</li>
        <li><strong>What you create:</strong> roadmaps, tasks, notes, quiz results, certificates, your resume and its versions, your career preferences, saved jobs, job applications and mock-interview answers.</li>
        <li><strong>Settings:</strong> email preferences, daily goal, time zone and theme.</li>
        <li><strong>Usage records:</strong> when you finish tasks (for your streak), and a count of AI requests (to keep the service within its limits). We keep a short in-memory log of server errors to fix problems.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the features you use — showing your roadmaps, scoring your resume, matching jobs to your skills.</li>
        <li>To send emails you can control in Profile → Email: password resets, email confirmation, reminders, weekly summaries, job alerts and follow-ups. Every optional email has an unsubscribe link.</li>
        <li>We don’t sell your data, show ads, or share it with advertisers.</li>
      </ul>

      <h2>Services that help run LearnMap</h2>
      <ul>
        <li><strong>AI (Google Gemini):</strong> when you use an AI feature, the text needed for that request (for example your goal, a task, your resume or a job description) is sent to Google’s Gemini API to generate the answer.</li>
        <li><strong>Job listings</strong> come from public job boards and job-search APIs. We send them search terms such as job titles — never your personal details.</li>
        <li><strong>Email delivery</strong> uses an email provider, which receives your address and the message.</li>
        <li><strong>Hosting and database</strong> providers store the app and its data on our behalf.</li>
        <li><strong>Sign in with Google</strong> (optional) is handled by Google under Google’s privacy policy.</li>
      </ul>

      <h2>Things you choose to make public</h2>
      <ul>
        <li><strong>Public profile:</strong> off by default. If you turn it on (Profile → Public profile), anyone with the link can see what you pick: name, headline, links, skills, roadmaps and progress, certificates, and resume sections. Never your email or phone number.</li>
        <li><strong>Shared roadmaps:</strong> when you share a roadmap, anyone with the link can see its modules, tasks and resources and copy it. Your progress and notes stay private. If you also switch on “List on Explore”, it appears on the public Explore page with your first name (or your public profile name). You can stop sharing at any time.</li>
        <li><strong>Certificates:</strong> anyone with a certificate ID can check it’s real and see the name and roadmap on it.</li>
        <li><strong>Invites:</strong> if you join through a friend’s invite link, they see your first name in their list of friends who joined.</li>
        <li><strong>Study groups:</strong> members of a group you join see your name, your weekly activity counts (tasks, focus minutes, cards reviewed), your streak and what you post in the group chat. The group owner can remove messages and members.</li>
        <li><strong>Study buddies:</strong> a buddy you accept sees your streak, whether you hit today’s goal and your weekly counts — never your task names or notes.</li>
        <li><strong>Classes:</strong> if you join a class, its teacher or mentor sees your name, email, your progress on the roadmaps they assign, when you were last active, and your weekly task and focus counts. Leave the class at any time.</li>
        <li><strong>Leaderboards:</strong> your friends and group members can see your weekly points. You appear on the public “Everyone” leaderboard only if you switch it on, and then only as first name and last initial.</li>
      </ul>

      <h2>Cookies and storage</h2>
      <p>We don’t use tracking or advertising cookies. Your browser stores your login session and preferences (such as dark mode) locally so the app works.</p>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Download your data:</strong> Profile → Your data → Download my data (a JSON file).</li>
        <li><strong>Delete your account:</strong> Profile → Your data → Delete account. This permanently removes your account and everything in it.</li>
        <li>Edit your profile and email preferences at any time in Profile.</li>
      </ul>

      <h2>Security</h2>
      <p>Passwords are hashed, connections to the site use HTTPS, and each member can only access their own data. No system is perfectly secure, so please use a unique password.</p>

      <h2>Children</h2>
      <p>LearnMap is not intended for children under 13, and we don’t knowingly collect their data.</p>

      <h2>Changes and contact</h2>
      <p>If we change this policy we’ll update the date above. Questions or requests: <Contact />.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="legal-updated">Last updated {UPDATED}</p>
      <p>By creating an account or using LearnMap you agree to these terms. If you don’t agree, please don’t use the service.</p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate information and keep your password private. You’re responsible for activity on your account.</li>
        <li>You must be at least 13 years old to use LearnMap.</li>
      </ul>

      <h2>Your content</h2>
      <p>You own what you create — roadmaps, notes, resumes and so on. You give us permission to store and process it only to run the service for you (including sending it to our AI provider when you use AI features).</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don’t try to access other members’ data, break or overload the service, or get around usage limits.</li>
        <li>Don’t use LearnMap for anything illegal, or to upload content that is harmful or that you don’t have the right to share.</li>
      </ul>

      <h2>AI, jobs and resources</h2>
      <ul>
        <li>AI suggestions (roadmaps, resume edits, interview feedback, job-fit analysis) can be wrong or incomplete. Check important details yourself.</li>
        <li>Job listings and learning resources come from third parties. We don’t employ, endorse or guarantee them, and apply on the employer’s own site at your own discretion.</li>
        <li>Certificates show progress inside LearnMap; they aren’t accredited qualifications.</li>
      </ul>

      <h2>The service</h2>
      <p>LearnMap is provided “as is”. We work to keep it available and accurate but can’t guarantee it will always be error-free or uninterrupted, and we may change or discontinue features. To the extent the law allows, we aren’t liable for indirect losses from using the service.</p>

      <h2>Ending your use</h2>
      <p>You can delete your account at any time in Profile → Your data. We may suspend accounts that break these terms.</p>

      <h2>Changes and contact</h2>
      <p>We may update these terms and will change the date above when we do. Questions: <Contact />.</p>
    </>
  );
}

export default function Legal({ page }) {
  useEffect(() => { window.scrollTo(0, 0); document.title = `${page === 'terms' ? 'Terms of Use' : 'Privacy Policy'} · LearnMap`; return () => { document.title = 'LearnMap'; }; }, [page]);
  return (
    <div className="legal">
      <header className="legal-top">
        <Link to="/" className="row" style={{ color: 'var(--text)', textDecoration: 'none', gap: 8 }}>
          <span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span>
          <span className="brand-name">LearnMap</span>
        </Link>
        <nav className="row small" style={{ gap: 16 }}>
          <Link to="/privacy" aria-current={page === 'privacy' ? 'page' : undefined}>Privacy</Link>
          <Link to="/terms" aria-current={page === 'terms' ? 'page' : undefined}>Terms</Link>
        </nav>
      </header>
      <article className="legal-body">{page === 'terms' ? <Terms /> : <Privacy />}</article>
    </div>
  );
}
