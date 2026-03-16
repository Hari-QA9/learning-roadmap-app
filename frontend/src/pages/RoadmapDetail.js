import ResourceSection from '../components/ResourceSection';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [expandedModule, setExpandedModule] = useState(null);
  const [tasks, setTasks] = useState({});
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRoadmap();
    fetchModules();
  }, [id]);

  const fetchRoadmap = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/roadmaps/' + id, { headers });
      setRoadmap(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/modules/' + id, { headers });
      setModules(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (moduleId) => {
    try {
      const res = await axios.get('http://localhost:5000/api/tasks/' + moduleId, { headers });
      setTasks(function(prev) {
        var next = Object.assign({}, prev);
        next[moduleId] = res.data;
        return next;
      });
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/modules', { roadmap_id: id, title: moduleTitle }, { headers });
      setModuleTitle('');
      setShowModuleForm(false);
      fetchModules();
    } catch (err) {
      alert('Failed to add module');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module?')) return;
    try {
      await axios.delete('http://localhost:5000/api/modules/' + moduleId, { headers });
      fetchModules();
    } catch (err) {
      alert('Failed to delete module');
    }
  };

  const handleToggleModule = function(moduleId) {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      fetchTasks(moduleId);
    }
  };

  const handleAddTask = async (e, moduleId) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await axios.post(
        'http://localhost:5000/api/tasks',
        { module_id: moduleId, title: taskTitle, due_date: taskDueDate || null },
        { headers }
      );
      setTaskTitle('');
      setTaskDueDate('');
      setShowTaskForm(null);
      fetchTasks(moduleId);
    } catch (err) {
      alert('Failed to add task');
    }
  };

  const handleToggleStatus = async (task, moduleId) => {
    var newStatus = 'not_started';
    if (task.status === 'not_started') { newStatus = 'in_progress'; }
    else if (task.status === 'in_progress') { newStatus = 'completed'; }
    try {
      await axios.put(
        'http://localhost:5000/api/tasks/' + task.id,
        { title: task.title, status: newStatus, due_date: task.due_date },
        { headers }
      );
      fetchTasks(moduleId);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDeleteTask = async (taskId, moduleId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete('http://localhost:5000/api/tasks/' + taskId, { headers });
      fetchTasks(moduleId);
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const getStatusIcon = function(status) {
    if (status === 'completed') return '✅';
    if (status === 'in_progress') return '⏳';
    return '⚪';
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
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>

        <div style={{
          background: 'white',
          padding: '24px 32px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <button
              onClick={function() { navigate('/roadmaps'); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                padding: 0,
                marginBottom: '8px',
                display: 'block'
              }}
            >
              Back to Roadmaps
            </button>
            <h1 style={{ margin: 0, color: '#1f2937', fontSize: '28px' }}>
              {roadmap ? roadmap.title : 'Loading...'}
            </h1>
            {roadmap && roadmap.description && (
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                {roadmap.description}
              </p>
            )}
          </div>
          <button
            onClick={function() { setShowModuleForm(!showModuleForm); }}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              marginLeft: '16px'
            }}
          >
            + Add Module
          </button>
        </div>

        {showModuleForm && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>Add New Module</h3>
            <form onSubmit={handleAddModule}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="e.g. HTML and CSS Basics"
                  value={moduleTitle}
                  onChange={function(e) { setModuleTitle(e.target.value); }}
                  required
                  autoFocus
                  style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                />
                <button type="submit" style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  Add
                </button>
                <button type="button" onClick={function() { setShowModuleForm(false); setModuleTitle(''); }} style={{ padding: '10px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        {modules.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '60px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>📝</p>
            <h2 style={{ color: '#1f2937', margin: '0 0 8px 0' }}>No modules yet</h2>
            <p style={{ color: '#6b7280', margin: '0 0 24px 0' }}>
              Add your first module to organize your learning!
            </p>
            <button
              onClick={function() { setShowModuleForm(true); }}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Add First Module
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {modules.map(function(module, index) {
              return (
                <div
                  key={module.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: expandedModule === module.id ? '#f9fafb' : 'white'
                    }}
                    onClick={function() { handleToggleModule(module.id); }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '4px'
                      }}>
                        Module {index + 1}
                      </span>
                      <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px' }}>
                        {module.title}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {module.completed_tasks || 0}/{module.total_tasks || 0} tasks
                      </span>
                      <button
                        onClick={function(e) {
                          e.stopPropagation();
                          handleDeleteModule(module.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          opacity: 0.6
                        }}
                      >
                        🗑️
                      </button>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                        {expandedModule === module.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {expandedModule === module.id && (
                    <div style={{
                      padding: '20px 24px',
                      borderTop: '1px solid #e5e7eb',
                      background: '#fafafa'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px'
                      }}>
                        <h4 style={{ margin: 0, color: '#374151' }}>Tasks</h4>
                        <button
                          onClick={function() {
                            if (showTaskForm === module.id) {
                              setShowTaskForm(null);
                            } else {
                              setShowTaskForm(module.id);
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          + Add Task
                        </button>
                      </div>

                      {showTaskForm === module.id && (
                        <form
                          onSubmit={function(e) { handleAddTask(e, module.id); }}
                          style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Task title..."
                            value={taskTitle}
                            onChange={function(e) { setTaskTitle(e.target.value); }}
                            required
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                              marginBottom: '10px'
                            }}
                          />
                          <input
                            type="date"
                            value={taskDueDate}
                            onChange={function(e) { setTaskDueDate(e.target.value); }}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                              marginBottom: '10px'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="submit"
                              style={{
                                padding: '8px 16px',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Add Task
                            </button>
                            <button
                              type="button"
                              onClick={function() {
                                setShowTaskForm(null);
                                setTaskTitle('');
                                setTaskDueDate('');
                              }}
                              style={{
                                padding: '8px 16px',
                                background: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {tasks[module.id] && tasks[module.id].length === 0 && (
                        <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                          No tasks yet. Add your first task!
                        </p>
                      )}

                      {tasks[module.id] && tasks[module.id].map(function(task) {
                        return (
                          <div
                            key={task.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: 'white',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              border: '1px solid #e5e7eb'
                            }}
                          >
                            <span
                              onClick={function() { handleToggleStatus(task, module.id); }}
                              style={{ fontSize: '20px', cursor: 'pointer' }}
                              title="Click to change status"
                            >
                              {getStatusIcon(task.status)}
                            </span>
                            <div style={{ flex: 1 }}>
                              <p style={{
                                margin: 0,
                                color: '#1f2937',
                                fontWeight: '500',
                                fontSize: '14px',
                                textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                              }}>
                                {task.title}
                              </p>
                              {task.due_date && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: task.status === 'completed' ? '#d1fae5' : task.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                              color: task.status === 'completed' ? '#065f46' : task.status === 'in_progress' ? '#92400e' : '#6b7280'
                            }}>
                              {task.status === 'completed' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                            </span>
                            <button
                              onClick={function() { handleDeleteTask(task.id, module.id); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                opacity: 0.6
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                          
                        );
                        <ResourceSection taskId={task.id} headers={headers} />
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoadmapDetail;
