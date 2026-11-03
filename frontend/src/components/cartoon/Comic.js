import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CAST } from './Characters';
import { Button, Icon } from '../ui';

const SPEECH_LANG = { en: 'en-US', es: 'es-ES', hi: 'hi-IN', te: 'te-IN', fr: 'fr-FR', zh: 'zh-CN' };
// Each character keeps the same voice feel, so you can tell them apart by ear.
const VOICE = { vo: { pitch: 0.95, rate: 0.98 }, pip: { pitch: 1.45, rate: 1.05 } };

/** One comic panel: a scene, its props, the characters and their speech bubbles. */
export function Panel({ panel, index, activeLine = -1, playing = false, big = false }) {
  const cast = ['vo', 'pip']; // both are always in the scene — one talks, the other listens
  const moodOf = (who) => {
    const own = panel.lines.filter((l) => l.who === who);
    const current = activeLine >= 0 ? panel.lines[activeLine] : null;
    if (current && current.who === who) return current.mood;
    if (!own.length) return 'happy'; // listening
    return own[own.length - 1].mood || 'happy';
  };
  return (
    <figure className={`comic-panel scene-${panel.scene}`} aria-label={`Panel ${index + 1}`}>
      {panel.caption && <figcaption className="comic-caption">{panel.caption}</figcaption>}
      <div className="comic-bubbles">
        {panel.lines.map((l, i) => (
          <div key={i} className={`bubble from-${l.who} ${activeLine === i ? 'active' : ''} ${playing && activeLine >= 0 && i > activeLine ? 'later' : ''}`}>
            <span className="bubble-name">{CAST[l.who].name}</span>
            {l.text}
          </div>
        ))}
      </div>
      <div className="comic-stage" aria-hidden="true">
        {panel.props.length > 0 && <div className="comic-props">{panel.props.map((p, i) => <span key={i}>{p}</span>)}</div>}
        {cast.map((who) => {
          const C = CAST[who].Component;
          const talking = playing && activeLine >= 0 && panel.lines[activeLine]?.who === who;
          return <div key={who} className={`comic-actor actor-${who}`}><C mood={moodOf(who)} talking={talking} size={who === 'vo' ? (big ? 140 : 96) : (big ? 108 : 76)} /></div>;
        })}
      </div>
    </figure>
  );
}

/** The whole strip, one panel after another (read at your own pace). */
export function ComicStrip({ comic }) {
  return (
    <div className="comic-strip">
      {comic.panels.map((p, i) => <Panel key={i} panel={p} index={i} />)}
    </div>
  );
}

/**
 * "Watch" mode: panels play one at a time, characters bounce while they talk, and the
 * device reads the lines aloud (browser speech — free, works offline on most devices).
 */
export function ComicPlayer({ comic, lang = 'en', onFinish }) {
  const [panel, setPanel] = useState(0);
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const timer = useRef(null);
  const token = useRef(0); // cancels callbacks from an older play
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopAll = useCallback(() => {
    token.current++;
    clearTimeout(timer.current);
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);
  useEffect(() => stopAll, [stopAll]);

  const say = useCallback((who, text, done) => {
    const my = token.current;
    const next = () => { if (token.current === my) done(); };
    if (!sound || !canSpeak) { timer.current = setTimeout(next, Math.max(1600, text.length * 55)); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang] || 'en-US';
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()));
    if (voice) u.voice = voice;
    u.pitch = VOICE[who]?.pitch || 1; u.rate = VOICE[who]?.rate || 1;
    u.onend = next; u.onerror = next;
    // Some browsers never fire onend — move on anyway after a generous delay.
    timer.current = setTimeout(next, Math.max(4000, text.length * 120));
    window.speechSynthesis.speak(u);
  }, [sound, canSpeak, lang]);

  const playFrom = useCallback((p, l) => {
    stopAll();
    const my = token.current;
    const step = (pi, li) => {
      if (token.current !== my) return;
      const pan = comic.panels[pi];
      if (!pan) { setPlaying(false); setLine(-1); onFinish?.(); return; }
      if (li >= pan.lines.length) { timer.current = setTimeout(() => step(pi + 1, 0), 700); return; }
      setPanel(pi); setLine(li);
      const cur = pan.lines[li];
      const intro = li === 0 && pan.caption ? `${pan.caption}. ` : '';
      clearTimeout(timer.current);
      say(cur.who, `${intro}${cur.text}`, () => step(pi, li + 1));
    };
    setPlaying(true);
    step(p, l);
  }, [comic, say, stopAll, onFinish]);

  const pause = () => { stopAll(); setPlaying(false); };
  const go = (p) => { const n = Math.max(0, Math.min(comic.panels.length - 1, p)); if (playing) playFrom(n, 0); else { stopAll(); setPanel(n); setLine(-1); } };

  return (
    <div className="comic-player">
      <Panel panel={comic.panels[panel]} index={panel} activeLine={line} playing={playing} big />
      <div className="player-bar">
        <Button size="sm" variant="ghost" icon="chevronLeft" aria-label="Previous panel" disabled={panel === 0} onClick={() => go(panel - 1)} />
        {playing
          ? <Button size="sm" variant="primary" icon="pause" onClick={pause}>Pause</Button>
          : <Button size="sm" variant="primary" icon="play" onClick={() => playFrom(panel, line >= 0 && line < comic.panels[panel].lines.length ? line : 0)}>{panel === 0 && line < 0 ? 'Play' : 'Resume'}</Button>}
        <Button size="sm" variant="ghost" icon="chevronRight" aria-label="Next panel" disabled={panel === comic.panels.length - 1} onClick={() => go(panel + 1)} />
        <div className="player-dots" role="tablist" aria-label="Panels">
          {comic.panels.map((_, i) => <button key={i} type="button" role="tab" aria-selected={i === panel} aria-label={`Panel ${i + 1}`} className={i === panel ? 'on' : ''} onClick={() => go(i)} />)}
        </div>
        <span className="grow" />
        {canSpeak && (
          <Button size="sm" variant="ghost" icon={sound ? 'volume' : 'volumeOff'} aria-pressed={sound} onClick={() => { const s = !sound; setSound(s); if (!s && canSpeak) window.speechSynthesis.cancel(); }}>
            {sound ? 'Sound on' : 'Sound off'}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The check question at the end. */
export function ComicQuiz({ quiz }) {
  const [picked, setPicked] = useState(null);
  if (!quiz) return null;
  const right = picked === quiz.answer;
  return (
    <div className="comic-quiz">
      <div className="section-label" style={{ marginTop: 0 }}>Quick check</div>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{quiz.question}</div>
      <div className="stack-sm mt-2">
        {quiz.options.map((o, i) => (
          <button key={i} type="button" disabled={picked !== null}
            className={`option ${picked === null ? '' : i === quiz.answer ? 'correct' : i === picked ? 'wrong' : ''}`} onClick={() => setPicked(i)}>
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className={`small mt-2 ${right ? 'text-success' : ''}`} role="status">
          <Icon name={right ? 'checkCircle' : 'info'} size={14} style={{ verticalAlign: '-2px' }} /> {right ? 'Exactly! ' : 'Not quite. '}{quiz.why}
        </p>
      )}
    </div>
  );
}
