// The member's weekly study schedule: which days (0=Sun … 6=Sat), what time (their local
// time zone) and for how long. Used by the calendar page, the calendar feed, auto-planning
// and the "time to study" reminder.
const addDays = (ymd, n) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseSchedule(s = {}) {
  const days = [...new Set(String(s.study_days || '').split(',').map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6))].sort();
  const time = TIME.test(String(s.study_time || '')) ? s.study_time : null;
  const minutes = Math.min(480, Math.max(15, parseInt(s.study_minutes, 10) || 60));
  return { days, time, minutes, remind: s.study_remind === undefined || s.study_remind === null ? true : !!Number(s.study_remind), active: days.length > 0 && !!time };
}

/** Validates what the app sends; returns the settings patch or an error message. */
function validateSchedule(body = {}) {
  const days = Array.isArray(body.days) ? body.days.map((d) => parseInt(d, 10)) : [];
  if (days.some((d) => !(d >= 0 && d <= 6))) return { error: 'Pick days of the week.' };
  if (body.time && !TIME.test(String(body.time))) return { error: 'Use a time like 19:00.' };
  if (days.length && !body.time) return { error: 'Pick a time for your study sessions.' };
  const minutes = parseInt(body.minutes, 10);
  if (body.minutes !== undefined && !(minutes >= 15 && minutes <= 480)) return { error: 'Sessions are 15 minutes to 8 hours.' };
  return {
    patch: {
      study_days: [...new Set(days)].sort().join(',') || null,
      study_time: days.length ? String(body.time) : null,
      study_minutes: minutes || 60,
      study_remind: body.remind === false ? 0 : 1,
    },
  };
}

const weekdayOf = (ymd) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

/** The first date on or after `fromYmd` that is a study day (or `fromYmd` when every day counts). */
function nextStudyDay(fromYmd, days) {
  if (!days.length) return fromYmd;
  for (let i = 0; i < 7; i++) { const d = addDays(fromYmd, i); if (days.includes(weekdayOf(d))) return d; }
  return fromYmd;
}

/** 'YYYYMMDDTHHMMSS' wall-clock strings for a session starting at `time` on `ymd`. */
function localRange(ymd, time, minutes) {
  const start = new Date(`${ymd}T${time}:00Z`);
  const end = new Date(start.getTime() + minutes * 60000);
  const f = (d) => d.toISOString().slice(0, 19).replace(/[-:]/g, '');
  return { start: f(start), end: f(end) };
}

module.exports = { BYDAY, parseSchedule, validateSchedule, nextStudyDay, localRange, weekdayOf };
