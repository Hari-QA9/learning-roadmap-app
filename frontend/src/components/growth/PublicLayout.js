import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Button } from '../ui';
import { isLoggedIn } from '../../lib/api';
import { useTheme } from '../../lib/theme';

/** Simple frame for pages anyone can open (profiles, shared roadmaps, certificate checks). */
export default function PublicLayout({ children, cta }) {
  const { theme, toggleTheme } = useTheme();
  const loggedIn = isLoggedIn();
  return (
    <div className="pub">
      <header className="pub-top">
        <Link to="/" className="row" style={{ color: 'var(--text)', textDecoration: 'none', gap: 8 }}>
          <span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span>
          <span className="brand-name">LearnMap</span>
        </Link>
        <div className="row" style={{ gap: 6 }}>
          <Button variant="ghost" size="sm" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label="Toggle theme" />
          {loggedIn
            ? <Link className="btn btn-secondary btn-sm" to="/dashboard">Open app</Link>
            : <Link className="btn btn-primary btn-sm" to="/signup">{cta || 'Join free'}</Link>}
        </div>
      </header>
      <main className="pub-body page-enter">{children}</main>
      <footer className="pub-foot">
        <span>Made with LearnMap — plan what you want to learn and track it to the finish.</span>
        <span className="row" style={{ gap: 14 }}><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></span>
      </footer>
    </div>
  );
}
