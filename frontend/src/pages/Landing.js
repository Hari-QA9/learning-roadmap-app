import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Icon } from '../components/ui';
import { useTheme } from '../lib/theme';
import { isLoggedIn } from '../lib/api';
import { preload } from '../lib/pages';
import { useT } from '../lib/i18n';
import LanguageSelect from '../components/LanguageSelect';

/** Adds `.in` to every `.reveal` element as it scrolls into view. */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const els = ref.current ? ref.current.querySelectorAll('.reveal') : [];
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* A small, static preview of the app for the hero — no images to download. */
function ProductPreview() {
  const rows = [
    { t: 'Playwright: job-ready in 6 weeks', p: 64, m: '4 modules · 10/16 tasks' },
    { t: 'System design for interviews', p: 38, m: '5 modules · 7/18 tasks' },
    { t: 'Python for data analysis', p: 100, m: '6 modules · 24/24 tasks' },
  ];
  return (
    <div className="lp-device" aria-hidden="true">
      <div className="lp-device-bar"><span /><span /><span /></div>
      <div className="lp-device-body">
        <div className="lp-mock-side">
          <div className="lp-mock-brand"><span className="brand-mark" style={{ width: 20, height: 20, borderRadius: 6 }}><Icon name="compass" size={11} stroke={2.2} /></span> LearnMap</div>
          {['Overview', 'Roadmaps', 'Templates', 'Study planner', 'Practice quiz', 'Career advisor'].map((x, i) => (
            <div key={x} className={`lp-mock-nav ${i === 1 ? 'on' : ''}`}>{x}</div>
          ))}
        </div>
        <div className="lp-mock-main">
          <div className="lp-mock-h">Good evening, Harie</div>
          <div className="lp-mock-stats">
            {[['Roadmaps', '3'], ['Tasks done', '41'], ['Day streak', '12'], ['Quiz accuracy', '86%']].map(([k, v]) => (
              <div key={k} className="lp-mock-stat"><div>{k}</div><b>{v}</b></div>
            ))}
          </div>
          <div className="lp-mock-card">
            {rows.map((r) => (
              <div key={r.t} className="lp-mock-row">
                <div className="lp-mock-ico"><Icon name="map" size={11} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lp-mock-rt"><span>{r.t}</span><span>{r.p}%</span></div>
                  <div className="lp-mock-bar"><i style={{ width: `${r.p}%`, background: r.p === 100 ? 'var(--success)' : undefined }} /></div>
                  <div className="lp-mock-meta">{r.m}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const TILES = [
  { cls: 'lp-tile-wide lp-tile-dark', icon: 'wand', n: 1 },
  { cls: '', icon: 'sparkles', n: 2 },
  { cls: '', icon: 'award', n: 3 },
  { cls: '', icon: 'compass', n: 4 },
  { cls: '', icon: 'file', n: 5 },
  { cls: 'lp-tile-full', icon: 'calendar', n: 6 },
];

function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const loggedIn = isLoggedIn();
  const ref = useReveal();
  const go = (path) => navigate(path);
  const t = useT();

  return (
    <div className="lp" ref={ref}>
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link to="/" className="row" style={{ color: 'var(--text)', textDecoration: 'none', gap: 9 }}>
            <span className="brand-mark" style={{ width: 24, height: 24, borderRadius: 7 }}><Icon name="compass" size={13} stroke={2.2} /></span>
            <span className="brand-name" style={{ fontSize: 16 }}>LearnMap</span>
          </Link>
          <nav className="lp-links">
            <a href="#features">{t('lp.features')}</a>
            <a href="#how">{t('lp.how')}</a>
            <Link to="/explore">{t('lp.explore')}</Link>
          </nav>
          <div className="row" style={{ marginLeft: 'auto', gap: 4 }}>
            <Button variant="ghost" size="sm" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label="Toggle theme" />
            {loggedIn ? (
              <Button variant="primary" size="sm" onMouseEnter={() => preload('/dashboard')} onClick={() => go('/dashboard')}>{t('lp.open')}</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onMouseEnter={() => preload('/login')} onClick={() => go('/login')}>{t('lp.login')}</Button>
                <Button variant="primary" size="sm" onMouseEnter={() => preload('/signup')} onClick={() => go('/signup')}>{t('lp.start')}</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <p className="lp-eyebrow page-enter">LearnMap</p>
        <h1 className="lp-title page-enter" style={{ animationDelay: '60ms' }}>
          {t('lp.title1')}<br /><span className="lp-gradient">{t('lp.title2')}</span>
        </h1>
        <p className="lp-sub page-enter" style={{ animationDelay: '140ms' }}>
          {t('lp.sub')}
        </p>
        <div className="lp-ctas page-enter" style={{ animationDelay: '220ms' }}>
          <Button variant="primary" size="lg" onMouseEnter={() => preload(loggedIn ? '/dashboard' : '/signup')} onClick={() => go(loggedIn ? '/dashboard' : '/signup')}>
            {loggedIn ? t('lp.open') : t('lp.ctaFree')}
          </Button>
          {!loggedIn && (
            <button className="lp-link-btn" onMouseEnter={() => preload('/login')} onClick={() => go('/login')}>
              {t('lp.login')} <Icon name="chevronRight" size={15} />
            </button>
          )}
        </div>
        <div className="lp-preview page-enter" style={{ animationDelay: '320ms' }}>
          <ProductPreview />
        </div>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section-head reveal">
          <h2 className="section-title">{t('lp.need1')}<br /><span style={{ color: 'var(--text-3)' }}>{t('lp.need2')}</span></h2>
        </div>
        <div className="lp-bento">
          {TILES.map((tile, i) => (
            <div key={tile.n} className={`lp-tile reveal ${tile.cls}`} style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
              <div className="lp-tile-icon"><Icon name={tile.icon} size={20} /></div>
              <div className="lp-kicker">{t(`lp.t${tile.n}k`)}</div>
              <h3 className="lp-tile-title">{t(`lp.t${tile.n}t`)}</h3>
              <p className="lp-tile-body">{t(`lp.t${tile.n}b`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="how">
        <div className="lp-section-head reveal">
          <h2 className="section-title">{t('lp.how1')}<br />{t('lp.how2')}</h2>
        </div>
        <div className="lp-steps">
          {[
            ['1', t('lp.s1t'), t('lp.s1d')],
            ['2', t('lp.s2t'), t('lp.s2d')],
            ['3', t('lp.s3t'), t('lp.s3d')],
          ].map(([n, title, d], i) => (
            <div key={n} className="lp-step reveal" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="lp-step-n">{n}</div>
              <h3>{title}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final reveal">
        <h2 className="section-title">{t('lp.final')}</h2>
        <p className="lp-sub" style={{ marginTop: 14 }}>{t('lp.finalSub')}</p>
        <div className="lp-ctas" style={{ marginTop: 28 }}>
          <Button variant="primary" size="lg" onClick={() => go(loggedIn ? '/dashboard' : '/signup')}>{loggedIn ? t('lp.open') : t('lp.createFree')}</Button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="row row-wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
          <span>© {new Date().getFullYear()} LearnMap · {t('footer.tagline')}</span>
          <span className="row" style={{ gap: 16, alignItems: 'center' }}><Link to="/privacy">{t('footer.privacy')}</Link><Link to="/terms">{t('footer.terms')}</Link><LanguageSelect compact /></span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
