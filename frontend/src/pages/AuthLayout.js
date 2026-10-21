import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Button } from '../components/ui';
import { useTheme } from '../lib/theme';

export default function AuthLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
          <span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span>
          <span className="brand-name">LearnMap</span>
        </Link>
        <div>
          <blockquote>“A goal without a plan is just a wish. Turn what you want to learn into a path you can actually finish.”</blockquote>
          <div className="row mt-3 small muted" style={{ gap: 18 }}>
            <span className="row" style={{ gap: 6 }}><Icon name="map" size={14} /> Structured roadmaps</span>
            <span className="row" style={{ gap: 6 }}><Icon name="wand" size={14} /> AI planning</span>
            <span className="row" style={{ gap: 6 }}><Icon name="award" size={14} /> Certificates</span>
          </div>
        </div>
        <div className="small subtle">© {new Date().getFullYear()} LearnMap</div>
      </aside>
      <main className="auth-main">
        <div style={{ position: 'fixed', top: 16, right: 16 }}>
          <Button variant="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
        <div className="auth-card page-enter">{children}</div>
      </main>
    </div>
  );
}
