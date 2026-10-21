import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, EmptyState, Skeleton, Icon, Modal, Badge, Input } from '../components/ui';

function Templates() {
  const navigate = useNavigate();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(null);
  const [preview, setPreview] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/templates')
      .then((r) => setTemplates(r.data.templates || []))
      .catch((e) => toast.error(errorMessage(e, 'Could not load templates')))
      .finally(() => setLoading(false));
  }, [toast]);

  const use = async (t) => {
    setImporting(t.id);
    try {
      const r = await api.post(`/templates/import/${t.id}`);
      toast.success(`“${t.title}” added to your roadmaps`);
      navigate(r.data.roadmapId ? `/roadmaps/${r.data.roadmapId}` : '/roadmaps');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not import template'));
      setImporting(null);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => `${t.title} ${t.description} ${t.modules.map((m) => m.title).join(' ')}`.toLowerCase().includes(q));
  }, [templates, query]);

  const taskCount = (t) => t.modules.reduce((n, m) => n + m.tasks.length, 0);

  return (
    <>
      <PageHeader
        title="Templates"
        description="Proven learning paths you can copy into your roadmaps and adjust to fit."
        actions={<Button icon="wand" onClick={() => navigate('/ai-generator')}>Need something else? Use AI</Button>}
      />

      <div className="input-group mb-3" style={{ maxWidth: 320 }}>
        <Icon name="search" size={15} />
        <Input placeholder="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid-auto">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card card-pad stack"><Skeleton w="50%" h={16} /><Skeleton h={10} /><Skeleton w="70%" h={10} /></div>)}
        </div>
      ) : visible.length === 0 ? (
        <Card><EmptyState icon="search" title="No templates found" description="Try another search, or generate a custom roadmap with AI." /></Card>
      ) : (
        <div className="grid-auto">
          {visible.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-pad grow stack" style={{ gap: 12 }}>
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <div className="list-icon"><Icon name="layers" size={15} /></div>
                  <Badge><Icon name="clock" size={11} /> {t.duration}</Badge>
                </div>
                <div>
                  <h3>{t.title}</h3>
                  <p className="small mt-1">{t.description}</p>
                </div>
                <div className="stack-sm">
                  {t.modules.slice(0, 4).map((m, i) => (
                    <div key={i} className="row small" style={{ gap: 8 }}>
                      <span className="mono tiny subtle" style={{ width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="grow truncate" style={{ color: 'var(--text)' }}>{m.title}</span>
                    </div>
                  ))}
                  {t.modules.length > 4 && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: '0 4px' }} onClick={() => setPreview(t)}>+{t.modules.length - 4} more modules</button>}
                </div>
              </div>
              <div className="card-foot" style={{ justifyContent: 'space-between' }}>
                <span className="tiny subtle">{t.modules.length} modules · {taskCount(t)} tasks</span>
                <div className="row" style={{ gap: 6 }}>
                  <Button variant="ghost" size="sm" onClick={() => setPreview(t)}>Preview</Button>
                  <Button variant="primary" size="sm" loading={importing === t.id} disabled={importing && importing !== t.id} onClick={() => use(t)}>Use template</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview?.title}
        description={preview && `${preview.description} · ${preview.duration}`}
        footer={<><Button onClick={() => setPreview(null)}>Close</Button><Button variant="primary" loading={importing === preview?.id} onClick={() => use(preview)}>Use this template</Button></>}
      >
        {preview && (
          <div className="steps">
            {preview.modules.map((m, i) => (
              <div key={i} className="step">
                <div className="step-num">{i + 1}</div>
                <div>
                  <h3>{m.title}</h3>
                  <div className="row row-wrap mt-1" style={{ gap: 6 }}>
                    {m.tasks.map((task, j) => <Badge key={`${task}-${j}`}>{task}</Badge>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

export default Templates;
