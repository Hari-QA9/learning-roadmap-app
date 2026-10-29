import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage, logout } from '../lib/api';
import { useToast } from './Toast';
import { Card, Button, Modal, Field, Input } from './ui';

/** Profile → Your data: download everything, or delete the account. */
export default function DataCard({ email }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    try {
      const r = await api.get('/account/export', { noCache: true });
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `learnvoy-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not download your data'));
    } finally {
      setDownloading(false);
    }
  };

  const matches = email && confirm.trim().toLowerCase() === String(email).toLowerCase();

  const remove = async (e) => {
    e.preventDefault();
    if (!matches) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete('/account', { data: { confirm: confirm.trim() } });
      logout({ everything: true });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the account'));
      setDeleting(false);
    }
  };

  const close = () => { if (!deleting) { setOpen(false); setConfirm(''); setError(''); } };

  return (
    <Card title="Your data" description={<>Download a copy or delete your account. See the <Link to="/privacy">Privacy Policy</Link>.</>}>
      <div className="row row-wrap" style={{ gap: 8 }}>
        <Button icon="download" loading={downloading} onClick={download}>Download my data</Button>
        <Button variant="danger" icon="trash" onClick={() => setOpen(true)}>Delete account</Button>
      </div>

      <Modal
        open={open}
        onClose={close}
        title="Delete your account?"
        description="This permanently deletes your account, roadmaps, resume, job applications and everything else. It can’t be undone."
        footer={
          <>
            <Button onClick={close} disabled={deleting}>Cancel</Button>
            <Button variant="danger-solid" loading={deleting} disabled={!matches} onClick={remove}>Delete forever</Button>
          </>
        }
      >
        <form onSubmit={remove}>
          {error && <div className="alert alert-danger mb-2">{error}</div>}
          <p className="small muted mb-2">Tip: download your data first if you might want it later.</p>
          <Field label={<>Type <strong>{email}</strong> to confirm</>}>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={email} aria-label="Type your email to confirm" />
          </Field>
        </form>
      </Modal>
    </Card>
  );
}
