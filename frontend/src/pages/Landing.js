import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Icon } from '../components/ui';
import { useTheme } from '../lib/theme';

const FEATURES = [
  { icon: 'wand', title: 'AI roadmap generator', desc: 'Describe a topic and get a structured roadmap with modules and tasks in seconds.' },
  { icon: 'compass', title: 'Career advisor', desc: 'Get role suggestions, skill gaps and next steps based on what you already know.' },
  { icon: 'calendar', title: 'Study planner', desc: 'A weekly schedule built around your goal and the hours you actually have.' },
  { icon: 'file', title: 'Resume builder', desc: 'Write a clean resume, score it, and check it against ATS keywords.' },
  { icon: 'quiz', title: 'Quizzes & assessments', desc: 'Test each module, track accuracy, and earn a certificate when you finish.' },
  { icon: 'chart', title: 'Progress you can see', desc: 'Completion, quiz history and activity in one calm overview.' },
];

const STEPS = [
  { t: 'Set a goal', d: 'Start from a template, generate one with AI, or build your own.' },
  { t: 'Work through modules', d: 'Attach resources, tick off tasks, and keep notes as you go.' },
  { t: 'Prove it', d: 'Pass module and roadmap assessments and download your certificate.' },
];

function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const loggedIn = !!localStorage.getItem('token');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
            <span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span>
            <span className="brand-name">LearnMap</span>
          </Link>
          <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
            <Button variant="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label="Toggle theme" />
            {loggedIn ? (
              <Button variant="primary" onClick={() => navigate('/dashboard')} iconRight="arrowRight">Open app</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>Log in</Button>
                <Button variant="primary" onClick={() => navigate('/signup')}>Get started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero page-enter">
        <span className="badge mb-3"><Icon name="sparkles" size={12} /> AI-assisted learning plans</span>
        <h1 className="mt-2">Turn scattered resources into a path you’ll <em>finish</em>.</h1>
        <p>LearnMap helps you plan what to learn, organise every link and note in one place, and track progress until you’re done.</p>
        <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
          <Button variant="primary" size="lg" onClick={() => navigate(loggedIn ? '/dashboard' : '/signup')} iconRight="arrowRight">
            {loggedIn ? 'Go to dashboard' : 'Start for free'}
          </Button>
          {!loggedIn && <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>I have an account</Button>}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card feature">
              <div className="list-icon"><Icon name={f.icon} size={16} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="split" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="section-title">How it works</h2>
            <p className="mt-2" style={{ maxWidth: 440 }}>Three steps, no clutter. Everything you need to go from “I want to learn this” to “I can prove I know it”.</p>
          </div>
          <div className="card card-pad">
            <div className="steps">
              {STEPS.map((s, i) => (
                <div key={s.t} className="step">
                  <div className="step-num">{i + 1}</div>
                  <div>
                    <h3>{s.t}</h3>
                    <p className="small mt-1">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section center">
        <h2 className="section-title">Ready to start your next roadmap?</h2>
        <p className="mt-2 mb-3">It takes less than a minute to set up.</p>
        <Button variant="primary" size="lg" onClick={() => navigate(loggedIn ? '/dashboard' : '/signup')}>
          {loggedIn ? 'Open LearnMap' : 'Create your free account'}
        </Button>
      </section>

      <footer className="footer">LearnMap — Learning Roadmap & Resource Organizer</footer>
    </div>
  );
}

export default Landing;
