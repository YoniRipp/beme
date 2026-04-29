/* TrackVibe shared state, mock data, icons, and small helpers.
   Used by all 3 visual directions. */

const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

/* ───────── MOCK DATA ───────── */

const todayISO = () => new Date().toISOString().slice(0, 10);

const SEED_FOODS = [
  { id: 'f1', name: 'Greek yogurt + berries', meal: 'Breakfast', cal: 240, p: 18, c: 28, f: 6, time: '07:42' },
  { id: 'f2', name: 'Cold brew coffee', meal: 'Breakfast', cal: 5, p: 0, c: 1, f: 0, time: '08:15' },
  { id: 'f3', name: 'Chicken bowl, brown rice', meal: 'Lunch', cal: 620, p: 48, c: 62, f: 18, time: '12:50' },
  { id: 'f4', name: 'Apple', meal: 'Snack', cal: 95, p: 0, c: 25, f: 0, time: '15:30' },
];

const SEED_WORKOUTS = [
  { id: 'w1', title: 'Push day', type: 'strength', date: todayISO(), duration: 52, exercises: [
    { name: 'Bench press', sets: 4, reps: 8, weight: 70 },
    { name: 'Overhead press', sets: 3, reps: 10, weight: 40 },
    { name: 'Cable fly', sets: 3, reps: 12, weight: 18 },
    { name: 'Tricep pushdown', sets: 3, reps: 12, weight: 25 },
  ]},
  { id: 'w2', title: 'Easy run', type: 'cardio', date: '2026-04-26', duration: 32, exercises: [
    { name: '5K run', sets: 1, reps: 1, weight: 0, note: 'Z2 · 6:24/km' },
  ]},
  { id: 'w3', title: 'Pull day', type: 'strength', date: '2026-04-25', duration: 58, exercises: [
    { name: 'Deadlift', sets: 4, reps: 5, weight: 110 },
    { name: 'Pull-up', sets: 4, reps: 8, weight: 0 },
    { name: 'Barbell row', sets: 3, reps: 10, weight: 60 },
  ]},
];

const SEED_GOALS = [
  { id: 'g1', kind: 'calories', label: 'Stay under 2,200 kcal/day', target: 2200, period: 'daily', current: 960 },
  { id: 'g2', kind: 'workouts', label: '4 workouts this week', target: 4, period: 'weekly', current: 3 },
  { id: 'g3', kind: 'sleep', label: 'Sleep 7h+ each night', target: 7, period: 'daily', current: 7.2 },
];

const SEED_WEEK_CALS = [1840, 2100, 1950, 2280, 1720, 2050, 960];
const SEED_WEEK_WORKOUTS = [1, 0, 1, 1, 0, 0, 1]; // mon-sun, today is sun
const SEED_WEEK_SLEEP = [6.8, 7.4, 6.5, 8.1, 7.0, 7.5, 7.2];

/* ───────── STATE HOOK (shared across all 3 directions, but each renders its own copy) ───────── */

function useTrackVibeState() {
  const [foods, setFoods] = useState(SEED_FOODS);
  const [workouts, setWorkouts] = useState(SEED_WORKOUTS);
  const [goals, setGoals] = useState(SEED_GOALS);
  const [water, setWater] = useState(5); // glasses (of 8)
  const [weightKg, setWeightKg] = useState(74.2);
  const [weightHistory, setWeightHistory] = useState([76.1, 75.6, 75.2, 74.8, 74.5, 74.4, 74.2]);
  const [sleepHours, setSleepHours] = useState(7.2);
  const [macroGoals] = useState({ cal: 2200, p: 150, c: 240, f: 70 });
  const [profile] = useState({ name: 'Alex', heightCm: 178, targetKg: 72, activity: 'Active' });

  const totals = useMemo(() => {
    return foods.reduce((acc, f) => ({
      cal: acc.cal + f.cal, p: acc.p + f.p, c: acc.c + f.c, f: acc.f + f.f,
    }), { cal: 0, p: 0, c: 0, f: 0 });
  }, [foods]);

  const addFood = useCallback((food) => {
    setFoods((arr) => [{ ...food, id: 'f' + Date.now() }, ...arr]);
  }, []);
  const removeFood = useCallback((id) => setFoods((arr) => arr.filter((x) => x.id !== id)), []);

  const addWorkout = useCallback((wk) => {
    setWorkouts((arr) => [{ ...wk, id: 'w' + Date.now(), date: todayISO() }, ...arr]);
  }, []);

  const updateGoal = useCallback((id, patch) => {
    setGoals((arr) => arr.map((g) => g.id === id ? { ...g, ...patch } : g));
  }, []);
  const addGoal = useCallback((g) => {
    setGoals((arr) => [...arr, { ...g, id: 'g' + Date.now(), current: 0 }]);
  }, []);

  return {
    foods, addFood, removeFood,
    workouts, addWorkout,
    goals, addGoal, updateGoal,
    water, setWater,
    weightKg, setWeightKg, weightHistory, setWeightHistory,
    sleepHours, setSleepHours,
    macroGoals, profile, totals,
    weekCals: SEED_WEEK_CALS, weekWorkouts: SEED_WEEK_WORKOUTS, weekSleep: SEED_WEEK_SLEEP,
  };
}

/* ───────── ICONS (inline SVG, stroke-based, 24px viewBox) ───────── */

const Icon = ({ d, size = 22, stroke = 'currentColor', fill = 'none', sw = 1.8, style, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth={sw}
       strokeLinecap="round" strokeLinejoin="round" style={style} className={className} aria-hidden="true">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  home: (p) => <Icon {...p} d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  dumbbell: (p) => <Icon {...p} d={<g><path d="M2 12h2M20 12h2M6 7v10M18 7v10M6 9h12M6 15h12"/></g>} />,
  flame: (p) => <Icon {...p} d="M12 3s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s.5 2 2 2 1.5-3 1-7Z" />,
  target: (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></g>} />,
  mic: (p) => <Icon {...p} d={<g><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></g>} />,
  plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  close: (p) => <Icon {...p} d="M6 6l12 12M18 6 6 18" />,
  chevR: (p) => <Icon {...p} d="m9 6 6 6-6 6" />,
  chevL: (p) => <Icon {...p} d="m15 6-6 6 6 6" />,
  chevD: (p) => <Icon {...p} d="m6 9 6 6 6-6" />,
  arrowUp: (p) => <Icon {...p} d="M12 19V5M5 12l7-7 7 7" />,
  arrowDn: (p) => <Icon {...p} d="M12 5v14M19 12l-7 7-7-7" />,
  bolt: (p) => <Icon {...p} d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  drop: (p) => <Icon {...p} d="M12 3s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z" />,
  moon: (p) => <Icon {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  sun: (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></g>} />,
  user: (p) => <Icon {...p} d={<g><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></g>} />,
  settings: (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></g>} />,
  trash: (p) => <Icon {...p} d={<g><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></g>} />,
  edit: (p) => <Icon {...p} d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />,
  check: (p) => <Icon {...p} d="m5 12 5 5L20 7" />,
  search: (p) => <Icon {...p} d={<g><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></g>} />,
  bell: (p) => <Icon {...p} d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4" />,
  calendar: (p) => <Icon {...p} d={<g><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></g>} />,
  apple: (p) => <Icon {...p} d="M12 7c0-2 1-4 3-4 0 2-1 3-3 4Zm0 0c-2-2-6-1-7 2-1 4 2 11 5 11 1 0 1-1 2-1s1 1 2 1c3 0 6-7 5-11-1-3-5-4-7-2Z" />,
  run: (p) => <Icon {...p} d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-2 16 2-6 3 2v4M5 13l4-2 2 2-3 6M14 9l-3-3-3 3-2 4M16 12l4 1" />,
  heart: (p) => <Icon {...p} d="M12 21s-7-4.5-9-9.5C1.5 7 5 4 8 5c2 .5 3 2 4 3 1-1 2-2.5 4-3 3-1 6.5 2 5 6.5-2 5-9 9.5-9 9.5Z" />,
  cycle: (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="9"/><path d="M12 3v9l5 3"/></g>} />,
  scale: (p) => <Icon {...p} d={<g><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 11h8M12 9v6"/></g>} />,
  history: (p) => <Icon {...p} d={<g><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 7v5l3 2"/></g>} />,
  copy: (p) => <Icon {...p} d={<g><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></g>} />,
  star: (p) => <Icon {...p} d="m12 3 2.6 6.4 6.9.5-5.3 4.5 1.7 6.7L12 17.6 6.1 21.1l1.7-6.7-5.3-4.5 6.9-.5z" />,
  filter: (p) => <Icon {...p} d="M4 5h16l-6 8v6l-4 2v-8z" />,
  sparkle: (p) => <Icon {...p} d="M12 3v6m0 6v6M3 12h6m6 0h6M6 6l4 4M14 14l4 4M6 18l4-4M14 10l4-4" />,
  google: (p) => (
    <Icon {...p} fill="currentColor" stroke="none" sw={0} d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.3-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Zm-9.6 9.6c2.7 0 5-1 6.7-2.5l-3.2-2.5c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.9v2.6A9.6 9.6 0 0 0 12 21.8Zm-5.8-7.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V6.8H2.9a9.6 9.6 0 0 0 0 8.7l3.3-2.5Zm5.8-7.7c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 1.7 14.7.7 12 .7 8.3.7 5 2.8 2.9 5.9l3.3 2.6c.8-2.5 3.1-4.3 5.8-4.3Z"/>
  ),
};

/* ───────── PRIMITIVES ───────── */

function Modal({ open, onClose, children, side = 'center', maxWidth = 360, theme }) {
  if (!open) return null;
  const justify = side === 'bottom' ? 'flex-end' : 'center';
  const slide = side === 'bottom' ? 'translateY(0)' : 'translateY(0)';
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: justify, justifyContent: 'center',
        zIndex: 50, backdropFilter: 'blur(4px)',
        animation: 'tvFadeIn 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: side === 'bottom' ? '100%' : 'calc(100% - 24px)',
          maxWidth: side === 'bottom' ? '100%' : maxWidth,
          maxHeight: '92%', overflow: 'auto',
          background: theme?.surface ?? '#fff',
          color: theme?.ink ?? '#1a1a1a',
          borderRadius: side === 'bottom' ? '24px 24px 0 0' : 20,
          boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
          transform: slide,
          animation: side === 'bottom' ? 'tvSlideUp 0.22s cubic-bezier(.2,.8,.2,1)' : 'tvPop 0.2s cubic-bezier(.2,.8,.2,1)',
        }}
      >{children}</div>
    </div>
  );
}

/* Tiny SVG circular ring */
function Ring({ pct, size = 88, stroke = 8, color = '#34d399', track = 'rgba(255,255,255,0.12)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}

/* Small spark / bar chart */
function BarChart({ values, max, color = '#34d399', track = 'rgba(255,255,255,0.08)', height = 80, gap = 6, radius = 4, labels }) {
  const cap = max ?? Math.max(...values);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height }}>
      {values.map((v, i) => {
        const h = Math.max(4, (v / cap) * height);
        const isToday = i === values.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', height: h, background: isToday ? color : track,
              borderRadius: radius, transition: 'height 0.5s cubic-bezier(.2,.8,.2,1)',
              border: isToday ? 'none' : `1px solid ${color}22`,
            }} />
            {labels && <div style={{ fontSize: 10, opacity: 0.55, fontWeight: 600 }}>{labels[i]}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* Line / area sparkline */
function Sparkline({ values, color = '#34d399', height = 60, width = 280, fill }) {
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - ((v - min) / span) * (height - 8) - 4]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = d + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {fill && <path d={area} fill={fill} />}
      <path d={d} stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => i === pts.length - 1 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={color} />
      ))}
    </svg>
  );
}

/* ───────── KEYFRAMES (one-time injection) ───────── */
if (typeof document !== 'undefined' && !document.getElementById('tv-keyframes')) {
  const s = document.createElement('style');
  s.id = 'tv-keyframes';
  s.textContent = `
    @keyframes tvFadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes tvSlideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    @keyframes tvPop { from { transform: scale(.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    @keyframes tvFadeUp { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    @keyframes tvPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
    @keyframes tvWave { 0%,100% { transform: scaleY(0.4) } 50% { transform: scaleY(1) } }
    @keyframes tvShimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
    @keyframes tvRingIn { from { stroke-dashoffset: var(--c, 100) } to { stroke-dashoffset: var(--o, 0) } }
    .tv-no-scroll::-webkit-scrollbar { display: none }
    .tv-no-scroll { scrollbar-width: none; -ms-overflow-style: none }
    .tv-press { transition: transform .12s; }
    .tv-press:active { transform: scale(0.96); }
    .tv-card-in { animation: tvFadeUp .35s cubic-bezier(.2,.8,.2,1) both }
  `;
  document.head.appendChild(s);
}

/* ───────── EXPORT to window for cross-script access ───────── */
Object.assign(window, {
  useTrackVibeState, Icons, Icon, Modal, Ring, BarChart, Sparkline,
  todayISO,
});
