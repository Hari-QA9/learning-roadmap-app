import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ResourceSection({ taskId, headers }) {
  const [resources, setResources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('article');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchResources();
  }, [taskId]);

  const fetchResources = async () => {
    try {
      const res = await axios.get(
        'http://localhost:5000/api/resources/' + taskId,
        { headers }
      );
      setResources(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await axios.post(
        'http://localhost:5000/api/resources',
        { task_id: taskId, title, url, type },
        { headers }
      );
      setTitle('');
      setUrl('');
      setType('article');
      setShowForm(false);
      fetchResources();
    } catch (err) {
      alert('Failed to add resource');
    }
  };

  const handleToggle = async (resource) => {
    try {
      await axios.put(
        'http://localhost:5000/api/resources/' + resource.id,
        {
          is_completed: resource.is_completed ? 0 : 1,
          title: resource.title,
          url: resource.url,
          type: resource.type
        },
        { headers }
      );
      fetchResources();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(
        'http://localhost:5000/api/resources/' + id,
        { headers }
      );
      fetchResources();
    } catch (err) {
      alert('Failed to delete resource');
    }
  };

  const getTypeIcon = function(type) {
    if (type === 'video') return '🎥';
    if (type === 'course') return '💻';
    if (type === 'documentation') return '📄';
    if (type === 'note') return '📝';
    return '🔗';
  };

  return (
    <div style={{
      borderTop: '1px solid #f3f4f6',
      background: '#fafafa',
      padding: '8px 12px'
    }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <button
          onClick={function() { setShowResources(!showResources); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: '600',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          📎 {resources.length} Resource{resources.length !== 1 ? 's' : ''}
          {resources.length > 0 && (
            <span style={{ color: '#9ca3af' }}>
              {showResources ? ' ▼' : ' ▶'}
            </span>
          )}
        </button>

        <button
          onClick={function() {
            setShowForm(!showForm);
            setShowResources(true);
          }}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            color: '#667eea',
            fontSize: '12px',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          + Add Resource
        </button>
      </div>

      {showResources && resources.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          marginBottom: '8px'
        }}>
          {resources.map(function(resource) {
            return (
              <div
                key={resource.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <input
                  type="checkbox"
                  checked={resource.is_completed === 1}
                  onChange={function() { handleToggle(resource); }}
                  style={{ cursor: 'pointer' }}
                />
                <span>{getTypeIcon(resource.type)}</span>
                <div style={{ flex: 1 }}>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: resource.is_completed ? '#9ca3af' : '#667eea',
                        fontSize: '13px',
                        textDecoration: resource.is_completed ? 'line-through' : 'none',
                        fontWeight: '500'
                      }}
                    >
                      {resource.title}
                    </a>
                  ) : (
                    <span style={{
                      color: resource.is_completed ? '#9ca3af' : '#374151',
                      fontSize: '13px',
                      textDecoration: resource.is_completed ? 'line-through' : 'none'
                    }}>
                      {resource.title}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  background: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  textTransform: 'capitalize'
                }}>
                  {resource.type}
                </span>
                <button
                  onClick={function() { handleDelete(resource.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    opacity: 0.5,
                    padding: '2px'
                  }}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            background: 'white',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            marginTop: '8px'
          }}
        >
          <input
            type="text"
            placeholder="Resource title (e.g. React Hooks Tutorial)"
            value={title}
            onChange={function(e) { setTitle(e.target.value); }}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box',
              marginBottom: '8px'
            }}
          />
          <input
            type="text"
            placeholder="URL (e.g. https://youtube.com/...)"
            value={url}
            onChange={function(e) { setUrl(e.target.value); }}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box',
              marginBottom: '8px'
            }}
          />
          <select
            value={type}
            onChange={function(e) { setType(e.target.value); }}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box',
              marginBottom: '8px',
              background: 'white'
            }}
          >
            <option value="article">📝 Article</option>
            <option value="video">🎥 Video</option>
            <option value="course">💻 Course</option>
            <option value="documentation">📄 Documentation</option>
            <option value="note">🗒️ Note</option>
          </select>
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
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={function() {
                setShowForm(false);
                setTitle('');
                setUrl('');
                setType('article');
              }}
              style={{
                padding: '8px 16px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

export default ResourceSection;
