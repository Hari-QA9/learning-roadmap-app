import React, { useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { useToast } from './Toast';
import { Modal, Button, Field, Input, Textarea, Select } from './ui';

const join = (v) => (Array.isArray(v) ? v.join(', ') : v || '');

/** Career preferences used to match and recommend jobs. */
export default function JobPrefsModal({ open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ target_roles: '', skills: '', level: '', locations: '', remote_only: false });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fromResume, setFromResume] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/jobs/profile')
      .then((r) => {
        const p = r.data || {};
        setFromResume(!!p.fromResume);
        setForm({ target_roles: join(p.target_roles), skills: join(p.skills), level: p.level || '', locations: join(p.locations), remote_only: !!p.remote_only });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.skills.trim() && !form.target_roles.trim()) return toast.error('Add at least a target role or a few skills.');
    setSaving(true);
    try {
      const r = await api.put('/jobs/profile', form);
      toast.success('Preferences saved — your matches are updated');
      onSaved?.(r.data);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your preferences'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your job preferences"
      description="We match every job against these and show you what to learn to close the gap."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save preferences</Button>
        </>
      }
    >
      <form className="stack" onSubmit={save} style={{ opacity: loading ? 0.5 : 1 }}>
        <Field label="Target roles" hint="Separate with commas — e.g. QA Automation Engineer, SDET">
          <Input value={form.target_roles} onChange={set('target_roles')} placeholder="QA Automation Engineer, Software Engineer" />
        </Field>
        <Field label="Your skills" hint={fromResume ? 'Pre-filled from your resume — edit freely.' : 'Separate with commas. Common spellings are understood (node js, postgres, k8s…).'}>
          <Textarea rows={3} value={form.skills} onChange={set('skills')} placeholder="Java, Selenium, SQL, Git, REST APIs" />
        </Field>
        <div className="grid-2">
          <Field label="Level">
            <Select value={form.level} onChange={set('level')}>
              <option value="">Not set</option>
              <option value="intern">Intern / student</option>
              <option value="entry">Entry level</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior</option>
            </Select>
          </Field>
          <Field label="Preferred locations" optional>
            <Input value={form.locations} onChange={set('locations')} placeholder="New York, New Jersey" />
          </Field>
        </div>
        <label className="row small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={form.remote_only} onChange={set('remote_only')} />
          Recommend remote jobs only
        </label>
      </form>
    </Modal>
  );
}
