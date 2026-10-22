// "Add to calendar" helpers: Google Calendar links and downloadable .ics files (Outlook, Apple Calendar…).
const pad = (n) => String(n).padStart(2, '0');
const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => { const out = []; let rest = line; while (rest.length > 73) { out.push(rest.slice(0, 73)); rest = ` ${rest.slice(73)}`; } out.push(rest); return out.join('\r\n'); };
const DAYS = { sunday: 'SU', monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH', friday: 'FR', saturday: 'SA' };

/** event: { title, details, location, start: Date, end: Date } */
export function googleCalendarUrl(e) {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${utc(e.start)}/${utc(e.end || new Date(e.start.getTime() + 3600000))}` });
  if (e.details) p.set('details', e.details);
  if (e.location) p.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** events: [{ uid, title, details, location, start, end, rrule, alarmMinutes }] */
export function buildICS(events, name = 'LearnMap') {
  const now = utc(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LearnMap//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(name)}`];
  events.forEach((e, i) => {
    lines.push('BEGIN:VEVENT', `UID:${e.uid || `${Date.now()}-${i}@learnmap`}`, `DTSTAMP:${now}`, `DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end || new Date(e.start.getTime() + 3600000))}`, `SUMMARY:${esc(e.title)}`);
    if (e.details) lines.push(`DESCRIPTION:${esc(e.details)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.rrule) lines.push(`RRULE:${e.rrule}`);
    if (e.alarmMinutes) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:-PT${e.alarmMinutes}M`, 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function downloadICS(filename, events, name) {
  const blob = new Blob([buildICS(events, name)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Weekly study sessions from a study plan: each schedule day repeats weekly for `weeks` weeks at `time` (HH:MM).
 */
export function studyPlanEvents(plan, { time = '19:00', weeks = 8, hours = 2 }) {
  const [hh, mm] = time.split(':').map(Number);
  const today = new Date();
  return (plan.weeklySchedule || []).map((d, i) => {
    const code = DAYS[String(d.day || '').toLowerCase()];
    if (!code) return null;
    const target = Object.keys(DAYS).indexOf(String(d.day).toLowerCase());
    const start = new Date(today);
    start.setHours(hh, mm, 0, 0);
    const diff = (target - start.getDay() + 7) % 7 || (start < today ? 7 : 0);
    start.setDate(start.getDate() + diff);
    const end = new Date(start.getTime() + Math.max(0.5, Number(hours) || 2) * 3600000);
    return {
      uid: `study-${i}-${start.getTime()}@learnmap`, start, end,
      title: `Study: ${d.topic}`,
      details: [`${plan.title || 'Study plan'}`, ...(d.tasks || []).map((t) => `• ${t}`)].join('\n'),
      rrule: `FREQ=WEEKLY;COUNT=${Math.max(1, Math.min(52, Number(weeks) || 8))}`,
      alarmMinutes: 15,
    };
  }).filter(Boolean);
}
