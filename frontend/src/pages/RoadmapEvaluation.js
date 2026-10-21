import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useToast } from '../components/Toast';
import QuizRunner from '../components/QuizRunner';
import { PageHeader, Button, Card, EmptyState, Loading, Alert } from '../components/ui';

function RoadmapEvaluation() {
  const { roadmapId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [roadmap, setRoadmap] = useState(null);
  const [modules, setModules] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const generate = useCallback(async (rm, mods) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.post('/evaluation/roadmap-quiz', { roadmapTitle: rm.title, modules: mods.map((m) => m.title) });
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
    Promise.all([api.get(`/roadmaps/${roadmapId}`), api.get(`/modules/${roadmapId}`)])
      .then(([r, m]) => { setRoadmap(r.data); setModules(m.data || []); generate(r.data, m.data || []); })
      .catch((e) => { setError(errorMessage(e, 'Roadmap not found')); setLoading(false); });
  }, [roadmapId, generate]);

  const submit = async (answers, score) => {
    setSubmitting(true);
    try {
      const r = await api.post('/evaluation/roadmap-result', {
        roadmap_id: Number(roadmapId), roadmap_title: roadmap.title, score, total: questions.length,
      });
      setResult({ ...r.data, answers });
      if (r.data.passed) toast.success('Congratulations — your certificate is ready');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save your result'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        back={`/roadmaps/${roadmapId}`}
        eyebrow="Final assessment"
        title={roadmap?.title || 'Final assessment'}
        description={`10 questions across ${modules.length || 'all'} modules. Score 70% or more to earn your certificate.`}
      />

      {loading ? (
        <Card><Loading label="Generating your final assessment…" /></Card>
      ) : error ? (
        <Card>
          <EmptyState icon="alert" title="Couldn’t start the assessment" description={error}
            action={<div className="row" style={{ justifyContent: 'center' }}>
              {roadmap && <Button variant="primary" icon="refresh" onClick={() => generate(roadmap, modules)}>Try again</Button>}
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
                <Button variant="primary" icon="award" onClick={() => navigate(`/certificate/${roadmapId}`)}>View certificate</Button>
              ) : (
                <Button variant="primary" icon="refresh" onClick={() => generate(roadmap, modules)}>Retake with new questions</Button>
              )}
              <Button onClick={() => navigate(`/roadmaps/${roadmapId}`)}>Back to roadmap</Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-2"><Alert tone="info">Take your time — you can move back and forth before submitting.</Alert></div>
          <QuizRunner questions={questions} onSubmit={submit} submitting={submitting} />
        </>
      )}
    </div>
  );
}

export default RoadmapEvaluation;
