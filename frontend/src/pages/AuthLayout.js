import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Button } from '../components/ui';
import { useTheme } from '../lib/theme';
import { useT } from '../lib/i18n';
import LanguageSelect from '../components/LanguageSelect';

export default function AuthLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" className="row" style={{ color: 'var(--text)', textDecoration: 'none' }}>
          <span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span>
          <span className="brand-name">LearnMap</span>
        </Link>
        <div>
          <blockquote>{t('auth.quote')}</blockquote>
          <div className="row mt-3 small muted" style={{ gap: 18 }}>
            <span className="row" style={{ gap: 6 }}><Icon name="map" size={14} /> {t('auth.f1')}</span>
            <span className="row" style={{ gap: 6 }}><Icon name="wand" size={14} /> {t('auth.f2')}</span>
            <span className="row" style={{ gap: 6 }}><Icon name="award" size={14} /> {t('auth.f3')}</span>
          </div>
        </div>
        <div className="small subtle row" style={{ gap: 14 }}>
          <span>© {new Date().getFullYear()} LearnMap</span>
          <Link to="/privacy" style={{ color: 'inherit' }}>{t('footer.privacy')}</Link>
          <Link to="/terms" style={{ color: 'inherit' }}>{t('footer.terms')}</Link>
        </div>
      </aside>
      <main className="auth-main">
        <div className="row" style={{ position: 'fixed', top: 16, right: 16, gap: 6 }}>
          <LanguageSelect compact />
          <Button variant="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label="Toggle theme" />
        </div>
        <div className="auth-card page-enter">{children}</div>
      </main>
    </div>
  );
}
