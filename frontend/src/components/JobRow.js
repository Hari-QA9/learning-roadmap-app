import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Icon, timeAgo } from './ui';

export const SOURCE_LABEL = {
  remotive: 'Remotive', arbeitnow: 'Arbeitnow', themuse: 'The Muse', greenhouse: 'Greenhouse', lever: 'Lever', custom: 'Added by you',
};

export const STATUS = {
  saved: { label: 'Saved', tone: undefined },
  applied: { label: 'Applied', tone: 'accent' },
  interviewing: { label: 'Interviewing', tone: 'warning' },
  offer: { label: 'Offer', tone: 'success' },
  rejected: { label: 'Closed', tone: 'danger' },
};

export function matchTone(score) {
  if (score == null) return undefined;
  if (score >= 70) return 'success';
  if (score >= 45) return 'accent';
  return 'warning';
}

export function MatchPill({ score }) {
  if (score == null) return null;
  return <span className={`match-pill ${matchTone(score) || ''}`} title="How well your skills match this job">{score}%<span> match</span></span>;
}

/** One job in a list. */
export default function JobRow({ job }) {
  const navigate = useNavigate();
  const missing = (job.missing || []).slice(0, 3);
  return (
    <div className="list-row clickable job-row" onClick={() => navigate(`/jobs/${job.id}`)}>
      <div className="job-logo" aria-hidden>{(job.company || job.title || '?').trim().charAt(0).toUpperCase()}</div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="job-title truncate">{job.title}</div>
            <div className="tiny subtle truncate">
              {[job.company, job.location, job.remote && !/remote/i.test(job.location || '') ? 'Remote' : null].filter(Boolean).join(' · ')}
            </div>
          </div>
          <MatchPill score={job.match} />
        </div>
        <div className="row row-wrap mt-1" style={{ gap: 6 }}>
          {job.status && <Badge tone={STATUS[job.status]?.tone} dot>{STATUS[job.status]?.label}</Badge>}
          {(job.have || []).slice(0, 3).map((s) => <span key={`h-${s}`} className="skill have"><Icon name="check" size={11} />{s}</span>)}
          {missing.map((s) => <span key={`m-${s}`} className="skill gap">{s}</span>)}
          {job.posted_at && <span className="tiny subtle">{timeAgo(job.posted_at)}</span>}
        </div>
      </div>
      <Icon name="chevronRight" size={16} style={{ color: 'var(--text-3)', flex: 'none' }} />
    </div>
  );
}
