import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import CodeEditor from '../components/CodeEditor';
import { check, validate, getSandbox, isLoaded } from '../lib/practice/sandbox';
import { PageHeader, Card, Button, Badge, Icon, Modal, Field, Select, Input, Textarea, Prose, SkeletonRows, ConfirmDialog, EmptyState, Spinner } from '../components/ui';

export const KIND_LABEL = { javascript: 'JavaScript', python: 'Python', sql: 'SQL', html: 'HTML & CSS', written: 'Written answer', numeric: 'Number answer' };
const CODE = ['javascript', 'python', 'sql', 'html'];
const RUNTIME = { python: 'Python', sql: 'the SQL engine' };

function KindSelect({ value, onChange }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Exercise type">
      <option value="">Let the AI choose</option>
      {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </Select>
  );
}

/** /practice/:taskId — a hands-on exercise for one roadmap task. */
export default function Practice() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null); // { task, exercise }
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('loading'); // loading | empty | making | checking | ready | broken
  const [kind, setKind] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const ex = data?.exercise;
  const task = data?.task;

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await api.get(`/practice/task/${taskId}`, { noCache: true });
      setData(r.data);
      setPhase(!r.data.exercise ? 'empty' : r.data.exercise.status === 'pending' ? 'checking' : 'ready');
    } catch (e) { setError(errorMessage(e, 'Could not load practice')); }
  }, [taskId]);
  useEffect(() => { load(); }, [load]);

  // A new code exercise: make sure it actually works before showing it (rewritten if broken).
  const checking = useRef(false);
  useEffect(() => {
    if (phase !== 'checking' || !ex || checking.current) return;
    checking.current = true;
    (async () => {
      let current = ex;
      try {
        for (let round = 0; round < 4 && current.status === 'pending'; round += 1) {
          const v = await validate(current);
          if (v.setupError) { setPhase('broken'); setError(v.error); return; }
          const r = await api.post(`/practice/${current.id}/validate`, v.ok ? { ok: true, expected: v.expected } : { ok: false, error: v.error }, { timeout: 120000 });
          current = r.data.exercise;
          setData((d) => ({ ...d, exercise: current }));
        }
        setPhase(current.status === 'pending' ? 'broken' : 'ready');
      } catch (e) {
        setError(errorMessage(e, 'Could not prepare the exercise'));
        // The server gave up on this one (and removed it): start fresh next time.
        if ([404, 502].includes(e.response?.status)) setData((d) => ({ ...d, exercise: null }));
        setPhase('broken');
      } finally { checking.current = false; }
    })();
  }, [phase, ex]);

  const create = async (k) => {
    setNewOpen(false);
    setPhase('making');
    setError('');
    try {
      const r = await api.post('/practice', { task_id: Number(taskId), kind: k || undefined }, { timeout: 120000 });
      setData((d) => ({ ...d, exercise: r.data.exercise }));
      setPhase(r.data.exercise.status === 'pending' ? 'checking' : 'ready');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not make an exercise'));
      setPhase(ex ? 'ready' : 'empty');
    }
  };

  if (error && !data) return <Card><EmptyState icon="alert" title="Couldn’t open practice" description={error} action={<Button onClick={load}>Try again</Button>} /></Card>;
  if (!data) return <Card><SkeletonRows rows={5} /></Card>;

  const header = (
    <PageHeader back={task.roadmap_id ? `/roadmaps/${task.roadmap_id}` : true} eyebrow={`Practice · ${task.roadmap_title || 'Roadmap'}`} title={phase === 'ready' && ex ? ex.title : task.title}
      description={phase === 'ready' && ex ? `For the task “${task.title}”` : task.description || undefined}
      actions={phase === 'ready' && ex ? <>
        <Badge>{KIND_LABEL[ex.kind]}</Badge>
        <Button icon="refresh" onClick={() => { setKind(''); setNewOpen(true); }}>New exercise</Button>
      </> : null} />
  );

  return (
    <>
      {header}
      {phase === 'empty' && (
        <Card className="practice-start">
          <div className="practice-start-icon"><Icon name="target" size={22} /></div>
          <h2>Practice this task</h2>
          <p className="muted">Get a short exercise made for this task. Code exercises run safely in your browser and are checked automatically; for other subjects you’ll get a written or number question with feedback.</p>
          <div className="row row-wrap" style={{ gap: 10, justifyContent: 'center' }}>
            <div style={{ minWidth: 220 }}><KindSelect value={kind} onChange={setKind} /></div>
            <Button variant="primary" icon="sparkles" onClick={() => create(kind)}>Create exercise</Button>
          </div>
        </Card>
      )}
      {(phase === 'making' || phase === 'checking') && (
        <Card className="practice-start">
          <Spinner />
          <h2>{phase === 'making' ? 'Writing your exercise…' : 'Checking the exercise works…'}</h2>
          <p className="muted">{phase === 'making' ? 'The AI is writing instructions, starter code and checks. About 10 seconds.' : 'We run the model solution against every check first, so you never get a broken exercise.'}</p>
        </Card>
      )}
      {phase === 'broken' && (
        <Card><EmptyState icon="alert" title="This exercise isn’t ready" description={error || 'Something went wrong.'}
          action={<div className="row" style={{ gap: 8, justifyContent: 'center' }}><Button onClick={() => { setError(''); setPhase(ex?.status === 'pending' ? 'checking' : 'empty'); }}>Try again</Button><Button variant="primary" onClick={() => setNewOpen(true)}>Make a different one</Button></div>} /></Card>
      )}
      {phase === 'ready' && ex && (CODE.includes(ex.kind)
        ? <CodeExercise key={ex.id} ex={ex} task={task} onExercise={(e) => setData((d) => ({ ...d, exercise: e }))} onTaskDone={() => setData((d) => ({ ...d, task: { ...d.task, status: 'done' } }))} onNew={() => { setKind(''); setNewOpen(true); }} />
        : <AnswerExercise key={ex.id} ex={ex} task={task} onExercise={(e) => setData((d) => ({ ...d, exercise: e }))} onTaskDone={() => setData((d) => ({ ...d, task: { ...d.task, status: 'done' } }))} onNew={() => { setKind(''); setNewOpen(true); }} />)}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New exercise" description="A fresh exercise for the same task. Your current one stays saved."
        footer={<><Button onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="primary" icon="sparkles" onClick={() => create(kind)}>Create exercise</Button></>}>
        <Field label="Type"><KindSelect value={kind} onChange={setKind} /></Field>
      </Modal>
    </>
  );
}

/* ---------- Shared pieces ---------- */
function useTaskDone(task, onTaskDone) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const markDone = async () => {
    setBusy(true);
    try {
      await api.put(`/tasks/${task.id}`, { status: 'done', due_date: task.due_date ? String(task.due_date).slice(0, 10) : null });
      toast.success('Task marked done');
      onTaskDone();
    } catch (e) { toast.error(errorMessage(e, 'Could not update the task')); } finally { setBusy(false); }
  };
  return { busy, markDone };
}

function PassBanner({ task, xp, onTaskDone, onAnother }) {
  const navigate = useNavigate();
  const { busy, markDone } = useTaskDone(task, onTaskDone);
  return (
    <div className="practice-pass" role="status">
      <Icon name="checkCircle" size={20} />
      <div className="grow">
        <strong>All checks passed!</strong>{xp ? ` +${xp} XP` : ''}
        <div className="small muted">{task.status === 'done' ? 'This task is done.' : 'Nice work — mark the task done, or try another exercise.'}</div>
      </div>
      <div className="row row-wrap" style={{ gap: 6 }}>
        {task.status !== 'done' && <Button size="sm" variant="primary" icon="check" loading={busy} onClick={markDone}>Mark task done</Button>}
        <Button size="sm" onClick={onAnother}>Another exercise</Button>
        {task.roadmap_id && <Button size="sm" variant="ghost" onClick={() => navigate(`/roadmaps/${task.roadmap_id}`)}>Back to roadmap</Button>}
      </div>
    </div>
  );
}

function HintsCard({ ex, getContext, onExercise }) {
  const toast = useToast();
  const [extra, setExtra] = useState([]);
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState(null);
  const hints = [...(ex.hints || []), ...extra];
  const more = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/practice/${ex.id}/hint`, getContext(), { timeout: 60000 });
      if (ex.hints_left > 0) onExercise(r.data.exercise); else setExtra((h) => [...h, r.data.hint]);
    } catch (e) { toast.error(errorMessage(e, 'Could not get a hint')); } finally { setBusy(false); }
  };
  const showSolution = async () => {
    try { const r = await api.get(`/practice/${ex.id}/solution`, { noCache: true }); setSolution(r.data); }
    catch (e) { toast.error(errorMessage(e, 'Could not load the solution')); }
  };
  const left = Math.max(0, ex.solution_after - ex.attempts);
  return (
    <Card title="Stuck?" pad>
      <div className="stack-sm">
        {hints.length > 0 && <ol className="practice-hints">{hints.map((h, i) => <li key={i}>{h}</li>)}</ol>}
        <div className="row row-wrap" style={{ gap: 8 }}>
          <Button size="sm" icon="zap" loading={busy} onClick={more}>{hints.length ? 'Another hint' : 'Get a hint'}</Button>
          <Button size="sm" variant="ghost" icon="eye" disabled={!ex.solution_unlocked} onClick={showSolution}>Show solution</Button>
        </div>
        {!ex.solution_unlocked && <p className="tiny subtle" style={{ margin: 0 }}>The solution unlocks after {ex.solution_after} tries{ex.attempts ? ` — ${left} to go` : ''}. Hints never give the answer away.</p>}
      </div>
      <Modal open={!!solution} onClose={() => setSolution(null)} title="Model solution" size="lg"
        description={ex.kind === 'numeric' ? undefined : 'One good way to solve it — yours can be different and still be right.'}>
        {solution && (CODE.includes(ex.kind)
          ? <CodeEditor value={solution.solution} onChange={() => {}} language={ex.kind} readOnly label="Model solution" minRows={6} height="360px" />
          : <div className="stack-sm">
              {ex.kind === 'numeric' && <p><strong>Answer: {solution.answer}{solution.unit ? ` ${solution.unit}` : ''}</strong></p>}
              {ex.kind === 'written' && solution.rubric?.length > 0 && <><div className="small muted">A good answer covers:</div><ul>{solution.rubric.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
              <Prose text={solution.solution} />
            </div>)}
      </Modal>
    </Card>
  );
}

/* ---------- Code exercises ---------- */
function ResultTable({ table }) {
  if (!table) return null;
  if (!table.columns.length) return <div className="small muted">The query ran but returned no table.</div>;
  return (
    <div className="practice-table-wrap">
      <table className="practice-table">
        <thead><tr>{table.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{table.values.slice(0, 100).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <span className="subtle">NULL</span> : String(v)}</td>)}</tr>)}</tbody>
      </table>
      {table.values.length > 100 && <div className="tiny subtle">Showing the first 100 of {table.values.length} rows.</div>}
      {table.values.length === 0 && <div className="tiny subtle">0 rows</div>}
    </div>
  );
}

function CodeExercise({ ex, task, onExercise, onTaskDone, onNew }) {
  const toast = useToast();
  const [code, setCode] = useState(ex.code ?? ex.starter ?? '');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(null); // 'run' | 'test'
  const [loadingRuntime, setLoadingRuntime] = useState(false);
  const [xp, setXp] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [preview, setPreview] = useState(code);
  const saved = useRef(code);

  // Save the draft a moment after typing stops.
  useEffect(() => {
    if (code === saved.current) return undefined;
    const t = setTimeout(() => { api.put(`/practice/${ex.id}/code`, { code }).then(() => { saved.current = code; }).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [code, ex.id]);
  // Live preview for web pages.
  useEffect(() => {
    if (ex.kind !== 'html') return undefined;
    const t = setTimeout(() => setPreview(code), 400);
    return () => clearTimeout(t);
  }, [code, ex.kind]);
  // "Loading Python…" the first time.
  useEffect(() => {
    const sb = getSandbox();
    sb.onStatus = (k, s) => { if (k === ex.kind) setLoadingRuntime(s === 'loading'); };
    return () => { if (sb.onStatus) sb.onStatus = null; };
  }, [ex.kind]);

  const go = async (mode) => {
    if (running) return;
    setRunning(mode);
    if (RUNTIME[ex.kind] && !isLoaded(ex.kind)) setLoadingRuntime(true);
    try {
      const r = await check(ex, code, mode);
      setResult({ ...r, mode });
      if (mode === 'test' && !r.setupError) {
        const s = await api.post(`/practice/${ex.id}/submit`, { code, passed: r.passed, total: r.total });
        saved.current = code;
        onExercise(s.data.exercise);
        if (s.data.xp) { setXp(s.data.xp); toast.success(`All checks passed! +${s.data.xp} XP`); }
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Could not run your code'));
    } finally { setRunning(null); setLoadingRuntime(false); }
  };

  const failing = (result?.results || []).filter((x) => !x.passed).map((x) => ({ name: x.name, message: x.message }));
  const allPassed = result?.mode === 'test' && result.total > 0 && result.passed === result.total;
  const checks = useMemo(() => (ex.kind === 'sql'
    ? ['Query runs without errors', 'Returns the right columns', ex.ordered ? 'Returns the right rows, in the right order' : 'Returns the right rows']
    : (ex.tests || []).map((t) => t.name)), [ex]);
  const stateOf = (name) => result?.mode === 'test' ? result.results.find((x) => x.name === name) : null;

  return (
    <>
      {(allPassed || ex.status === 'passed') && <PassBanner task={task} xp={allPassed ? xp : 0} onTaskDone={onTaskDone} onAnother={onNew} />}
      <div className="practice-layout">
        <div className="stack">
          <Card title="Instructions"><Prose text={ex.instructions} /></Card>
          {ex.kind === 'sql' && ex.setup && (
            <Card title="Tables">
              <details><summary className="small">Show how the tables are created</summary><pre className="practice-setup">{ex.setup}</pre></details>
            </Card>
          )}
          <Card title={`Checks${result?.mode === 'test' ? ` — ${result.passed}/${result.total} passed` : ''}`} pad={false}>
            <ul className="practice-checks">
              {checks.map((name) => {
                const st = stateOf(name);
                return (
                  <li key={name} className={st ? (st.passed ? 'pass' : 'fail') : ''}>
                    <Icon name={st ? (st.passed ? 'checkCircle' : 'xCircle') : 'circle'} size={16} />
                    <div className="grow"><div>{name}</div>{st && !st.passed && st.message && <div className="tiny practice-fail-msg">{st.message}</div>}</div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <HintsCard ex={ex} onExercise={onExercise} getContext={() => ({ code, failing })} />
        </div>

        <div className="stack practice-work">
          <Card pad={false}>
            <div className="practice-toolbar">
              <Badge>{KIND_LABEL[ex.kind]}</Badge>
              <span className="grow" />
              <Button size="sm" variant="ghost" icon="refresh" onClick={() => setResetOpen(true)}>Reset</Button>
              {ex.kind !== 'html' && <Button size="sm" icon="play" loading={running === 'run'} disabled={!!running} onClick={() => go('run')} title="Run (Ctrl+Enter)">Run</Button>}
              <Button size="sm" variant="primary" icon="check" loading={running === 'test'} disabled={!!running} onClick={() => go('test')}>Check my code</Button>
            </div>
            <CodeEditor value={code} onChange={setCode} language={ex.kind} onRun={() => go(ex.kind === 'html' ? 'test' : 'run')} label={`${KIND_LABEL[ex.kind]} editor`} />
          </Card>

          {ex.kind === 'html' ? (
            <Card title="Preview" pad={false}>
              <iframe className="practice-preview" title="Your page" sandbox="allow-scripts" srcDoc={preview} />
            </Card>
          ) : (
            <Card title={ex.kind === 'sql' ? 'Result' : 'Output'} pad={false}>
              <div className="practice-output" aria-live="polite">
                {loadingRuntime && <div className="small muted row" style={{ gap: 8 }}><Spinner size={14} /> Loading {RUNTIME[ex.kind]} — the first time takes a few seconds…</div>}
                {!loadingRuntime && !result && <div className="small subtle">Press <strong>Run</strong> (Ctrl+Enter) to try your code, then <strong>Check my code</strong> to run the checks.</div>}
                {!loadingRuntime && result && (
                  <>
                    {result.error && <pre className="practice-error">{result.error}</pre>}
                    {ex.kind === 'sql' ? <ResultTable table={result.table} /> : (result.stdout ? <pre className="practice-stdout">{result.stdout}</pre> : !result.error && <div className="small subtle">{result.mode === 'test' ? 'Checks finished — see the list on the left.' : `Your code ran. Nothing was printed — add ${ex.kind === 'python' ? 'print(…)' : 'console.log(…)'} to see a value.`}</div>)}
                  </>
                )}
              </div>
            </Card>
          )}
          {ex.kind === 'html' && result?.error && <pre className="practice-error">{result.error}</pre>}
          <p className="tiny subtle" style={{ margin: 0 }}><Icon name="lock" size={11} /> Your code runs only in your browser, in a locked-down sandbox. It’s saved to your account as you type.</p>
        </div>
      </div>

      <ConfirmDialog open={resetOpen} title="Start over?" description="This puts the starter code back. Your current code will be replaced." confirmLabel="Reset code"
        onConfirm={() => { setCode(ex.starter || ''); setResult(null); setResetOpen(false); }} onCancel={() => setResetOpen(false)} />
    </>
  );
}

/* ---------- Written and number answers ---------- */
function AnswerExercise({ ex, task, onExercise, onTaskDone, onNew }) {
  const toast = useToast();
  const [answer, setAnswer] = useState(ex.kind === 'written' ? ex.code || '' : '');
  const [result, setResult] = useState(ex.last_result || null);
  const [busy, setBusy] = useState(false);
  const [xp, setXp] = useState(0);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/practice/${ex.id}/answer`, { answer }, { timeout: 60000 });
      setResult(r.data.result);
      onExercise(r.data.exercise);
      if (r.data.xp) { setXp(r.data.xp); toast.success(`Passed! +${r.data.xp} XP`); }
    } catch (err) { toast.error(errorMessage(err, 'Could not check your answer')); } finally { setBusy(false); }
  };
  return (
    <>
      {(ex.status === 'passed') && <PassBanner task={task} xp={xp} onTaskDone={onTaskDone} onAnother={onNew} />}
      <div className="practice-layout">
        <div className="stack">
          <Card title="Question"><Prose text={ex.instructions} /></Card>
          <HintsCard ex={ex} onExercise={onExercise} getContext={() => ({ code: answer })} />
        </div>
        <div className="stack">
          <Card title="Your answer">
            <form onSubmit={submit} className="stack-sm">
              {ex.kind === 'numeric' ? (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <Input inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="e.g. 42.5" aria-label="Your answer" style={{ maxWidth: 220 }} />
                  {ex.unit && <span className="muted">{ex.unit}</span>}
                </div>
              ) : (
                <Textarea rows={8} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer in a few sentences…" aria-label="Your answer" />
              )}
              <div><Button type="submit" variant="primary" icon="check" loading={busy} disabled={!answer.trim()}>Check my answer</Button></div>
            </form>
          </Card>
          {result && (
            <Card title={ex.kind === 'written' ? `Feedback — ${result.score}/100` : 'Result'}>
              <div className="stack-sm">
                <div className={`practice-verdict ${result.passed ? 'pass' : 'fail'}`}><Icon name={result.passed ? 'checkCircle' : 'xCircle'} size={16} /> {result.feedback}</div>
                {result.covered?.length > 0 && <div><div className="small muted">You covered</div><ul>{result.covered.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
                {result.missing?.length > 0 && <div><div className="small muted">To make it stronger, add</div><ul>{result.missing.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
