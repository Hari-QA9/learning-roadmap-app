import { useEffect, useState } from 'react';
import api from './api';

/** Jobs to choose from in career tools: your saved/applied jobs first, then recommendations. */
export default function useJobOptions() {
  const [jobs, setJobs] = useState(null);
  useEffect(() => {
    Promise.allSettled([api.get('/applications'), api.get('/jobs/recommended', { params: { limit: 8 } })]).then(([a, r]) => {
      const list = [];
      const seen = new Set();
      if (a.status === 'fulfilled') (a.value.data || []).filter((x) => x.job_id).forEach((x) => { if (!seen.has(x.job_id)) { seen.add(x.job_id); list.push({ id: x.job_id, label: `${x.job_title}${x.company ? ` — ${x.company}` : ''}`, group: 'Your saved & applied jobs' }); } });
      if (r.status === 'fulfilled') (r.value.data.jobs || []).forEach((x) => { if (!seen.has(x.id)) { seen.add(x.id); list.push({ id: x.id, label: `${x.title}${x.company ? ` — ${x.company}` : ''}`, group: 'Recommended for you' }); } });
      setJobs(list);
    });
  }, []);
  const groups = (jobs || []).reduce((m, j) => ({ ...m, [j.group]: [...(m[j.group] || []), j] }), {});
  return { jobs, groups };
}
