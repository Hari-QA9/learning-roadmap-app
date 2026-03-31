import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../App';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, setDarkMode } = useTheme();
  const token = localStorage.getItem('token');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!token) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const links = [
    { path: '/dashboard',      label: 'Dashboard',      icon: '⚡' },
    { path: '/roadmaps',       label: 'Roadmaps',        icon: '🗺️' },
    { path: '/templates',      label: 'Templates',       icon: '📋' },
    { path: '/study-planner',  label: 'Study Planner',   icon: '📅' },
    { path: '/career-advisor', label: 'Career',          icon: '🎯' },
    { path: '/ai-generator',   label: 'AI Generator',    icon: '🤖' },
    { path: '/quiz',           label: 'Quiz',            icon: '🧠' },
    { path: '/resume',         label: 'Resume',          icon: '📄' },
    { path: '/chat',           label: 'Chat',            icon: '💬' },
    { path: '/feedback',       label: 'Feedback',        icon: '⭐' },
  ];

  return (
    <>
      <nav style={{
        background: 'rgba(2, 8, 23, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}>

        {/* LOGO */}
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 0 15px rgba(139,92,246,0.5)',
          }}>📚</div>
          <span style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '16px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.05em',
          }}>LEARNMAP</span>
        </Link>

        {/* NAV LINKS */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {links.map(link => (
            <Link key={link.path} to={link.path} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '600',
              letterSpacing: '0.03em',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              color: isActive(link.path) ? '#fff' : 'rgba(148,163,184,0.8)',
              background: isActive(link.path)
                ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))'
                : 'transparent',
              border: isActive(link.path)
                ? '1px solid rgba(139,92,246,0.4)'
                : '1px solid transparent',
              boxShadow: isActive(link.path)
                ? '0 0 12px rgba(139,92,246,0.2)'
                : 'none',
            }}>
              <span style={{ fontSize: '14px' }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* Dark Mode Toggle */}
          <button onClick={() => setDarkMode(!darkMode)} style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '8px',
            padding: '7px 12px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            color: '#fff',
          }}
            title="Toggle Theme"
          >{darkMode ? '☀️' : '🌙'}</button>

          {/* Notifications */}
          <Link to="/notifications" style={{
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.3)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '16px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}>🔔</Link>

          {/* Profile */}
          <Link to="/profile" style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '16px',
            textDecoration: 'none',
          }}>👤</Link>

          {/* Logout */}
          <button onClick={handleLogout} style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '7px 14px',
            cursor: 'pointer',
            color: '#f87171',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700',
            fontSize: '13px',
            letterSpacing: '0.05em',
            transition: 'all 0.2s ease',
          }}>LOGOUT</button>
        </div>
      </nav>
    </>
  );
}

export default Navbar;