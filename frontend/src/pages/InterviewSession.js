import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import { PageHeader, Button, Card, Textarea, Badge, Icon, Ring, Loading, EmptyState, Progress } from '../components/ui';

const Speech = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const STARS = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

/** Answer by speaking (browser speech-to-text), where supported. */
function useDictation(onText) {
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const toggle = () => {
    if (!Speech) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new Speech();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) onText(text.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  };
  useEffect(() => () => rec.current?.stop(), []);
  return { supported: !!Speech, listening, toggle };
}

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const dictation = useDictation((t) => setDraft((d) => (d ? `${d} ${t}` : t)));

  useEffect(() => {
    api.get(`/interviews/${id}`, { noCache: true }).then((r) => {
      setS(r.data);
      const first = r.data.questions.findIndex((_, i) => !r.data.feedback[i]);
      setIndex(first === -1 ? r.data.questions.length - 1 : first);
    }).catch((e) => setError(errorMessage(e, 'Could not load this interview')));
  }, [id]);

  useEffect(() => { setDraft(s?.answers?.[index] || ''); setShowTip(false); }, [index, s?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <EmptyState icon="message" title="Interview not available" description={error} action={<Button onClick={() => navigate('/interview')}>Back</Button>} />;
  if (!s) return <Loading label="Loading your interview…" />;

  const total = s.questions.length;
  const answered = s.feedback.filter(Boolean).length;
  const q = s.questions[index];
  const fb = s.feedback[index];

  const submit = async () => {
    if (dictation.listening) dictation.toggle();
    setBusy(true);
    try {
      const r = await api.post(`/interviews/${s.id}/answer`, { index, answer: draft });
      setS((x) => { const answers = [...x.answers]; const feedback = [...x.feedback]; answers[index] = draft; feedback[index] = r.data.feedback; return { ...x, answers, feedback }; });
    } catch (e) {
      toast.error(errorMessage(e, 'Could not review your answer'));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      const r = await api.post(`/interviews/${s.id}/finish`);
      setS((x) => ({ ...x, report: r.data.report }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error(errorMessage(e, 'Could not write your report'));
    } finally {
      setFinishing(false);
    }
  };

  if (s.report) {
    const r = s.report;
    return (
      <>
        <PageHeader back="/interview" eyebrow="Mock interview · report" title={`${s.role}${s.company ? ` · ${s.company}` : ''}`} description={`${r.answered} of ${r.total} questions answered`}
          actions={<Button icon="refresh" onClick={() => navigate(`/interview${s.job_id ? `?job=${s.job_id}` : ''}`)}>Practice again</Button>} />
        <div className="split">
          <div className="stack-lg">
            <Card>
              <div className="row" style={{ gap: 20, alignItems: 'center' }}>
                <Ring value={r.score} size={96} tone={r.score >= 75 ? 'success' : r.score >= 55 ? 'accent' : 'warning'} />
                <p style={{ color: 'var(--text)' }}>{r.summary}</p>
              </div>
            </Card>
            {s.questions.map((qq, i) => s.feedback[i] && (
              <Card key={i} title={`Q${i + 1}. ${qq.question}`} description={`${STARS(s.feedback[i].score)} · ${s.feedback[i].verdict}`}>
                <div className="section-label" style={{ marginTop: 0 }}>Your answer</div>
                <p className="small" style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{s.answers[i]}</p>
                {s.feedback[i].better_answer && (<><div className="section-label">A stronger version</div><p className="small" style={{ color: 'var(--text)' }}>{s.feedback[i].better_answer}</p></>)}
              </Card>
            ))}
          </div>
          <div className="stack-lg">
            {r.top_strengths?.length > 0 && <Card title="Your strengths"><ul className="check-list">{r.top_strengths.map((x, i) => <li key={i}><Icon name="checkCircle" size={14} className="text-success" />{x}</li>)}</ul></Card>}
            {r.focus_areas?.length > 0 && <Card title="Practice these"><ul className="check-list">{r.focus_areas.map((x, i) => <li key={i}><Icon name="target" size={14} className="text-warning" />{x}</li>)}</ul></Card>}
            {r.next_steps?.length > 0 && <Card title="Before the real interview"><ul className="check-list">{r.next_steps.map((x, i) => <li key={i}><Icon name="arrowRight" size={14} />{x}</li>)}</ul></Card>}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader back="/interview" eyebrow="Mock interview" title={`${s.role}${s.company ? ` · ${s.company}` : ''}`} description={`Question ${index + 1} of ${total} · ${answered} answered`}
        actions={answered > 0 && <Button variant="primary" icon="check" loading={finishing} onClick={finish}>Finish & get report</Button>} />
      <div className="mb-3"><Progress value={(answered / total) * 100} size="sm" label="Interview progress" /></div>
      <div className="interview-steps mb-3">
        {s.questions.map((_, i) => (
          <button key={i} type="button" className={`iv-step ${i === index ? 'active' : ''} ${s.feedback[i] ? 'done' : ''}`} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}`}>{s.feedback[i] ? <Icon name="check" size={12} /> : i + 1}</button>
        ))}
      </div>

      <Card className="interview-q">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <Badge>{q.kind}</Badge>
          {q.tip && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTip(!showTip)}><Icon name="info" size={14} /> {showTip ? 'Hide hint' : 'Hint'}</button>}
        </div>
        <h2 className="iv-question">{q.question}</h2>
        {showTip && <div className="callout small fade-in"><strong>What they look for:</strong> {q.looking_for}<br /><strong>Tip:</strong> {q.tip}</div>}

        <div className="mt-3">
          <Textarea rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Answer as you would in the interview. For “tell me about a time…” questions: the situation, what you did, and the result." disabled={busy} aria-label="Your answer" />
          <div className="row-between mt-2 row-wrap" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              {dictation.supported && (
                <Button icon={dictation.listening ? 'x' : 'message'} onClick={dictation.toggle} variant={dictation.listening ? 'primary' : 'secondary'}>
                  {dictation.listening ? 'Stop speaking' : 'Answer by speaking'}
                </Button>
              )}
              <span className="tiny subtle">{draft.trim() ? `${draft.trim().split(/\s+/).length} words` : ''}</span>
            </div>
            <Button variant="primary" icon="send" loading={busy} disabled={draft.trim().length < 15} onClick={submit}>{fb ? 'Get new feedback' : 'Submit answer'}</Button>
          </div>
        </div>
      </Card>

      {fb && (
        <Card className="mt-3 fade-in" title={<span className="row" style={{ gap: 10 }}><span className="stars" aria-label={`${fb.score} out of 5`}>{STARS(fb.score)}</span>{fb.verdict}</span>}
          actions={index < total - 1 ? <Button variant="primary" iconRight="arrowRight" onClick={() => setIndex(index + 1)}>Next question</Button> : <Button variant="primary" icon="check" loading={finishing} onClick={finish}>Finish & get report</Button>}>
          <div className="grid-2">
            {fb.strengths?.length > 0 && <div><div className="section-label" style={{ marginTop: 0 }}>What worked</div><ul className="check-list">{fb.strengths.map((x, i) => <li key={i}><Icon name="checkCircle" size={14} className="text-success" />{x}</li>)}</ul></div>}
            {fb.improve?.length > 0 && <div><div className="section-label" style={{ marginTop: 0 }}>Make it stronger</div><ul className="check-list">{fb.improve.map((x, i) => <li key={i}><Icon name="arrowRight" size={14} />{x}</li>)}</ul></div>}
          </div>
          {fb.better_answer && (<><div className="section-label">A stronger version of your answer</div><div className="callout small" style={{ color: 'var(--text)' }}>{fb.better_answer}</div></>)}
        </Card>
      )}
    </>
  );
}
