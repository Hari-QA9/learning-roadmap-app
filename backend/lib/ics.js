// Builds iCalendar (.ics) files that Google Calendar, Outlook and Apple Calendar understand.
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const pad = (n) => String(n).padStart(2, '0');
const utc = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dateOnly = (ymd) => String(ymd).slice(0, 10).replace(/-/g, '');
const nextDay = (ymd) => { const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ''); };

/** Lines longer than 75 bytes must be folded (RFC 5545). */
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

/**
 * events: [{ uid, title, description, url, location, rrule, alarmMinutes,
 *            allDay: 'YYYY-MM-DD' | start: Date, end: Date | local: { start: 'YYYYMMDDTHHMMSS', end, tz } }]
 */
function buildICS(events, name = 'LearnMap') {
  const now = utc(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LearnMap//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${now}`);
    if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.allDay)}`, `DTEND;VALUE=DATE:${nextDay(e.allDay)}`);
    else if (e.local) {
      // Wall-clock time in the member's time zone ("7pm every Monday" stays 7pm after daylight saving changes).
      const tz = e.local.tz ? `;TZID=${e.local.tz}` : '';
      lines.push(`DTSTART${tz}:${e.local.start}`, `DTEND${tz}:${e.local.end}`);
    } else lines.push(`DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end || new Date(e.start.getTime() + 3600000))}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.description || e.url) lines.push(`DESCRIPTION:${esc([e.description, e.url].filter(Boolean).join('\n\n'))}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.rrule) lines.push(`RRULE:${e.rrule}`);
    if (e.alarmMinutes) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:-PT${e.alarmMinutes}M`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

module.exports = { buildICS };
