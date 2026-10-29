import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from './api';

// A Pomodoro-style focus timer that keeps running while you move around the app
// (and survives a page reload). Finished focus sessions are logged automatically.

const KEY = 'learnmap.focus';
const FocusCtx = createContext(null);
const idle = { status: 'idle', mode: 'focus', minutes: 25, breakMinutes: 5, endAt: null, remainingMs: null, startedAt: null, roadmap_id: null, task_id: null, label: '' };

const load = () => { try { return { ...idle, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return idle; } };
const persist = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

export function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch { /* sound is optional */ }
}

function notifyDone(title, body) {
  beep();
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: '/logo192.png' });
  } catch {}
}

export const fmtClock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function FocusProvider({ children }) {
  const [s, setS] = useState(load);
  const [now, setNow] = useState(Date.now());
  const [lastLogged, setLastLogged] = useState(null);
  const logging = useRef(false);

  const update = useCallback((patch) => setS((prev) => { const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }; persist(next); return next; }), []);

  const log = useCallback(async (minutes, meta) => {
    if (minutes < 1 || logging.current) return;
    logging.current = true;
    try {
      await api.post('/learning/focus/sessions', { minutes, roadmap_id: meta.roadmap_id, task_id: meta.task_id, label: meta.label });
      setLastLogged({ minutes, at: Date.now() });
    } catch { /* offline — the session just isn't counted */ } finally { logging.current = false; }
  }, []);

  // Tick once a second while running.
  useEffect(() => {
    if (s.status !== 'running') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s.status]);

  const remaining = s.status === 'running' ? Math.max(0, (s.endAt || 0) - now) : s.status === 'paused' ? s.remainingMs || 0 : (s.mode === 'break' ? s.breakMinutes : s.minutes) * 60000;

  // Finished?
  useEffect(() => {
    if (s.status !== 'running' || remaining > 0) return;
    if (s.mode === 'focus') {
      log(s.minutes, s);
      notifyDone('Focus session done', `${s.minutes} minutes logged. Take a ${s.breakMinutes}-minute break.`);
      update({ status: 'ready-break', mode: 'break', endAt: null, remainingMs: null });
    } else {
      notifyDone('Break over', 'Ready for another focus session?');
      update({ status: 'idle', mode: 'focus', endAt: null, remainingMs: null });
    }
  }, [remaining, s, log, update]);

  // Show the countdown in the browser tab.
  useEffect(() => {
    if (s.status !== 'running') return undefined;
    document.title = `${fmtClock(remaining)} ${s.mode === 'break' ? 'Break' : 'Focus'} · Learnvoy`;
    return () => { if (/^\d\d:\d\d /.test(document.title)) document.title = 'Learnvoy'; };
  }, [remaining, s.status, s.mode]);

  const api_ = useMemo(() => ({
    ...s,
    remaining,
    lastLogged,
    total: (s.mode === 'break' ? s.breakMinutes : s.minutes) * 60000,
    start({ minutes = s.minutes, breakMinutes = s.breakMinutes, roadmap_id = null, task_id = null, label = '' } = {}) {
      try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch {}
      setNow(Date.now());
      update({ status: 'running', mode: 'focus', minutes, breakMinutes, endAt: Date.now() + minutes * 60000, remainingMs: null, startedAt: Date.now(), roadmap_id, task_id, label });
    },
    setPlan(patch) { if (s.status === 'idle') update(patch); },
    pause() { if (s.status === 'running') update({ status: 'paused', remainingMs: Math.max(0, s.endAt - Date.now()), endAt: null }); },
    resume() { if (s.status === 'paused') { setNow(Date.now()); update({ status: 'running', endAt: Date.now() + (s.remainingMs || 0), remainingMs: null }); } },
    /** Stop early. Logs the minutes already done (focus only). */
    stop() {
      if (s.mode === 'focus' && (s.status === 'running' || s.status === 'paused')) {
        const done = Math.floor((s.minutes * 60000 - remaining) / 60000);
        log(done, s);
      }
      update({ ...idle, minutes: s.minutes, breakMinutes: s.breakMinutes });
    },
    startBreak() { setNow(Date.now()); update({ status: 'running', mode: 'break', endAt: Date.now() + s.breakMinutes * 60000 }); },
    skipBreak() { update({ ...idle, minutes: s.minutes, breakMinutes: s.breakMinutes, roadmap_id: s.roadmap_id, task_id: s.task_id, label: s.label }); },
  }), [s, remaining, lastLogged, update, log]);

  return React.createElement(FocusCtx.Provider, { value: api_ }, children);
}

export function useFocus() {
  return useContext(FocusCtx) || { status: 'idle', start() {}, remaining: 0 };
}
