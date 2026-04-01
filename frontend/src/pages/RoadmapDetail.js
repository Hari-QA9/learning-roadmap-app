import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [roadmap, setRoadmap] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState({});
  const [resources, setResources] = useState([]);
  const [evalStatus, setEvalStatus] = useState({});
  const [activeTab, setActiveTab] = useState('modules');
  const [loading, setLoading] = useState(true);

  const [newModule, setNewModule] = useState('');
  const [newTask, setNewTask] = useState({});
  const [newTaskDueDate, setNewTaskDueDate] = useState({});
  const [newTaskPriority, setNewTaskPriority] = useState({});

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchRoadmap(), fetchModules(), fetchResources()]);
    setLoading(false);
  };

  const fetchRoadmap = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/roadmaps/${id}`, authHeaders);
      setRoadmap(res.data);
    } catch (err) {
      console.error('Error fetching roadmap:', err);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/modules/${id}`, authHeaders);
      const moduleList = res.data || [];
      setModules(moduleList);

      for (const mod of moduleList) {
        fetchTasks(mod.id);
        fetchEvalStatus(mod.id);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const fetchTasks = async (moduleId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/tasks/${moduleId}`, authHeaders);
      setTasks((prev) => ({
        ...prev,
        [moduleId]: res.data || [],
      }));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/resources/${id}`, authHeaders);
      setResources(res.data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
    }
  };

  const fetchEvalStatus = async (moduleId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/evaluation/module-status/${moduleId}`,
        authHeaders
      );
      setEvalStatus((prev) => ({
        ...prev,
        [moduleId]: res.data?.passed === true,
      }));
    } catch (err) {
      setEvalStatus((prev) => ({
        ...prev,
        [moduleId]: false,
      }));
    }
  };

  const addModule = async () => {
    if (!newModule.trim()) return;

    try {
      await axios.post(
        'http://localhost:5000/api/modules',
        {
          roadmap_id: id,
          title: newModule,
          description: '',
          order_index: modules.length,
        },
        authHeaders
      );
      setNewModule('');
      fetchModules();
    } catch (err) {
      console.error('Error adding module:', err);
    }
  };

  const deleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/modules/${moduleId}`, authHeaders);
      fetchModules();
    } catch (err) {
      console.error('Error deleting module:', err);
    }
  };

  const addTask = async (moduleId) => {
    const title = newTask[moduleId]?.trim();
    if (!title) return;

    try {
      await axios.post(
        'http://localhost:5000/api/tasks',
        {
          module_id: moduleId,
          roadmap_id: id,
          title,
          description: '',
          due_date: newTaskDueDate[moduleId] || null,
          priority: newTaskPriority[moduleId] || 'medium',
        },
        authHeaders
      );

      setNewTask((prev) => ({ ...prev, [moduleId]: '' }));
      setNewTaskDueDate((prev) => ({ ...prev, [moduleId]: '' }));
      setNewTaskPriority((prev) => ({ ...prev, [moduleId]: 'medium' }));
      fetchTasks(moduleId);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const updateTaskStatus = async (task, moduleId) => {
    const nextStatus =
      task.status === 'pending'
        ? 'in_progress'
        : task.status === 'in_progress'
        ? 'done'
        : 'pending';

    try {
      await axios.put(
        `http://localhost:5000/api/tasks/${task.id}`,
        {
          title: task.title,
          description: task.description || '',
          status: nextStatus,
          due_date: task.due_date || null,
          priority: task.priority || 'medium',
        },
        authHeaders
      );
      fetchTasks(moduleId);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const deleteTask = async (taskId, moduleId) => {
    if (!window.confirm('Delete this task?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/tasks/${taskId}`, authHeaders);
      fetchTasks(moduleId);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const isModuleUnlocked = (modIndex) => {
    if (modIndex === 0) return true;
    const prevModule = modules[modIndex - 1];
    return evalStatus[prevModule?.id] === true;
  };

  const allModulesComplete = () => {
    return modules.every((mod) => {
      const moduleTasks = tasks[mod.id] || [];
      const allDone = moduleTasks.length > 0 && moduleTasks.every((t) => t.status === 'done');
      return allDone && evalStatus[mod.id] === true;
    });
  };

  const getStatusColor = (status) => {
    if (status === 'done') return '#22c55e';
    if (status === 'in_progress') return '#f59e0b';
    return '#94a3b8';
  };

  const getStatusLabel = (status) => {
    if (status === 'done') return 'Done';
    if (status === 'in_progress') return 'In Progress';
    return 'Pending';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#f59e0b';
    return '#64748b';
  };

  const getPriorityBg = (priority) => {
    if (priority === 'high') return 'rgba(239,68,68,0.1)';
    if (priority === 'medium') return 'rgba(245,158,11,0.1)';
    return 'rgba(100,116,139,0.1)';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'high') return '🔴';
    if (priority === 'medium') return '🟡';
    return '🟢';
  };

  const isDueOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '40px', color: '#fff', background: '#0f172a' }}>
        Loading roadmap...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: '#fff',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/roadmaps')}
          style={{
            marginBottom: '20px',
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>

        <div
          style={{
            background: '#1e293b',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid #334155',
          }}
        >
          <h1 style={{ margin: 0, marginBottom: '10px', color: '#f8fafc' }}>
            {roadmap?.title || 'Roadmap'}
          </h1>

          {roadmap?.goal && (
            <p style={{ margin: '8px 0', color: '#cbd5e1' }}>
              <strong>Goal:</strong> {roadmap.goal}
            </p>
          )}

          {roadmap?.duration && (
            <p style={{ margin: '8px 0', color: '#cbd5e1' }}>
              <strong>Duration:</strong> {roadmap.duration}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px' }}>
            <button
              onClick={() => navigate('/roadmaps')}
              style={actionBtn('#3b82f6')}
            >
              View All Roadmaps
            </button>

            <button
              onClick={() => navigate('/roadmaps')}
              style={actionBtn('#22c55e')}
            >
              Take Quiz
            </button>

            {allModulesComplete() && (
              <button
                onClick={() => navigate(`/roadmap-evaluation/${id}`)}
                style={actionBtn('#8b5cf6')}
              >
                🎓 Final Evaluation
              </button>
            )}
          </div>
        </div>

        {modules.length > 0 && (
          <div
            style={{
              background: '#1e293b',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid #334155',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Course Progress</h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {modules.map((mod, i) => {
                const moduleTasks = tasks[mod.id] || [];
                const allTasksDone =
                  moduleTasks.length > 0 && moduleTasks.every((t) => t.status === 'done');
                const passed = evalStatus[mod.id] === true;

                return (
                  <div
                    key={mod.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '999px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      fontSize: '14px',
                    }}
                  >
                    {passed ? '✅' : allTasksDone ? '⏳' : isModuleUnlocked(i) ? '🔓' : '🔒'} Module{' '}
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('modules')}
            style={tabBtn(activeTab === 'modules')}
          >
            Modules and Tasks
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            style={tabBtn(activeTab === 'resources')}
          >
            Free Resources ({resources.length})
          </button>
        </div>

        {activeTab === 'modules' && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                placeholder="Add new module..."
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addModule()}
                style={inputStyle}
              />
              <button onClick={addModule} style={actionBtn('#8b5cf6')}>
                Add Module
              </button>
            </div>

            {modules.length === 0 && (
              <div style={cardStyle}>
                <p style={{ margin: 0, color: '#cbd5e1' }}>
                  No modules yet. Add your first module above.
                </p>
              </div>
            )}

            {modules.map((mod, modIndex) => {
              const moduleTasks = tasks[mod.id] || [];
              const doneCount = moduleTasks.filter((t) => t.status === 'done').length;
              const unlocked = isModuleUnlocked(modIndex);
              const allTasksDone =
                moduleTasks.length > 0 && moduleTasks.every((t) => t.status === 'done');
              const passed = evalStatus[mod.id] === true;

              return (
                <div key={mod.id} style={cardStyle}>
                  {!unlocked && (
                    <div
                      style={{
                        marginBottom: '16px',
                        padding: '12px',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '10px',
                        color: '#fecaca',
                      }}
                    >
                      🔒 Module Locked — Pass Module {modIndex} evaluation to unlock this module.
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, marginBottom: '8px', color: '#fff' }}>
                        {passed ? '✅' : allTasksDone ? '⏳' : unlocked ? '🔓' : '🔒'} Module{' '}
                        {modIndex + 1}: {mod.title}
                      </h3>
                      <p style={{ margin: 0, color: '#cbd5e1' }}>
                        {doneCount}/{moduleTasks.length} tasks done
                        {passed ? ' • Evaluation Passed ✓' : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteModule(mod.id)}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {moduleTasks.length === 0 && (
                    <p style={{ color: '#94a3b8' }}>No tasks yet.</p>
                  )}

                  {moduleTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '14px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', color: '#f8fafc' }}>{task.title}</div>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                background: getStatusColor(task.status),
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              {getStatusLabel(task.status)}
                            </span>

                            {task.due_date && (
                              <span style={{ color: isDueOverdue(task.due_date) ? '#fca5a5' : '#cbd5e1' }}>
                                📅 {new Date(task.due_date).toLocaleDateString()}
                                {isDueOverdue(task.due_date) ? ' (Overdue)' : ''}
                              </span>
                            )}

                            {task.priority && (
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  color: getPriorityColor(task.priority),
                                  background: getPriorityBg(task.priority),
                                  fontSize: '12px',
                                  fontWeight: '600',
                                }}
                              >
                                {getPriorityIcon(task.priority)} {task.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {unlocked && (
                            <button
                              onClick={() => updateTaskStatus(task, mod.id)}
                              style={actionBtn('#f59e0b')}
                            >
                              Change Status
                            </button>
                          )}

                          <button
                            onClick={() => deleteTask(task.id, mod.id)}
                            style={actionBtn('#ef4444')}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {unlocked && (
                    <div
                      style={{
                        marginTop: '16px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '16px',
                      }}
                    >
                      <h4 style={{ marginTop: 0 }}>Add Task</h4>

                      <div style={{ display: 'grid', gap: '12px' }}>
                        <input
                          type="text"
                          placeholder="Add new task..."
                          value={newTask[mod.id] || ''}
                          onChange={(e) =>
                            setNewTask((prev) => ({
                              ...prev,
                              [mod.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && addTask(mod.id)}
                          style={inputStyle}
                        />

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <input
                            type="date"
                            value={newTaskDueDate[mod.id] || ''}
                            onChange={(e) =>
                              setNewTaskDueDate((prev) => ({
                                ...prev,
                                [mod.id]: e.target.value,
                              }))
                            }
                            style={inputStyle}
                          />

                          <select
                            value={newTaskPriority[mod.id] || 'medium'}
                            onChange={(e) =>
                              setNewTaskPriority((prev) => ({
                                ...prev,
                                [mod.id]: e.target.value,
                              }))
                            }
                            style={inputStyle}
                          >
                            <option value="low">🟢 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🔴 High</option>
                          </select>

                          <button onClick={() => addTask(mod.id)} style={actionBtn('#22c55e')}>
                            Add Task
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {unlocked && allTasksDone && !passed && (
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={() => navigate(`/module-evaluation/${mod.id}`)}
                        style={actionBtn('#8b5cf6')}
                      >
                        📝 Take Module Evaluation
                      </button>
                    </div>
                  )}

                  {passed && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#bbf7d0',
                      }}
                    >
                      ✅ Module evaluation passed! Next module is unlocked.
                    </div>
                  )}
                </div>
              );
            })}

            {allModulesComplete() && (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #1e293b, #312e81)',
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎓</div>
                <h2>All Modules Complete!</h2>
                <p style={{ color: '#cbd5e1' }}>
                  You have completed all modules and passed all evaluations. Take the final
                  evaluation to earn your certificate.
                </p>
                <button
                  onClick={() => navigate(`/roadmap-evaluation/${id}`)}
                  style={actionBtn('#22c55e')}
                >
                  🏆 Take Final Evaluation & Earn Certificate
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Free Learning Resources ({resources.length})</h3>

            {resources.length === 0 && (
              <p style={{ color: '#cbd5e1' }}>
                No resources yet. Generate a roadmap with AI to get free resources.
              </p>
            )}

            {resources.map((resource, index) => (
              <div
                key={resource.id || index}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                }}
              >
                <h4 style={{ margin: 0, marginBottom: '8px' }}>{resource.title}</h4>
                <p style={{ margin: '6px 0', color: '#cbd5e1' }}>
                  Type: {resource.type || 'article'}
                </p>
                <p style={{ margin: '6px 0', color: '#22c55e', fontWeight: '600' }}>FREE</p>

                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '600' }}
                  >
                    Open Resource
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtn = (bg) => ({
  background: bg,
  color: '#fff',
  border: 'none',
  padding: '10px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '600',
});

const tabBtn = (active) => ({
  background: active ? '#8b5cf6' : '#1e293b',
  color: '#fff',
  border: '1px solid #334155',
  padding: '10px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: '600',
});

const inputStyle = {
  flex: 1,
  minWidth: '220px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #475569',
  background: '#fff',
  color: '#111827',
  outline: 'none',
  fontSize: '14px',
  cursor: 'text',
};

const cardStyle = {
  background: '#1e293b',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '20px',
  border: '1px solid #334155',
};

export default RoadmapDetail;