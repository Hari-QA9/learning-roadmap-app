import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = function(path) {
    return location.pathname === path;
  };

  return (
    <div style={{
      background: 'white',
      padding: '0 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>

      {/* Logo */}
      <div
        onClick={function() { navigate('/dashboard'); }}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 0'
        }}
      >
        <span style={{ fontSize: '24px' }}>📚</span>
        <span style={{
          fontWeight: '700',
          fontSize: '18px',
          color: '#1f2937'
        }}>
          Learning Roadmap
        </span>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={function() { navigate('/dashboard'); }}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            color: isActive('/dashboard') ? '#667eea' : '#6b7280',
            borderBottom: isActive('/dashboard') ? '2px solid #667eea' : '2px solid transparent'
          }}
        >
          Dashboard
        </button>

        <button
          onClick={function() { navigate('/roadmaps'); }}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            color: isActive('/roadmaps') ? '#667eea' : '#6b7280',
            borderBottom: isActive('/roadmaps') ? '2px solid #667eea' : '2px solid transparent'
          }}
        >
          My Roadmaps
        </button>

        <button
          onClick={function() { navigate('/ai-generator'); }}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            color: isActive('/ai-generator') ? '#667eea' : '#6b7280',
            borderBottom: isActive('/ai-generator') ? '2px solid #667eea' : '2px solid transparent'
          }}
        >
          🤖 AI Generator
        </button>
      </div>

      {/* User Info and Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '14px'
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>
            {user.name || 'User'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;
