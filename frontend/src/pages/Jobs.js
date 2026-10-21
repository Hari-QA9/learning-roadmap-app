import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage, clearCache } from '../lib/api';
import { useToast } from '../components/Toast';
import JobPrefsModal from '../components/JobPrefsModal';
import JobRow, { SOURCE_LABEL } from '../components/JobRow';
import {
  PageHeader, Button, Card, EmptyState, SkeletonRows, Input, Select, Segmented, Modal, Field, Textarea, Alert, timeAgo,
} from '../components/ui';

const emptyCustom = { title: '', company: '', location: '', url: '', description: '' };

function Jobs() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState(emptyCustom);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState(params.get('q') || '');
  const debounce = useRef();

  const view = params.get('view') || 'for-you';
  const sort = params.get('sort') || 'match';
  const remote = params.get('remote') === '1';
  const source = params.get('source') || '';
  const page = Number(params.get('page')) || 1;

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v === '' || v == null || v === false) next.delete(k); else next.set(k, v === true ? '1' : v);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    const qs = { q: params.get('q') || '', sort, page, remote: remote ? '1' : '', source, saved: view === 'saved' ? '1' : '' };
    const req = api.get('/jobs', { params: qs }).then((r) => setData(r.data));
    const recReq = view === 'for-you' && page === 1 && !params.get('q')
      ? api.get('/jobs/recommended', { params: { limit: 6 } }).then((r) => setRecs(r.data)).catch(() => setRecs(null))
      : Promise.resolve(setRecs(null));
    Promise.all([req, recReq])
      .catch((e) => toast.error(errorMessage(e, 'Could not load jobs')))
      .finally(() => setLoading(false));
  }, [params, sort, page, remote, source, view, toast]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (v) => {
    setText(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam('q', v.trim()), 350);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await api.post('/jobs/refresh');
      toast.success(r.data.message || 'Jobs refreshed');
      clearCache();
      load();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not refresh jobs'));
    } finally {
      setRefreshing(false);
    }
  };

  const addCustom = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const r = await api.post('/jobs/custom', custom);
      toast.success('Job added — here’s how you match');
      setCustomOpen(false);
      setCustom(emptyCustom);
      navigate(`/jobs/${r.data.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add the job'));
    } finally {
      setAdding(false);
    }
  };

  const profile = data?.profile;
  const board = data?.board;
  const jobs = data?.jobs || [];
  const recIds = new Set((recs?.jobs || []).map((j) => j.id));
  const showRecs = recs && recs.jobs && recs.jobs.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Career"
        title="Job board"
        description="Fresh roles from public job boards, ranked by how well you fit — with AI to tailor your application and close the gaps."
        actions={
          <>
            <Button icon="settings" onClick={() => setPrefsOpen(true)}>Preferences</Button>
            <Button variant="primary" icon="plus" onClick={() => setCustomOpen(true)}>Add a job</Button>
          </>
        }
      />

      {profile && !profile.hasSkills && (
        <Alert tone="info">
          <div className="row-between row-wrap">
            <span>Tell us your target role and skills to see your match score on every job.</span>
            <Button size="sm" variant="primary" onClick={() => setPrefsOpen(true)}>Set preferences</Button>
          </div>
        </Alert>
      )}

      <div className="job-toolbar mt-2">
        <Segmented
          value={view}
          onChange={(v) => setParam('view', v === 'for-you' ? '' : v)}
          options={[{ value: 'for-you', label: 'For you' }, { value: 'all', label: 'All jobs' }, { value: 'saved', label: 'Saved' }]}
        />
        <Input className="grow" value={text} onChange={(e) => onSearch(e.target.value)} placeholder="Search title, company or skill" aria-label="Search jobs" />
        <Select value={source} onChange={(e) => setParam('source', e.target.value)} aria-label="Source" style={{ maxWidth: 160 }}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => setParam('sort', e.target.value === 'match' ? '' : e.target.value)} aria-label="Sort" style={{ maxWidth: 150 }}>
          <option value="match">Best match</option>
          <option value="recent">Newest</option>
        </Select>
        <label className="row small nowrap" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={remote} onChange={(e) => setParam('remote', e.target.checked)} /> Remote
        </label>
      </div>

      {showRecs && view === 'for-you' && (
        <Card title="Top picks for you" description="Recent roles where your skills overlap the most" pad={false} className="mt-3">
          <div className="list">{recs.jobs.map((j) => <JobRow key={j.id} job={j} />)}</div>
        </Card>
      )}

      <Card
        className="mt-3"
        pad={false}
        title={view === 'saved' ? 'Saved jobs' : showRecs && view === 'for-you' ? 'More jobs' : 'Jobs'}
        description={data ? `${data.total} role${data.total === 1 ? '' : 's'}${data.sort === 'match' ? ' · sorted by match' : ' · newest first'}` : ' '}
        actions={
          <Button variant="ghost" size="sm" icon="refresh" loading={refreshing} onClick={refresh}>
            {board?.last_refreshed ? `Updated ${timeAgo(board.last_refreshed)}` : 'Refresh'}
          </Button>
        }
      >
        {loading && !data ? (
          <SkeletonRows rows={6} />
        ) : jobs.length === 0 ? (
          board && board.total === 0 ? (
            <EmptyState icon="briefcase" title="Fetching jobs…" description="The board fills itself from public job sites a few seconds after the server starts. Try refreshing in a moment." action={<Button onClick={refresh} loading={refreshing} icon="refresh">Refresh now</Button>} />
          ) : view === 'saved' ? (
            <EmptyState icon="briefcase" title="No saved jobs yet" description="Open any job and save it, or let the AI prepare an application — it lands here." />
          ) : (
            <EmptyState icon="search" title="No jobs match" description="Try a different search or clear the filters." action={<Button onClick={() => { setText(''); setParams({}, { replace: true }); }}>Clear filters</Button>} />
          )
        ) : (
          <div className="list" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 200ms' }}>
            {jobs.filter((j) => view !== 'for-you' || !recIds.has(j.id)).map((j) => <JobRow key={j.id} job={j} />)}
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="card-foot" style={{ justifyContent: 'space-between' }}>
            <Button size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Previous</Button>
            <span className="small muted">Page {page} of {data.pages}</span>
            <Button size="sm" iconRight="chevronRight" disabled={page >= data.pages} onClick={() => setParam('page', String(page + 1))}>Next</Button>
          </div>
        )}
      </Card>

      <p className="tiny subtle mt-2">
        Listings come from public job boards and company career pages. Each job shows where it was posted, and you always apply on the original site.
      </p>

      <JobPrefsModal open={prefsOpen} onClose={() => setPrefsOpen(false)} onSaved={() => { clearCache(); load(); }} />

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add a job you found"
        description="Paste any posting (LinkedIn, Indeed, a company site) to get your match, a tailored application and a gap plan."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={adding} onClick={addCustom}>Add job</Button>
          </>
        }
      >
        <form className="stack" onSubmit={addCustom}>
          <div className="grid-2">
            <Field label="Job title"><Input value={custom.title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} placeholder="QA Automation Engineer" /></Field>
            <Field label="Company" optional><Input value={custom.company} onChange={(e) => setCustom({ ...custom, company: e.target.value })} /></Field>
          </div>
          <div className="grid-2">
            <Field label="Location" optional><Input value={custom.location} onChange={(e) => setCustom({ ...custom, location: e.target.value })} placeholder="Remote, New York…" /></Field>
            <Field label="Link to apply" optional><Input value={custom.url} onChange={(e) => setCustom({ ...custom, url: e.target.value })} placeholder="https://" /></Field>
          </div>
          <Field label="Job description" hint="Paste the full description — responsibilities and requirements.">
            <Textarea rows={9} value={custom.description} onChange={(e) => setCustom({ ...custom, description: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </>
  );
}

export default Jobs;
