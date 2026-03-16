import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function AIGenerator() {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('3 months');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setLoading(true);
    setGenerated(null);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/ai/generate-roadmap',
        { goal, duration, level },
        { headers }
      );
      setGenerated(res.data);
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      const roadmapRes = await axios.post(
        'http://localhost:5000/api/roadmaps',
        { title: generated.title, description: generated.description },
        { headers }
      );
      var roadmapId = roadmapRes.data.id;
      for (var i = 0; i < generated.modules.length; i++) {
        var mod = generated.modules[i];
        var moduleRes = await axios.post(
          'http://localhost:5000/api/modules',
          { roadmap_id: roadmapId, title: mod.title },
          { headers }
        );
        var moduleId = moduleRes.data.id;
        for (var j = 0; j < mod.tasks.length; j++) {
          var task = mod.tasks[j];
          var taskRes = await axios.post(
            'http://localhost:5000/api/tasks',
            { module_id: moduleId, title: task.title },
            { headers }
          );
          var taskId = taskRes.data.id;
          if (task.resources && task.resources.length > 0) {
            for (var k = 0; k < task.resources.length; k++) {
              var resource = task.resources[k];
              await axios.post(
                'http://localhost:5000/api/resources',
                { task_id: taskId, title: resource.title, url: resource.url || '', type: resource.type || 'article' },
                { headers }
              );
            }
          }
        }
      }
      alert('Roadmap saved with free resources!');
      navigate('/roadmaps/' + roadmapId);
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to save roadmap');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar />
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '32px' }}>
            🤖 AI Roadmap Generator
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            AI will create a personalized roadmap with free resources.
          </p>
        </div>
        <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <form onSubmit={handleGenerate}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                What do you want to learn?
              </label>
              <input
                type="text"
                placeholder="e.g. Python, React, Machine Learning..."
                value={goal}
                onChange={function(e) { setGoal(e.target.value); }}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Duration</label>
                <select value={duration} onChange={function(e) { setDuration(e.target.value); }} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}>
                  <option value="1 month">1 Month</option>
                  <option value="3 months">3 Months</option>
                  <option value="6 months">6 Months</option>
                  <option value="1 year">1 Year</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Your Level</label>
                <select value={level} onChange={function(e) { setLevel(e.target.value); }} style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' }}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '🤖 Generating...' : '🚀 Generate Roadmap with AI'}
            </button>
          </form>
        </div>
        {loading && (
          <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>🤖</p>
            <p style={{ color: '#1f2937', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
              AI is creating your roadmap...
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Finding free resources from YouTube, MDN, freeCodeCamp and more!
            </p>
          </div>
        )}

        {generated && (
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '24px' }}>
                  {generated.title}
                </h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  {generated.description}
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '12px 24px', background: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', marginLeft: '16px' }}
              >
                {saving ? 'Saving...' : '💾 Save Roadmap'}
              </button>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <p style={{ margin: 0, color: '#166534', fontSize: '14px', fontWeight: '500' }}>
                All resources below are FREE! From YouTube, MDN, freeCodeCamp, W3Schools and more.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {generated.modules && generated.modules.map(function(mod, modIndex) {
                return (
                  <div key={modIndex} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '14px 20px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        Module {modIndex + 1}
                      </span>
                      <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
                        {mod.title}
                      </h3>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      {mod.tasks && mod.tasks.map(function(task, taskIndex) {
                        return (
                          <div key={taskIndex} style={{ padding: '12px 0', borderBottom: taskIndex < mod.tasks.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: task.resources && task.resources.length > 0 ? '10px' : '0' }}>
                              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#6b7280', flexShrink: 0 }}>
                                {taskIndex + 1}
                              </span>
                              <span style={{ color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
                                {task.title}
                              </span>
                            </div>
                            {task.resources && task.resources.length > 0 && (
                              <div style={{ marginLeft: '34px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {task.resources.map(function(resource, rIndex) {
                                  return (
                                    <div key={rIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                      <span style={{ fontSize: '16px', flexShrink: 0 }}>
                                        {resource.type === 'video' ? '🎥' :
                                         resource.type === 'course' ? '💻' :
                                         resource.type === 'documentation' ? '📄' : '📝'}
                                      </span>
                                      <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#0369a1', fontSize: '13px', textDecoration: 'none', fontWeight: '500', flex: 1 }}
                                      >
                                        {resource.title}
                                      </a>
                                      <span style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '10px', textTransform: 'capitalize', flexShrink: 0 }}>
                                        {resource.type}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIGenerator;
