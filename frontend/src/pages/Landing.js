import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: '🤖', title: 'AI Roadmap Generator', desc: 'Type any topic and AI instantly creates a complete personalized learning roadmap for you.' },
    { icon: '📋', title: 'Track Your Progress', desc: 'Break learning into modules and tasks. Mark progress from Pending to In Progress to Done.' },
    { icon: '🔗', title: 'Free Resources', desc: 'AI recommends free YouTube videos, documentation and courses for every topic.' },
    { icon: '💬', title: 'AI Chat Assistant', desc: 'Ask any learning question and get instant personalized guidance from AI.' },
    { icon: '📝', title: 'Quiz Yourself', desc: 'AI generates quizzes to test your knowledge and track your performance.' },
    { icon: '🏆', title: 'Earn Badges and XP', desc: 'Stay motivated with badges, XP points, levels and daily streaks.' },
    { icon: '📄', title: 'Resume Builder', desc: 'Build a professional resume from your learning journey and completed roadmaps.' },
    { icon: '💼', title: 'Job Board', desc: 'Find jobs that match your skills and apply directly from the app.' }
  ];

  const steps = [
    { step: '01', title: 'Sign Up Free', desc: 'Create your account in seconds with just your name and email.' },
    { step: '02', title: 'Enter a Topic', desc: 'Type what you want to learn — Python, Web Dev, Data Science, anything!' },
    { step: '03', title: 'AI Builds Your Roadmap', desc: 'AI creates a complete step by step learning plan with resources.' },
    { step: '04', title: 'Track and Grow', desc: 'Complete tasks, earn badges, take quizzes and build your resume.' }
  ];

  const testimonials = [
    { name: 'Sarah M.', role: 'Software Engineer', text: 'This app helped me go from zero to landing my first dev job in 6 months!', avatar: 'S' },
    { name: 'James K.', role: 'Data Scientist', text: 'The AI roadmap feature is incredible. It saved me weeks of research.', avatar: 'J' },
    { name: 'Priya L.', role: 'Student', text: 'I love the quiz feature. It really helps me retain what I learn.', avatar: 'P' }
  ];

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: 'white' }}>

      {/* NAVBAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🚀</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>LearnPath AI</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={function() { navigate('/login'); }}
            style={{ padding: '8px 20px', background: 'transparent', border: '2px solid #8b5cf6', color: '#8b5cf6', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Login
          </button>
          <button
            onClick={function() { navigate('/signup'); }}
            style={{ padding: '8px 20px', background: '#8b5cf6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '80px 40px', textAlign: 'center', color: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px' }}>
            Powered by Google Gemini AI
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 'bold', margin: '0 0 20px', lineHeight: '1.2' }}>
            Learn Anything with
            <span style={{ display: 'block', color: '#fbbf24' }}>AI-Powered Roadmaps</span>
          </h1>
          <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '40px', lineHeight: '1.6' }}>
            Stop wondering where to start. Our AI creates personalized learning roadmaps,
            tracks your progress, and helps you land your dream job.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={function() { navigate('/signup'); }}
              style={{ padding: '16px 40px', background: '#fbbf24', color: '#1e293b', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
              Start Learning Free
            </button>
            <button
              onClick={function() { navigate('/login'); }}
              style={{ padding: '16px 40px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid white', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
              Login
            </button>
          </div>
          <p style={{ marginTop: '16px', fontSize: '14px', opacity: 0.8 }}>
            Free forever. No credit card required.
          </p>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ background: '#1e293b', padding: '30px 40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', textAlign: 'center' }}>
          {[
            { number: '10,000+', label: 'Active Learners' },
            { number: '50,000+', label: 'Roadmaps Created' },
            { number: '500+', label: 'Topics Covered' },
            { number: '95%', label: 'Success Rate' }
          ].map(function(stat, i) {
            return (
              <div key={i}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>{stat.number}</div>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div style={{ padding: '80px 40px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 12px' }}>
              Everything You Need to Succeed
            </h2>
            <p style={{ fontSize: '18px', color: '#64748b' }}>
              One platform to learn, track, and land your dream job
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            {features.map(function(feature, i) {
              return (
                <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.2s' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>{feature.icon}</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', color: '#1e293b' }}>{feature.title}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: '80px 40px', background: 'white' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 12px' }}>
              How It Works
            </h2>
            <p style={{ fontSize: '18px', color: '#64748b' }}>
              Get started in minutes
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
            {steps.map(function(step, i) {
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 'bold', margin: '0 auto 16px' }}>
                    {step.step}
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1e293b' }}>{step.title}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{ padding: '80px 40px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 12px' }}>
              What Our Users Say
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {testimonials.map(function(t, i) {
              return (
                <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px', fontStyle: 'italic' }}>
                    "{t.text}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px' }}>{t.name}</div>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA SECTION */}
      <div style={{ padding: '80px 40px', background: 'linear-gradient(135deg, #667eea, #764ba2)', textAlign: 'center', color: 'white' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 'bold', margin: '0 0 16px' }}>
            Ready to Start Your Journey?
          </h2>
          <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '40px' }}>
            Join thousands of learners who are already building their dream careers.
          </p>
          <button
            onClick={function() { navigate('/signup'); }}
            style={{ padding: '18px 48px', background: '#fbbf24', color: '#1e293b', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '20px' }}>
            Get Started Free Today
          </button>
          <p style={{ marginTop: '16px', fontSize: '14px', opacity: 0.8 }}>
            No credit card required. Free forever.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: '#1e293b', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>🚀</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>LearnPath AI</span>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
          Built with React, Node.js, MySQL and Google Gemini AI
        </p>
        <p style={{ margin: 0, fontSize: '13px' }}>
          Group: Nephilims — Karthikeya Reddy Maddikuntla and Sai Hari Chandra Prasad Cherukumalla
        </p>
      </div>

    </div>
  );
}

export default Landing;
