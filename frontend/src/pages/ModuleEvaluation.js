import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import QuizRunner from '../components/QuizRunner';
import { PageHeader, Button, Card, EmptyState, Loading, Alert } from '../components/ui';

function ModuleEvaluation() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [mod, setMod] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const generate = useCallback(async (m) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.post('/evaluation/module-quiz', {
        moduleTitle: m.title,
        tasks: (m.tasks || []).map((t) => t.title),
      });
      const qs = (r.data.questions || []).filter((q) => q.question && Array.isArray(q.options));
      if (!qs.length) throw new Error('empty');
      setQuestions(qs);
    } catch (e) {
      setError(e.message === 'empty' ? 'The AI returned no questions. Please try again.' : errorMessage(e, 'Could not generate the assessment.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get(`/modules/item/${moduleId}`)
      .then((r) => { setMod(r.data); generate(r.data); })
      .catch((e) => { setError(errorMessage(e, 'Module not found')); setLoading(false); });
  }, [moduleId, generate]);

  const submit = async (answers, score) => {
    setSubmitting(true);
    try {
      const r = await api.post('/evaluation/module-result', {
        module_id: Number(moduleId), roadmap_id: mod.roadmap_id, score, total: questions.length,
      });
      setResult({ ...r.data, answers });
      if (r.data.passed) toast.success('Module passed — the next module is unlocked');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save your result'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        back={mod ? `/roadmaps/${mod.roadmap_id}` : true}
        eyebrow={mod ? `${mod.roadmap_title} · Module assessment` : 'Module assessment'}
        title={mod?.title || 'Assessment'}
        description="5 questions generated from this module’s tasks. Score 70% or more to pass and unlock the next module."
      />

      {loading ? (
        <Card><Loading label="Generating questions…" /></Card>
      ) : error ? (
        <Card>
          <EmptyState icon="alert" title="Couldn’t start the assessment" description={error}
            action={<div className="row" style={{ justifyContent: 'center' }}>
              {mod && <Button variant="primary" icon="refresh" onClick={() => generate(mod)}>Try again</Button>}
              <Button onClick={() => navigate(-1)}>Go back</Button>
            </div>}
          />
        </Card>
      ) : result ? (
        <QuizRunner
          questions={questions}
          review
          reviewAnswers={result.answers}
          resultSlot={
            <div className="row row-wrap">
              {result.passed ? (
                <Button variant="primary" iconRight="arrowRight" onClick={() => navigate(`/roadmaps/${mod.roadmap_id}`)}>Continue roadmap</Button>
              ) : (
                <>
                  <Button variant="primary" icon="refresh" onClick={() => generate(mod)}>Retake with new questions</Button>
                  <Button onClick={() => navigate(`/roadmaps/${mod.roadmap_id}`)}>Back to roadmap</Button>
                </>
              )}
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-2"><Alert tone="info">Tip: use keys 1–4 to pick an answer and ← → to move between questions.</Alert></div>
          <QuizRunner questions={questions} onSubmit={submit} submitting={submitting} />
        </>
      )}
    </div>
  );
}

export default ModuleEvaluation;
