import React from 'react';

// Learnvoy's own cartoon cast (original designs, drawn in SVG):
//   Vo  — the guide: a round blue explorer with a compass-needle antenna.
//   Pip — the learner: a small orange sprout who asks the beginner questions.
// Each has a few moods that change the eyes, brows, mouth and arms.

function Eyes({ cx1, cx2, cy, r, mood, look = 0 }) {
  if (mood === 'happy' || mood === 'excited') {
    // happy closed-arc eyes
    return (
      <g stroke="#1d1d1f" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d={`M${cx1 - r} ${cy + 1} q${r} ${-r * 1.3} ${r * 2} 0`} />
        <path d={`M${cx2 - r} ${cy + 1} q${r} ${-r * 1.3} ${r * 2} 0`} />
      </g>
    );
  }
  const big = mood === 'surprised' ? 1.25 : 1;
  const dy = mood === 'thinking' ? -2 : 0;
  return (
    <g>
      <circle cx={cx1} cy={cy} r={r * big} fill="#fff" stroke="#1d1d1f" strokeWidth="2" />
      <circle cx={cx2} cy={cy} r={r * big} fill="#fff" stroke="#1d1d1f" strokeWidth="2" />
      <circle cx={cx1 + look} cy={cy + dy} r={r * 0.45} fill="#1d1d1f" />
      <circle cx={cx2 + look} cy={cy + dy} r={r * 0.45} fill="#1d1d1f" />
      <circle cx={cx1 + look + 1.3} cy={cy + dy - 1.5} r={r * 0.15} fill="#fff" />
      <circle cx={cx2 + look + 1.3} cy={cy + dy - 1.5} r={r * 0.15} fill="#fff" />
    </g>
  );
}

function Mouth({ x, y, w, mood }) {
  const p = { stroke: '#1d1d1f', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' };
  if (mood === 'surprised') return <ellipse cx={x} cy={y + 2} rx={w * 0.22} ry={w * 0.3} fill="#7a2e2e" stroke="#1d1d1f" strokeWidth="2" />;
  if (mood === 'thinking') return <path {...p} d={`M${x - w / 3} ${y + 2} h${w * 0.55}`} />;
  if (mood === 'confused') return <path {...p} d={`M${x - w / 2.4} ${y + 2} q${w / 5} -5 ${w / 2.4} 0 t${w / 2.4} 0`} />;
  if (mood === 'excited' || mood === 'explaining') return <path d={`M${x - w / 2} ${y - 1} q${w / 2} ${w * 0.75} ${w} 0 z`} fill="#7a2e2e" stroke="#1d1d1f" strokeWidth="2.5" strokeLinejoin="round" />;
  return <path {...p} d={`M${x - w / 2} ${y} q${w / 2} ${w * 0.45} ${w} 0`} />;
}

export function Vo({ mood = 'happy', size = 110, talking = false }) {
  const armUp = mood === 'explaining' || mood === 'excited';
  return (
    <svg viewBox="0 0 120 140" width={size} height={size * 140 / 120} className={`toon toon-vo ${talking ? 'talking' : ''} mood-${mood}`} aria-hidden="true">
      <defs>
        <radialGradient id="vo-body" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#5cb0ff" /><stop offset="1" stopColor="#0a6fe0" /></radialGradient>
      </defs>
      {/* compass-needle antenna */}
      <line x1="60" y1="30" x2="60" y2="14" stroke="#1d1d1f" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 2 L66 12 L60 10 L54 12 Z" fill="#ff5a4e" stroke="#1d1d1f" strokeWidth="1.5" strokeLinejoin="round" />
      {/* arms */}
      <path d={armUp ? 'M98 78 q14 -18 10 -36' : 'M98 82 q12 10 8 26'} stroke="#0a6fe0" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M22 82 q-12 10 -8 26" stroke="#0a6fe0" strokeWidth="9" fill="none" strokeLinecap="round" />
      {armUp && <circle cx="108" cy="40" r="6" fill="#5cb0ff" stroke="#1d1d1f" strokeWidth="1.5" />}
      {/* body */}
      <ellipse cx="60" cy="80" rx="42" ry="48" fill="url(#vo-body)" stroke="#1d1d1f" strokeWidth="2.5" />
      <ellipse cx="60" cy="98" rx="24" ry="18" fill="#e8f3ff" opacity=".9" />
      {/* feet */}
      <ellipse cx="44" cy="128" rx="11" ry="6" fill="#0a5bc0" stroke="#1d1d1f" strokeWidth="2" />
      <ellipse cx="76" cy="128" rx="11" ry="6" fill="#0a5bc0" stroke="#1d1d1f" strokeWidth="2" />
      {/* face */}
      {mood === 'thinking' && <path d="M38 52 l12 -4 M70 48 l12 4" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" />}
      <Eyes cx1={46} cx2={74} cy={64} r={9} mood={mood} look={mood === 'thinking' ? 2 : 0} />
      <circle cx="36" cy="78" r="5" fill="#ff8fa3" opacity=".55" />
      <circle cx="84" cy="78" r="5" fill="#ff8fa3" opacity=".55" />
      <g className="toon-mouth"><Mouth x={60} y={80} w={18} mood={mood} /></g>
      {mood === 'excited' && <path d="M104 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#ffd60a" stroke="#1d1d1f" strokeWidth="1.2" />}
    </svg>
  );
}

export function Pip({ mood = 'happy', size = 90, talking = false }) {
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} className={`toon toon-pip ${talking ? 'talking' : ''} mood-${mood}`} aria-hidden="true">
      <defs>
        <radialGradient id="pip-body" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#ffc078" /><stop offset="1" stopColor="#ff8a2a" /></radialGradient>
      </defs>
      {/* sprout */}
      <path d="M50 30 q0 -10 0 -16" stroke="#2f9e44" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 16 q-14 -12 -22 -2 q12 8 22 2 z" fill="#51cf66" stroke="#1d1d1f" strokeWidth="1.5" />
      <path d="M50 18 q12 -14 22 -6 q-10 10 -22 6 z" fill="#69db7c" stroke="#1d1d1f" strokeWidth="1.5" />
      {/* arms */}
      <path d={mood === 'excited' ? 'M82 70 q12 -14 8 -28' : 'M82 74 q10 8 6 20'} stroke="#ff8a2a" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d={mood === 'confused' || mood === 'thinking' ? 'M18 74 q-6 -14 6 -22' : 'M18 74 q-10 8 -6 20'} stroke="#ff8a2a" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* body */}
      <circle cx="50" cy="72" r="36" fill="url(#pip-body)" stroke="#1d1d1f" strokeWidth="2.5" />
      <ellipse cx="38" cy="112" rx="9" ry="5" fill="#e8590c" stroke="#1d1d1f" strokeWidth="2" />
      <ellipse cx="62" cy="112" rx="9" ry="5" fill="#e8590c" stroke="#1d1d1f" strokeWidth="2" />
      {/* face */}
      {(mood === 'confused' || mood === 'thinking') && <path d="M30 53 l10 -3 M60 50 l10 3" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" />}
      <Eyes cx1={38} cx2={62} cy={64} r={8} mood={mood} look={mood === 'thinking' ? -2 : 0} />
      <g fill="#c2410c" opacity=".55"><circle cx="30" cy="76" r="1.6" /><circle cx="34" cy="80" r="1.6" /><circle cx="70" cy="76" r="1.6" /><circle cx="66" cy="80" r="1.6" /></g>
      <g className="toon-mouth"><Mouth x={50} y={80} w={14} mood={mood} /></g>
      {mood === 'confused' && <text x="84" y="34" fontSize="22" fontWeight="800" fill="#1d1d1f" fontFamily="system-ui, sans-serif">?</text>}
    </svg>
  );
}

export const CAST = { vo: { name: 'Vo', Component: Vo }, pip: { name: 'Pip', Component: Pip } };
