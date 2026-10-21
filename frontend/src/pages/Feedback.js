import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, Field, Input, Textarea, Select, EmptyState, Badge, SkeletonRows, timeAgo } from '../components/ui';

const TOPICS = ['General feedback', 'Bug report', 'Feature request', 'AI quality', 'Design'];

function Feedback() {
  const toast = useToast();
  const [form, setForm] = useState({ topic: TOPICS[0], subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/feedback').then((r) => setHistory(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSending(true);
    try {
      const subject = `[${form.topic}] ${form.subject.trim() || form.message.trim().slice(0, 60)}`;
      await api.post('/feedback', { subject, message: form.message.trim() });
      toast.success('Thanks — your feedback was sent');
      setForm({ topic: form.topic, subject: '', message: '' });
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send feedback'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader title="Send feedback" description="Found a bug or have an idea? Tell us — every message is read." />
      <Card className="mb-3">
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field label="Type">
              <Select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Subject" optional>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary" />
            </Field>
            <Field label="Message" className="full">
              <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What happened, or what would you like to see?" />
            </Field>
          </div>
          <div className="row mt-3" style={{ justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" icon="send" loading={sending} disabled={!form.message.trim()}>Send feedback</Button>
          </div>
        </form>
      </Card>

      <Card title="Your previous feedback" pad={false}>
        {loading ? <SkeletonRows rows={2} /> : history.length === 0 ? (
          <EmptyState icon="feedback" title="Nothing sent yet" description="Your submitted feedback will be listed here." />
        ) : (
          <div className="list">
            {history.map((f) => (
              <div key={f.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{f.subject || 'Feedback'}</div>
                  <div className="small muted mt-1" style={{ whiteSpace: 'pre-wrap' }}>{f.message}</div>
                  <div className="tiny subtle mt-1">{timeAgo(f.created_at)}</div>
                </div>
                <Badge tone={f.status === 'resolved' ? 'success' : undefined}>{f.status || 'open'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Feedback;
