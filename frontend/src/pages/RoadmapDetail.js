import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function RoadmapDetail() {
  const [roadmap, setRoadmap] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState({});
  const [resources, setResources] = useState([]);
  const [newModule, setNewModule] = useState('');
  const [newTask, setNewTask] = useState({});
  const [newTaskDueDate, setNewTaskDueDate] = useState({});
  const [newTaskPriority, setNewTaskPriority] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('modules');
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(function () { fetchRoadmap(); fetchModules(); fetchResources(); }, []);

  function fetchRoadmap() {
    axios.get('http://localhost:5000/api/roadmaps/' + id, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (res) { setRoadmap(res.data); setLoading(false); })
      .catch(function (err) { console.log(err); setLoading(false); });
  }

  function fetchModules() {
    axios.get('http://localhost:5000/api/modules/' + id, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (res) { setModules(res.data); res.data.forEach(function (m) { fetchTasks(m.id); }); })
      .catch(function (err) { console.log(err); });
  }

  function fetchResources() {
    axios.get('http://localhost:5000/api/resources/' + id, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (res) { setResources(res.data); })
      .catch(function (err) { console.log(err); });
  }

  function fetchTasks(moduleId) {
    axios.get('http://localhost:5000/api/tasks/' + moduleId, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (res) {
        setTasks(function (prev) {
          var u = Object.assign({}, prev);
          u[moduleId] = res.data;
          return u;
        });
      })
      .catch(function (err) { console.log(err); });
  }

  function addModule() {
    if (!newModule.trim()) return;
    axios.post('http://localhost:5000/api/modules', { roadmap_id: id, title: newModule, description: '' }, { headers: { Authorization: 'Bearer ' + token } })
      .then(function () { setNewModule(''); fetchModules(); })
      .catch(function (err) { console.log(err); });
  }

  function deleteModule(moduleId) {
    if (!window.confirm('Delete this module?')) return;
    axios.delete('http://localhost:5000/api/modules/' + moduleId, { headers: { Authorization: 'Bearer ' + token } })
      .then(function () { fetchModules(); })
      .catch(function (err) { console.log(err); });
  }

  function addTask(moduleId) {
    var t = newTask[moduleId];
    if (!t || !t.trim()) return;
    var dueDate = newTaskDueDate[moduleId] || null;
    var priority = newTaskPriority[moduleId] || 'medium';

    axios.post('http://localhost:5000/api/tasks', {
      module_id: moduleId,
      title: t,
      description: '',
      due_date: dueDate,
      priority: priority,
    }, { headers: { Authorization: 'Bearer ' + token } })
      .then(function () {
        setNewTask(function (prev) { var u = Object.assign({}, prev); u[moduleId] = ''; return u; });
        setNewTaskDueDate(function (prev) { var u = Object.assign({}, prev); u[moduleId] = ''; return u; });
        setNewTaskPriority(function (prev) { var u = Object.assign({}, prev); u[moduleId] = 'medium'; return u; });
        fetchTasks(moduleId);
      })
      .catch(function (err) { console.log(err); });
  }

  function updateTaskStatus(task, moduleId) {
    var next = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending';
    axios.put('http://localhost:5000/api/tasks/' + task.id, {
      title: task.title,
      description: task.description || '',
      status: next,
      due_date: task.due_date || null,
      priority: task.priority || 'medium',
    }, { headers: { Authorization: 'Bearer ' + token } })
      .then(function () { fetchTasks(moduleId); })
      .catch(function (err) { console.log(err); });
  }

  function deleteTask(taskId, moduleId) {
    if (!window.confirm('Delete this task?')) return;
    axios.delete('http://localhost:5000/api/tasks/' + taskId, { headers: { Authorization: 'Bearer ' + token } })
      .then(function () { fetchTasks(moduleId); })
      .catch(function (err) { console.log(err); });
  }

  function getStatusColor(s) { return s === 'done' ? '#22c55e' : s === 'in_progress' ? '#f59e0b' : '#94a3b8'; }
  function getStatusLabel(s) { return s === 'done' ? 'Done' : s === 'in_progress' ? 'In Progress' : 'Pending'; }
  function getTypeColor(t) { return t === 'video' ? '#ef4444' : t === 'course' ? '#8b5cf6' : t === 'documentation' ? '#3b82f6' : '#22c55e'; }

  function getPriorityColor(p) {
    return p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#64748b';
  }
  function getPriorityBg(p) {
    return p === 'high' ? 'rgba(239,68,68,0.1)' : p === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.1)';
  }
  function getPriorityIcon(p) {
    return p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢';
  }
  function isDueOverdue(due_date) {
    if (!due_date) return false;
    return new Date(due_date) < new Date();
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontFamily: 'Segoe UI, sans-serif' }}>
        Loading roadmap...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexWrap: 'wrap' }}>
        <button onClick={function () { navigate('/dashboard'); }} style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>{roadmap ? roadmap.title : 'Roadmap'}</h1>
          {roadmap && roadmap.goal && <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Goal: {roadmap.goal}</p>}
          {roadmap && roadmap.duration && <p style={{ margin: '2px 0 0', color: '#06b6d4', fontSize: '13px' }}>Duration: {roadmap.duration}</p>}
        </div>
        <button onClick={function () { navigate('/quiz?roadmap=' + id); }} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Take Quiz
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'white', padding: '6px', borderRadius: '10px', width: 'fit-content' }}>
        <button onClick={function () { setActiveTab('modules'); }} style={{ padding: '10px 24px', background: activeTab === 'modules' ? '#3b82f6' : 'transparent', color: activeTab === 'modules' ? 'white' : '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Modules and Tasks
        </button>
        <button onClick={function () { setActiveTab('resources'); }} style={{ padding: '10px 24px', background: activeTab === 'resources' ? '#3b82f6' : 'transparent', color: activeTab === 'resources' ? 'white' : '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Free Resources ({resources.length})
        </button>
      </div>

      {/* MODULES TAB */}
      {activeTab === 'modules' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Add new module..."
              value={newModule}
              onChange={function (e) { setNewModule(e.target.value); }}
              onKeyPress={function (e) { if (e.key === 'Enter') { addModule(); } }}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
            />
            <button onClick={addModule} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Add Module
            </button>
          </div>

          {modules.length === 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No modules yet. Add your first module above!
            </div>
          )}

          {modules.map(function (mod) {
            var mt = tasks[mod.id] || [];
            var done = mt.filter(function (t) { return t.status === 'done'; }).length;
            var prog = mt.length > 0 ? Math.round((done / mt.length) * 100) : 0;

            return (
              <div key={mod.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

                {/* MODULE HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{mod.title}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{done}/{mt.length} done</span>
                    <button onClick={function () { deleteModule(mod.id); }} style={{ padding: '4px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: prog + '%', background: prog === 100 ? '#22c55e' : '#3b82f6', borderRadius: '3px' }} />
                </div>

                {mt.length === 0 && <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px' }}>No tasks yet.</p>}

                {/* TASKS */}
                {mt.map(function (task) {
                  return (
                    <div key={task.id} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: task.status === 'done' ? '#94a3b8' : '#1e293b', textDecoration: task.status === 'done' ? 'line-through' : 'none', flex: 1 }}>
                          {task.title}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={function () { updateTaskStatus(task, mod.id); }} style={{ padding: '4px 10px', background: getStatusColor(task.status), color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            {getStatusLabel(task.status)}
                          </button>
                          <button onClick={function () { deleteTask(task.id, mod.id); }} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            X
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {task.due_date && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            background: isDueOverdue(task.due_date) ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: isDueOverdue(task.due_date) ? '#ef4444' : '#10b981',
                            border: isDueOverdue(task.due_date) ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)',
                          }}>
                            📅 {new Date(task.due_date).toLocaleDateString()}
                            {isDueOverdue(task.due_date) ? ' (Overdue)' : ''}
                          </span>
                        )}
                        {task.priority && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            background: getPriorityBg(task.priority),
                            color: getPriorityColor(task.priority),
                            border: '1px solid ' + getPriorityColor(task.priority) + '44',
                          }}>
                            {getPriorityIcon(task.priority)} {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ADD TASK FORM */}
                <div style={{ marginTop: '14px', background: '#f1f5f9', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add new task..."
                      value={newTask[mod.id] || ''}
                      onChange={function (e) {
                        var val = e.target.value;
                        setNewTask(function (prev) { var u = Object.assign({}, prev); u[mod.id] = val; return u; });
                      }}
                      onKeyPress={function (e) { if (e.key === 'Enter') { addTask(mod.id); } }}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                    />
                    <button onClick={function () { addTask(mod.id); }} style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                      Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Due Date</label>
                      <input
                        type="date"
                        value={newTaskDueDate[mod.id] || ''}
                        onChange={function (e) {
                          var val = e.target.value;
                          setNewTaskDueDate(function (prev) { var u = Object.assign({}, prev); u[mod.id] = val; return u; });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: 'white' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Priority</label>
                      <select
                        value={newTaskPriority[mod.id] || 'medium'}
                        onChange={function (e) {
                          var val = e.target.value;
                          setNewTaskPriority(function (prev) { var u = Object.assign({}, prev); u[mod.id] = val; return u; });
                        }}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: 'white' }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* RESOURCES TAB */}
      {activeTab === 'resources' && (
        <div>
          <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '18px' }}>
            Free Learning Resources ({resources.length})
          </h3>
          {resources.length === 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No resources yet. Generate a roadmap with AI to get free resources!
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {resources.map(function (resource, i) {
              return (
                <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b', flex: 1, lineHeight: '1.4' }}>
                      {resource.title}
                    </h4>
                    <span style={{ background: getTypeColor(resource.type), color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', marginLeft: '8px', whiteSpace: 'nowrap' }}>
                      {resource.type || 'article'}
                    </span>
                  </div>
                  <span style={{ display: 'inline-block', background: '#f0fdf4', color: '#22c55e', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px', border: '1px solid #86efac' }}>
                    FREE
                  </span>
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}
                    >
                      Open Resource
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default RoadmapDetail;