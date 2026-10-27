import React from 'react';
import { Field, Input, Select, Segmented, Textarea } from '../ui';

/** Pick a job from the board / your list, or paste any job description. value = { mode, job_id, role, company, description } */
export default function JobPicker({ value, onChange, groups, jobs }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="stack-sm">
      <Segmented value={value.mode} onChange={(mode) => set({ mode })} options={[{ value: 'job', label: 'From my jobs' }, { value: 'paste', label: 'Paste a job' }]} />
      {value.mode === 'job' ? (
        jobs && jobs.length === 0 ? <p className="small muted">No saved jobs yet — choose “Paste a job”, or save jobs from the Job board.</p> : (
          <Field label="Job">
            <Select value={value.job_id} onChange={(e) => set({ job_id: e.target.value })} aria-label="Job">
              <option value="">{jobs ? 'Choose a job…' : 'Loading…'}</option>
              {Object.entries(groups || {}).map(([g, list]) => <optgroup key={g} label={g}>{list.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}</optgroup>)}
              {value.job_id && jobs && !jobs.some((j) => String(j.id) === String(value.job_id)) && <option value={value.job_id}>Selected job</option>}
            </Select>
          </Field>
        )
      ) : (
        <>
          <div className="grid-2">
            <Field label="Role"><Input value={value.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Research Associate" /></Field>
            <Field label="Company" optional><Input value={value.company} onChange={(e) => set({ company: e.target.value })} /></Field>
          </div>
          <Field label="Job description" optional hint="Paste it from LinkedIn, Indeed or the company site for the best results.">
            <Textarea rows={5} value={value.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </>
      )}
    </div>
  );
}

export const jobPayload = (v) => (v.mode === 'job' ? { job_id: Number(v.job_id) } : { role: v.role.trim(), company: v.company.trim(), description: v.description });
export const jobReady = (v) => (v.mode === 'job' ? !!v.job_id : !!v.role.trim());
