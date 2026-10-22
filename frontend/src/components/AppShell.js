import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api, { getUser, logout } from '../lib/api';
import { useTheme } from '../lib/theme';
import { Icon, Dropdown, Avatar, Button, SkeletonRows } from './ui';
import { preload } from '../lib/pages';

export const NAV = [
  {
    label: 'Learn',
    items: [
      { to: '/dashboard', label: 'Overview', icon: 'home' },
      { to: '/roadmaps', label: 'Roadmaps', icon: 'map' },
      { to: '/templates', label: 'Templates', icon: 'layers' },
      { to: '/study-planner', label: 'Study planner', icon: 'calendar' },
      { to: '/quiz', label: 'Practice quiz', icon: 'quiz' },
      { to: '/quiz-performance', label: 'Performance', icon: 'chart' },
      { to: '/certificates', label: 'Certificates', icon: 'award' },
    ],
  },
  {
    label: 'Career',
    items: [
      { to: '/jobs', label: 'Job board', icon: 'briefcase' },
      { to: '/applications', label: 'Applications', icon: 'list' },
      { to: '/career-advisor', label: 'Career advisor', icon: 'compass' },
      { to: '/resume-builder', label: 'Resume builder', icon: 'file' },
    ],
  },
  {
    label: 'AI tools',
    items: [
      { to: '/ai-generator', label: 'Roadmap generator', icon: 'wand' },
      { to: '/chat', label: 'Ask AI', icon: 'message' },
    ],
  },
];

const TITLES = {
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/feedback': 'Feedback',
};

function useTitle(pathname) {
  for (const g of NAV) for (const i of g.items) if (pathname === i.to || pathname.startsWith(i.to + '/')) return i.label;
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/module-evaluation') || pathname.startsWith('/roadmap-evaluation')) return 'Assessment';
  if (pathname.startsWith('/certificate')) return 'Certificates';
  if (pathname.startsWith('/quiz')) return 'Practice quiz';
  return '';
}

export default function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const user = getUser() || {};
  const title = useTitle(pathname);

  const lastSeen = useRef(null);
  // Live bell: check every 30s while the tab is open (and right away when you come back to it).
  // If something new arrives while you're in another tab, show a browser notification (when allowed).
  const refreshUnread = useCallback(() => {
    api.get('/notifications/summary', { noCache: true })
      .then((r) => {
        const { unread: n, latest } = r.data || {};
        setUnread(n || 0);
        if (latest && lastSeen.current !== null && latest.id > lastSeen.current && !latest.is_read && document.hidden
          && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const note = new Notification(latest.title, { body: latest.message || '', icon: '/logo192.png', tag: `lm-${latest.id}` });
            note.onclick = () => { window.focus(); navigate(latest.link || '/notifications'); note.close(); };
          } catch { /* some browsers only allow notifications from a service worker */ }
        }
        if (latest) lastSeen.current = Math.max(lastSeen.current || 0, latest.id);
        else if (lastSeen.current === null) lastSeen.current = 0;
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    const tick = () => { if (!document.hidden || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) refreshUnread(); };
    const id = setInterval(tick, 30000);
    const onVisible = () => { if (!document.hidden) refreshUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [refreshUnread]);

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { refreshUnread(); }, [pathname, refreshUnread]);

  const doLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <Link to="/dashboard" className="sidebar-brand">
          <span className="brand-mark"><Icon name="compass" size={15} stroke={2} /></span>
          <span className="brand-name">LearnMap</span>
        </Link>
        <nav className="sidebar-nav">
          {NAV.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/quiz'} onMouseEnter={() => preload(i.to)} onFocus={() => preload(i.to)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <Icon name={i.icon} size={16} />
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/feedback" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon name="feedback" size={16} /> Send feedback
          </NavLink>
        </div>
      </aside>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <Button variant="ghost" icon="menu" className="menu-toggle" onClick={() => setOpen(true)} aria-label="Open menu" />
          <div className="crumb"><strong>{title}</strong></div>
          <div className="topbar-actions">
            <Button
              variant="ghost"
              icon={theme === 'dark' ? 'sun' : 'moon'}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            />
            <div style={{ position: 'relative' }}>
              <Button variant="ghost" icon="bell" onClick={() => navigate('/notifications')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 9, background: 'var(--accent)', boxShadow: '0 0 0 2px var(--bg)' }} />
              )}
            </div>
            <Dropdown
              trigger={({ toggle }) => (
                <button onClick={toggle} aria-label="Account menu" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 2, marginLeft: 4, borderRadius: '50%' }}>
                  <Avatar name={user.name || user.email || ''} />
                </button>
              )}
            >
              <div className="menu-header">
                <div style={{ fontWeight: 500 }} className="truncate">{user.name || 'Your account'}</div>
                <div className="small subtle truncate">{user.email}</div>
              </div>
              <div className="menu-sep" />
              <Link to="/profile" className="menu-item"><Icon name="user" size={15} /> Profile</Link>
              <Link to="/notifications" className="menu-item"><Icon name="bell" size={15} /> Notifications</Link>
              <button className="menu-item" onClick={toggleTheme}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /> {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <div className="menu-sep" />
              <button className="menu-item danger" onClick={doLogout}><Icon name="logout" size={15} /> Log out</button>
            </Dropdown>
          </div>
        </header>
        <main className="content page-enter" key={pathname}>
          <Suspense fallback={<div className="card" style={{ marginTop: 8 }}><SkeletonRows rows={4} /></div>}>
            <Outlet context={{ refreshUnread }} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
