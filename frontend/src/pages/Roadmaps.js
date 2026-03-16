import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function Roadmaps() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const res = await axios.get(
        'http://localhost:5000/api/roadmaps',
        { headers }
      );
      setRoadmaps(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/api/roadmaps',
        { title, description },
        { headers }
      );
      setTitle('');
      setDescription('');
      setShowForm(false);
      fetchRoadmaps();
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to create roadmap');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this roadmap?')) return;
    try {
      await axios.delete(
        'http://localhost:5000/api/roadmaps/' + id,
        { headers }
      );
      fetchRoadmaps();
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#6b7280' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      <Navbar />

      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '32px' }}>
              My Roadmaps
            </h1>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {roadmaps.length} roadmap{roadmaps.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={function() { setShowForm(!showForm); }}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            + New Roadmap
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
              Create New Roadmap
            </h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full-Stack Web Development"
                  value={title}
                  onChange={function(e) { setTitle(e.target.value); }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Description (optional)
                </label>
                <textarea
                  placeholder="What is this roadmap about?"
                  value={description}
                  onChange={function(e) { setDescription(e.target.value); }}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Create Roadmap
                </button>
                <button
                  type="button"
                  onClick={function() {
                    setShowForm(false);
                    setTitle('');
                    setDescription('');
                  }}
                  style={{
                    padding: '10px 24px',
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Roadmaps Grid */}
        {roadmaps.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '80px 40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '64px', margin: '0 0 16px 0' }}>📚</p>
            <h2 style={{ color: '#1f2937', margin: '0 0 8px 0' }}>
              No roadmaps yet
            </h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
              Create your first learning roadmap to get started!
            </p>
            <button
              onClick={function() { setShowForm(true); }}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              + Create First Roadmap
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {roadmaps.map(function(roadmap) {
              return (
                <div
                  key={roadmap.id}
                  onClick={function() { navigate('/roadmaps/' + roadmap.id); }}
                  style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={function(e) {
                    e.currentTarget.style.border = '2px solid #667eea';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={function(e) {
                    e.currentTarget.style.border = '2px solid transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#1f2937',
                      fontSize: '18px',
                      flex: 1
                    }}>
                      {roadmap.title}
                    </h3>
                    <button
                      onClick={function(e) { handleDelete(roadmap.id, e); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px',
                        marginLeft: '8px',
                        opacity: 0.6
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  <p style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    margin: '0 0 16px 0',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {roadmap.description || 'No description'}
                  </p>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '6px'
                    }}>
                      <div style={{
                        width: (roadmap.progress || 0) + '%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                      {roadmap.progress || 0}% Complete
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#9ca3af',
                    paddingTop: '12px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <span>📚 {roadmap.total_modules || 0} modules</span>
                    <span>✅ {roadmap.completed_tasks || 0}/{roadmap.total_tasks || 0} tasks</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Roadmaps;
