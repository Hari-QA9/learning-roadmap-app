import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: '🤖', title: 'AI Roadmap Generator', desc: 'Type any topic and AI instantly builds a complete personalized learning roadmap for you.', color: '#8b5cf6' },
    { icon: '🎯', title: 'Career Advisor', desc: 'Get AI-powered career guidance, job role suggestions and salary insights based on your skills.', color: '#06b6d4' },
    { icon: '📅', title: 'Study Planner', desc: 'AI generates a personalized weekly study schedule based on your goals and availability.', color: '#10b981' },
    { icon: '📄', title: 'Resume Builder', desc: 'Build a professional resume with AI scoring, ATS checker and multiple design templates.', color: '#f59e0b' },
    { icon: '🧠', title: 'Smart Quizzes', desc: 'AI-generated quizzes test your knowledge and track performance after every module.', color: '#ec4899' },
    { icon: '🏆', title: 'Badges & Streaks', desc: 'Stay motivated with achievement badges, daily streaks and progress tracking.', color: '#a78bfa' },
  ];

  const stats = [
    { value: '16+', label: 'Database Tables' },
    { value: '17+', label: 'API Endpoints' },
    { value: '15+', label: 'App Pages' },
    { value: '100%', label: 'AI Powered' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 48px',
        background: 'rgba(2,8,23,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139,92,246,0.15)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            borderRadius: '8px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}>📚</div>
          <span style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '18px', fontWeight: '700',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>LEARNMAP</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/login')} style={{
            background: 'transparent',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '10px', padding: '10px 24px',
            color: '#a78bfa', cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700', fontSize: '14px',
            letterSpacing: '0.05em',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >SIGN IN</button>
          <button onClick={() => navigate('/signup')} style={{
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            border: 'none', borderRadius: '10px',
            padding: '10px 24px', color: 'white',
            cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700', fontSize: '14px',
            letterSpacing: '0.05em',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 35px rgba(139,92,246,0.7)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.4)'}
          >GET STARTED</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        textAlign: 'center',
        padding: '100px 24px 80px',
        position: 'relative',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', top: '10%', left: '10%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: '350px', height: '350px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px', padding: '6px 18px',
          marginBottom: '32px',
          color: '#a78bfa', fontSize: '13px',
          fontFamily: 'Rajdhani, sans-serif',
          fontWeight: '600', letterSpacing: '0.08em',
        }}>
          <span style={{
            width: '6px', height: '6px',
            background: '#10b981', borderRadius: '50%',
            boxShadow: '0 0 8px #10b981',
            display: 'inline-block',
          }} />
          AI-POWERED LEARNING PLATFORM
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '72px', fontWeight: '700',
          lineHeight: '1.1', marginBottom: '24px',
          color: '#f1f5f9',
        }}>
          Learn Smarter.<br />
          <span style={{
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Grow Faster.</span>
        </h1>

        <p style={{
          fontSize: '18px', color: '#64748b',
          maxWidth: '600px', margin: '0 auto 48px',
          lineHeight: '1.7',
        }}>
          Your AI-powered companion for building personalized learning roadmaps,
          tracking progress, and accelerating your career growth.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/signup')} style={{
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            border: 'none', borderRadius: '14px',
            padding: '16px 40px', color: 'white',
            cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700', fontSize: '16px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 0 30px rgba(139,92,246,0.5)',
            transition: 'all 0.3s ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 0 50px rgba(139,92,246,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(139,92,246,0.5)';
            }}
          >🚀 Start For Free</button>

          <button onClick={() => navigate('/login')} style={{
            background: 'transparent',
            border: '1px solid rgba(6,182,212,0.4)',
            borderRadius: '14px', padding: '16px 40px',
            color: '#67e8f9', cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700', fontSize: '16px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'all 0.3s ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(6,182,212,0.1)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >Sign In →</button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: '0', flexWrap: 'wrap',
        borderTop: '1px solid rgba(139,92,246,0.1)',
        borderBottom: '1px solid rgba(139,92,246,0.1)',
        background: 'rgba(139,92,246,0.03)',
        marginBottom: '80px',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '32px 60px', textAlign: 'center',
            borderRight: i < stats.length - 1
              ? '1px solid rgba(139,92,246,0.1)' : 'none',
          }}>
            <div style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '36px', fontWeight: '700',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '6px',
            }}>{s.value}</div>
            <div style={{
              color: '#475569', fontSize: '13px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '600', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <div style={{ padding: '0 48px 100px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '48px', fontWeight: '700',
            color: '#f1f5f9', marginBottom: '16px',
          }}>Everything You Need to<br />
            <span style={{
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Level Up</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px' }}>
            Powered by Google Gemini AI — built for serious learners
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'rgba(10,22,40,0.8)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${f.color}22`,
              borderRadius: '20px', padding: '32px',
              transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = f.color + '55';
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 12px 40px ${f.color}18`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = f.color + '22';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, ${f.color}, transparent)`,
              }} />
              <div style={{
                width: '52px', height: '52px',
                background: `${f.color}18`,
                border: `1px solid ${f.color}33`,
                borderRadius: '14px',
                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                fontSize: '24px', marginBottom: '20px',
              }}>
                {f.icon}
              </div>
              <h3 style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '20px', fontWeight: '700',
                color: '#f1f5f9', marginBottom: '10px',
              }}>{f.title}</h3>
              <p style={{
                color: '#64748b', fontSize: '14px',
                lineHeight: '1.7',
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA SECTION ── */}
      <div style={{
        textAlign: 'center',
        padding: '80px 24px',
        background: 'rgba(139,92,246,0.04)',
        borderTop: '1px solid rgba(139,92,246,0.1)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '48px', fontWeight: '700',
          color: '#f1f5f9', marginBottom: '16px',
        }}>Ready to Start Your Journey?</h2>
        <p style={{
          color: '#64748b', fontSize: '16px',
          marginBottom: '40px',
        }}>Join learners who are already building their dream careers.</p>
        <button onClick={() => navigate('/signup')} style={{
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          border: 'none', borderRadius: '14px',
          padding: '18px 52px', color: 'white',
          cursor: 'pointer',
          fontFamily: 'Rajdhani, sans-serif',
          fontWeight: '700', fontSize: '18px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          boxShadow: '0 0 40px rgba(139,92,246,0.5)',
          transition: 'all 0.3s ease',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(139,92,246,0.7)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(139,92,246,0.5)';
          }}
        >🚀 Get Started Free Today</button>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        textAlign: 'center', padding: '32px',
        borderTop: '1px solid rgba(139,92,246,0.1)',
        color: '#334155', fontSize: '14px',
        fontFamily: 'Rajdhani, sans-serif',
        letterSpacing: '0.05em',
      }}>
        <span style={{
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700',
        }}>LEARNMAP</span>
        {' '}· Built by Nephilims · Powered by Google Gemini AI
      </div>
    </div>
  );
}

export default Landing;