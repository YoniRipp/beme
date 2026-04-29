/* PULSE — Direction 1: Dark sport aesthetic.
   Deep ink background, neon green primary, big tabular numerals. */

const PULSE = {
  bg: '#0b0d0c',
  surface: '#15181a',
  surface2: '#1d2123',
  hairline: 'rgba(255,255,255,0.08)',
  hairline2: 'rgba(255,255,255,0.14)',
  ink: '#f4f7f4',
  ink2: 'rgba(244,247,244,0.66)',
  ink3: 'rgba(244,247,244,0.42)',
  primary: '#9cf25b',          // neon lime
  primaryDeep: '#5fc62a',
  primaryGlow: 'rgba(156,242,91,0.35)',
  hot: '#ff7a3a',
  cool: '#5ec2ff',
  yellow: '#ffd24a',
  danger: '#ff5a6a',
};

function PulseScreen({ children, scroll = true, padBottom = 96 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: PULSE.bg, color: PULSE.ink,
      fontFamily: 'Inter, system-ui, sans-serif', overflowY: scroll ? 'auto' : 'hidden',
      overflowX: 'hidden',
    }} className="tv-no-scroll">
      <div style={{ paddingBottom: padBottom }}>{children}</div>
    </div>
  );
}

function PulseStatusBar() {
  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 22px 6px', fontSize: 14, fontWeight: 600, color: PULSE.ink,
      letterSpacing: '-0.01em',
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11" fill={PULSE.ink}><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="4" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={PULSE.ink} strokeWidth="1"><path d="M1 4a10 10 0 0 1 14 0M3.5 6.5a6.5 6.5 0 0 1 9 0M6 9a3 3 0 0 1 4 0" strokeLinecap="round"/></svg>
        <div style={{ width: 25, height: 12, border: `1px solid ${PULSE.ink}`, borderRadius: 3, position: 'relative', padding: 1 }}>
          <div style={{ width: '78%', height: '100%', background: PULSE.ink, borderRadius: 1 }}/>
          <div style={{ position: 'absolute', right: -3, top: 3, width: 2, height: 5, background: PULSE.ink, borderRadius: 1 }}/>
        </div>
      </div>
    </div>
  );
}

function PulseNav({ tab, onTab, onVoice }) {
  const items = [
    { id: 'home', label: 'Home', Icon: Icons.home },
    { id: 'body', label: 'Body', Icon: Icons.dumbbell },
    { id: 'energy', label: 'Energy', Icon: Icons.flame },
    { id: 'goals', label: 'Goals', Icon: Icons.target },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 14px)',
      background: 'linear-gradient(to top, rgba(11,13,12,0.96) 60%, rgba(11,13,12,0))',
      pointerEvents: 'none',
    }}>
      <div style={{
        margin: '0 14px 14px', height: 64, background: PULSE.surface,
        border: `1px solid ${PULSE.hairline}`, borderRadius: 22, display: 'flex',
        alignItems: 'center', justifyContent: 'space-around', position: 'relative',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)', pointerEvents: 'auto',
      }}>
        {items.slice(0, 2).map(({ id, label, Icon: Ico }) => (
          <button key={id} onClick={() => onTab(id)} className="tv-press"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? PULSE.primary : PULSE.ink2, padding: '8px 14px',
              minWidth: 56,
            }}>
            <Ico size={22} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </button>
        ))}
        <div style={{ width: 64 }} />
        {items.slice(2).map(({ id, label, Icon: Ico }) => (
          <button key={id} onClick={() => onTab(id)} className="tv-press"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? PULSE.primary : PULSE.ink2, padding: '8px 14px',
              minWidth: 56,
            }}>
            <Ico size={22} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </button>
        ))}
        <button onClick={onVoice} className="tv-press" style={{
          position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
          width: 60, height: 60, borderRadius: 30,
          background: `radial-gradient(circle at 30% 30%, ${PULSE.primary}, ${PULSE.primaryDeep})`,
          color: '#0b0d0c', border: `3px solid ${PULSE.bg}`,
          boxShadow: `0 0 24px ${PULSE.primaryGlow}, 0 8px 20px rgba(0,0,0,0.4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icons.mic size={26} sw={2.4} />
        </button>
      </div>
    </div>
  );
}

/* ───────── HOME (Dashboard) ───────── */

function PulseHome({ s, onNavScreen, onAddFood, onAddWorkout }) {
  const calPct = Math.min(s.totals.cal / s.macroGoals.cal, 1);
  return (
    <PulseScreen>
      <PulseStatusBar />
      {/* Header */}
      <div style={{ padding: '6px 22px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: PULSE.ink3, textTransform: 'uppercase' }}>Mon · Apr 27</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>Hey {s.profile.name}</div>
        </div>
        <button onClick={() => onNavScreen('profile')} className="tv-press" style={{
          width: 42, height: 42, borderRadius: 21, background: PULSE.surface, border: `1px solid ${PULSE.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: PULSE.ink,
        }}><Icons.user size={20} /></button>
      </div>

      {/* Hero card — calories */}
      <div style={{ padding: '0 16px' }}>
        <div className="tv-card-in" style={{
          background: `linear-gradient(140deg, ${PULSE.surface} 0%, #1f2826 100%)`,
          border: `1px solid ${PULSE.hairline}`, borderRadius: 28, padding: 22,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -40, width: 200, height: 200,
            background: `radial-gradient(circle, ${PULSE.primaryGlow}, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: PULSE.primary, textTransform: 'uppercase' }}>Today's fuel</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3 }}>{s.totals.cal} / {s.macroGoals.cal} kcal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Ring pct={calPct} size={132} stroke={11} color={PULSE.primary} track="rgba(255,255,255,0.08)">
              <div style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.totals.cal}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: PULSE.ink3, textTransform: 'uppercase', marginTop: 4 }}>kcal in</div>
            </Ring>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Protein', cur: s.totals.p, goal: s.macroGoals.p, color: PULSE.primary },
                { label: 'Carbs', cur: s.totals.c, goal: s.macroGoals.c, color: PULSE.cool },
                { label: 'Fat', cur: s.totals.f, goal: s.macroGoals.f, color: PULSE.yellow },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: PULSE.ink2 }}>{m.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: PULSE.ink }}>{m.cur}<span style={{ color: PULSE.ink3 }}>/{m.goal}g</span></span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(m.cur/m.goal*100, 100)}%`, height: '100%', background: m.color, transition: 'width .6s' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat row — 3 mini cards */}
      <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <PulseStat icon={<Icons.dumbbell size={18}/>} label="Workouts" big={s.weekWorkouts.reduce((a,b)=>a+b,0)} sub="this week" tint={PULSE.primary} onClick={() => onNavScreen('body')} />
        <PulseStat icon={<Icons.moon size={18}/>} label="Sleep" big={s.sleepHours.toFixed(1)} sub="hrs · last night" tint={PULSE.cool} onClick={() => onNavScreen('sleep')} />
        <PulseStat icon={<Icons.scale size={18}/>} label="Weight" big={s.weightKg.toFixed(1)} sub="kg · -1.9 kg" tint={PULSE.hot} onClick={() => onNavScreen('weight')} />
      </div>

      {/* Quick actions */}
      <div style={{ padding: '18px 22px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Quick log</h2>
        <span style={{ fontSize: 11, color: PULSE.ink3, fontWeight: 600 }}>Tap to add</span>
      </div>
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <PulseQuick label="Log food" Icon={Icons.apple} bg={`linear-gradient(135deg, ${PULSE.primary}, ${PULSE.primaryDeep})`} fg="#0b0d0c" onClick={onAddFood}/>
        <PulseQuick label="Log workout" Icon={Icons.dumbbell} bg={PULSE.surface} fg={PULSE.ink} border onClick={onAddWorkout}/>
        <PulseQuick label="Water" Icon={Icons.drop} bg={PULSE.surface} fg={PULSE.ink} border onClick={() => onNavScreen('water')} pill={`${s.water}/8`}/>
        <PulseQuick label="Sleep" Icon={Icons.moon} bg={PULSE.surface} fg={PULSE.ink} border onClick={() => onNavScreen('sleep')} pill={`${s.sleepHours}h`}/>
      </div>

      {/* Streak banner */}
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{
          background: `linear-gradient(95deg, ${PULSE.surface} 0%, #2a1f1a 100%)`,
          border: `1px solid ${PULSE.hairline}`, borderRadius: 20, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${PULSE.hot}, #ff5a6a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: `0 0 20px ${PULSE.hot}55`,
          }}><Icons.flame size={24} sw={2.2}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Current streak</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>12 days <span style={{ fontSize: 13, color: PULSE.ink2, fontWeight: 600 }}>· keep it lit</span></div>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 20, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>This week</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Calories</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>1,843</div>
              <div style={{ fontSize: 10, color: PULSE.ink3, fontWeight: 600 }}>avg / day</div>
            </div>
          </div>
          <BarChart values={s.weekCals} max={2400} color={PULSE.primary} track={PULSE.surface2} height={70} labels={['M','T','W','T','F','S','S']} />
        </div>
      </div>
    </PulseScreen>
  );
}

function PulseStat({ icon, label, big, sub, tint, onClick }) {
  return (
    <button onClick={onClick} className="tv-press" style={{
      background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 18,
      padding: '12px 12px 10px', textAlign: 'left', cursor: 'pointer', color: PULSE.ink,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ color: tint, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {icon}
        <Icons.chevR size={14} stroke={PULSE.ink3} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{big}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: PULSE.ink3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sub}</div>
    </button>
  );
}
function PulseQuick({ label, Icon: Ico, bg, fg, border, onClick, pill }) {
  return (
    <button onClick={onClick} className="tv-press" style={{
      background: bg, color: fg, border: border ? `1px solid ${PULSE.hairline}` : 'none',
      borderRadius: 18, padding: 14, height: 78, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Ico size={22} sw={2}/>
        {pill && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 8, color: fg }}>{pill}</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</div>
    </button>
  );
}

/* ───────── BODY (Workouts) ───────── */

function PulseBody({ s, onAddWorkout, back }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Strength', 'Cardio', 'Flexibility'];
  const filtered = s.workouts.filter((w) => filter === 'All' || w.type.toLowerCase() === filter.toLowerCase());
  return (
    <PulseScreen>
      <PulseStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: PULSE.ink3, textTransform: 'uppercase' }}>Body</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>Workouts</div>
        </div>
        <button onClick={onAddWorkout} className="tv-press" style={{
          height: 42, padding: '0 16px', borderRadius: 21, background: PULSE.primary, color: '#0b0d0c',
          border: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}><Icons.plus size={18} sw={2.4}/>New</button>
      </div>

      {/* Week banner */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Goal · 4 / week</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2 }}><span style={{ color: PULSE.primary }}>3</span><span style={{ color: PULSE.ink3, fontWeight: 600 }}>/4</span></div>
            </div>
            <Ring pct={3/4} size={72} stroke={7} color={PULSE.primary} track="rgba(255,255,255,0.08)">
              <div style={{ fontSize: 11, fontWeight: 800, color: PULSE.primary }}>75%</div>
            </Ring>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: PULSE.ink3 }}>{d}</div>
                <div style={{ width: 32, height: 32, borderRadius: 10,
                  background: s.weekWorkouts[i] ? PULSE.primary : 'rgba(255,255,255,0.06)',
                  border: i === 6 ? `2px solid ${PULSE.ink}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.weekWorkouts[i] ? '#0b0d0c' : PULSE.ink3,
                }}>{s.weekWorkouts[i] ? <Icons.check size={16} sw={2.6}/> : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '18px 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }} className="tv-no-scroll">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="tv-press" style={{
            padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${filter === f ? PULSE.primary : PULSE.hairline}`,
            background: filter === f ? PULSE.primary : 'transparent',
            color: filter === f ? '#0b0d0c' : PULSE.ink2, whiteSpace: 'nowrap',
          }}>{f}</button>
        ))}
      </div>

      {/* Workout list */}
      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((w) => (
          <div key={w.id} className="tv-card-in" style={{
            background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 20, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: w.type === 'cardio' ? `${PULSE.cool}22` : `${PULSE.primary}22`,
                  color: w.type === 'cardio' ? PULSE.cool : PULSE.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{w.type === 'cardio' ? <Icons.run size={18}/> : <Icons.dumbbell size={18}/>}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
                  <div style={{ fontSize: 11, color: PULSE.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                    {new Date(w.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} · {w.duration} min
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3 }}>{w.exercises.length} ex</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {w.exercises.slice(0, 3).map((ex, i) => (
                <div key={i} style={{
                  fontSize: 11, fontWeight: 600, color: PULSE.ink2,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${PULSE.hairline}`,
                  padding: '5px 10px', borderRadius: 10,
                }}>{ex.name} <span style={{ color: PULSE.ink3 }}>· {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ''}</span></div>
              ))}
              {w.exercises.length > 3 && (
                <div style={{ fontSize: 11, color: PULSE.ink3, padding: '5px 10px' }}>+{w.exercises.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </PulseScreen>
  );
}

/* ───────── ENERGY (Food) ───────── */

function PulseEnergy({ s, onAddFood, onRemove }) {
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  return (
    <PulseScreen>
      <PulseStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: PULSE.ink3, textTransform: 'uppercase' }}>Energy</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>Food log</div>
        </div>
        <button onClick={onAddFood} className="tv-press" style={{
          height: 42, padding: '0 16px', borderRadius: 21, background: PULSE.primary, color: '#0b0d0c',
          border: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}><Icons.plus size={18} sw={2.4}/>Add</button>
      </div>

      {/* Calorie strip */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${PULSE.surface} 0%, ${PULSE.surface2} 100%)`,
          border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Today</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.totals.cal}</span>
                <span style={{ color: PULSE.ink3, fontWeight: 600 }}>/ {s.macroGoals.cal} kcal</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: PULSE.ink3, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: PULSE.primary, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{Math.max(0, s.macroGoals.cal - s.totals.cal)}</div>
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(s.totals.cal/s.macroGoals.cal*100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${PULSE.primary}, ${PULSE.primaryDeep})`, transition: 'width .6s' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12 }}>
            {[['Protein', s.totals.p, s.macroGoals.p, PULSE.primary],['Carbs', s.totals.c, s.macroGoals.c, PULSE.cool],['Fat', s.totals.f, s.macroGoals.f, PULSE.yellow]].map(([l,c,g,col]) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}><span style={{ color: col, fontVariantNumeric: 'tabular-nums' }}>{c}</span><span style={{ color: PULSE.ink3 }}>/{g}g</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meals */}
      {meals.map((meal) => {
        const items = s.foods.filter((f) => f.meal === meal);
        const total = items.reduce((a, f) => a + f.cal, 0);
        const MealIcon = meal === 'Breakfast' ? Icons.sun : meal === 'Lunch' ? Icons.sun : meal === 'Dinner' ? Icons.moon : Icons.apple;
        return (
          <div key={meal} style={{ padding: '18px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MealIcon size={16} stroke={PULSE.primary}/>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{meal}</span>
              </div>
              <span style={{ fontSize: 12, color: PULSE.ink3, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{total} kcal</span>
            </div>
            {items.length === 0 ? (
              <button onClick={onAddFood} className="tv-press" style={{
                width: '100%', background: 'transparent', border: `1.5px dashed ${PULSE.hairline2}`,
                borderRadius: 16, padding: 14, color: PULSE.ink3, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><Icons.plus size={14}/> Add to {meal.toLowerCase()}</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((f) => (
                  <div key={f.id} style={{
                    background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 16,
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: PULSE.ink3, marginTop: 2, fontWeight: 600 }}>
                        {f.time} · P {f.p}g · C {f.c}g · F {f.f}g
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: 'tabular-nums', color: PULSE.primary }}>{f.cal}</div>
                    <button onClick={() => onRemove(f.id)} style={{
                      background: 'none', border: 'none', color: PULSE.ink3, cursor: 'pointer', padding: 4,
                    }}><Icons.trash size={16}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </PulseScreen>
  );
}

/* ───────── GOALS ───────── */

function PulseGoals({ s, onAddGoal }) {
  return (
    <PulseScreen>
      <PulseStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: PULSE.ink3, textTransform: 'uppercase' }}>Goals</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>Stay on target</div>
        </div>
        <button onClick={onAddGoal} className="tv-press" style={{
          height: 42, padding: '0 16px', borderRadius: 21, background: PULSE.primary, color: '#0b0d0c',
          border: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}><Icons.plus size={18} sw={2.4}/>New</button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {s.goals.map((g) => {
          const pct = g.kind === 'calories' ? (1 - Math.min(g.current / g.target, 1)) : Math.min(g.current / g.target, 1);
          const ok = g.kind === 'calories' ? g.current <= g.target : g.current >= g.target;
          const color = ok ? PULSE.primary : PULSE.yellow;
          const Ico = g.kind === 'calories' ? Icons.flame : g.kind === 'workouts' ? Icons.dumbbell : Icons.moon;
          return (
            <div key={g.id} className="tv-card-in" style={{
              background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Ring pct={pct} size={64} stroke={6} color={color} track="rgba(255,255,255,0.08)">
                  <Ico size={20} stroke={color}/>
                </Ring>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{g.period}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: PULSE.ink2, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color, fontWeight: 700 }}>{g.current}</span> / {g.target} {g.kind === 'calories' ? 'kcal' : g.kind === 'workouts' ? 'sessions' : 'hrs'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PulseScreen>
  );
}

/* ───────── WATER / WEIGHT / SLEEP / PROFILE / AUTH ───────── */

function PulseSheet({ title, onBack, children }) {
  return (
    <PulseScreen>
      <PulseStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} className="tv-press" style={{
          width: 40, height: 40, borderRadius: 20, background: PULSE.surface, border: `1px solid ${PULSE.hairline}`,
          color: PULSE.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Icons.chevL size={18}/></button>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
      </div>
      <div style={{ padding: '0 16px' }}>{children}</div>
    </PulseScreen>
  );
}

function PulseWater({ s, onBack }) {
  return (
    <PulseSheet title="Water" onBack={onBack}>
      <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 22, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.cool, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Today</div>
        <div style={{ fontSize: 64, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', marginTop: 4, color: PULSE.cool }}>{s.water}<span style={{ color: PULSE.ink3, fontSize: 28 }}>/8</span></div>
        <div style={{ fontSize: 13, color: PULSE.ink2, fontWeight: 600 }}>{s.water * 250} ml · 1 glass = 250ml</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          {Array.from({length:8}).map((_,i)=>(
            <button key={i} onClick={() => s.setWater(i + 1 <= s.water ? i : i + 1)} className="tv-press" style={{
              width: 36, height: 48, borderRadius: 10, cursor: 'pointer',
              background: i < s.water ? PULSE.cool : 'transparent',
              border: `1.5px solid ${i < s.water ? PULSE.cool : PULSE.hairline2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i < s.water ? '#0b0d0c' : PULSE.ink3,
            }}><Icons.drop size={16} sw={i < s.water ? 2.4 : 1.8}/></button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center' }}>
          <button onClick={() => s.setWater(Math.max(0, s.water - 1))} className="tv-press" style={{ width: 48, height: 48, borderRadius: 24, background: PULSE.surface2, border: `1px solid ${PULSE.hairline}`, color: PULSE.ink, fontWeight: 800, cursor: 'pointer' }}>−</button>
          <button onClick={() => s.setWater(Math.min(12, s.water + 1))} className="tv-press" style={{ width: 48, height: 48, borderRadius: 24, background: PULSE.cool, color: '#0b0d0c', border: 'none', fontWeight: 800, cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </PulseSheet>
  );
}

function PulseWeight({ s, onBack }) {
  const [val, setVal] = useState(s.weightKg);
  const min = Math.min(...s.weightHistory) - 0.5, max = Math.max(...s.weightHistory) + 0.5;
  return (
    <PulseSheet title="Weight" onBack={onBack}>
      <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Current</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.weightKg.toFixed(1)} <span style={{ fontSize: 16, color: PULSE.ink3, fontWeight: 600 }}>kg</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3 }}>Target</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: PULSE.primary }}>{s.profile.targetKg} kg</div>
          </div>
        </div>
        <Sparkline values={s.weightHistory} color={PULSE.primary} fill={`${PULSE.primary}22`} width={300} height={70} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: PULSE.ink3, fontWeight: 700, marginTop: 4 }}>
          {['7d','6d','5d','4d','3d','2d','today'].map(l => <span key={l}>{l}</span>)}
        </div>
      </div>
      <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 18, marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Log new entry</div>
        <input type="number" step="0.1" value={val} onChange={(e) => setVal(parseFloat(e.target.value) || 0)} style={{
          width: '100%', background: PULSE.surface2, border: `1px solid ${PULSE.hairline}`, borderRadius: 14,
          padding: '14px 16px', color: PULSE.ink, fontSize: 18, fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums',
        }} />
        <button onClick={() => { s.setWeightKg(val); s.setWeightHistory([...s.weightHistory.slice(1), val]); onBack(); }} className="tv-press" style={{
          width: '100%', marginTop: 10, height: 48, background: PULSE.primary, color: '#0b0d0c', border: 'none',
          borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>Save weight</button>
      </div>
    </PulseSheet>
  );
}

function PulseSleep({ s, onBack }) {
  return (
    <PulseSheet title="Sleep" onBack={onBack}>
      <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 22, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.cool, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Last night</div>
        <div style={{ fontSize: 56, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', color: PULSE.ink, marginTop: 4 }}>{s.sleepHours.toFixed(1)}<span style={{ fontSize: 22, color: PULSE.ink3, fontWeight: 600 }}>h</span></div>
        <div style={{ fontSize: 13, color: PULSE.ink2, fontWeight: 600 }}>11:14 pm → 6:25 am</div>
        <div style={{ marginTop: 18 }}>
          <input type="range" min="0" max="12" step="0.25" value={s.sleepHours}
            onChange={(e) => s.setSleepHours(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: PULSE.cool }} />
        </div>
      </div>
      <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 22, padding: 18, marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Past 7 days</div>
        <BarChart values={s.weekSleep} max={10} color={PULSE.cool} track={PULSE.surface2} height={70} labels={['M','T','W','T','F','S','S']} />
      </div>
    </PulseSheet>
  );
}

function PulseProfile({ s, onBack }) {
  const rows = [
    { label: 'Name', value: s.profile.name },
    { label: 'Height', value: `${s.profile.heightCm} cm` },
    { label: 'Target weight', value: `${s.profile.targetKg} kg` },
    { label: 'Activity level', value: s.profile.activity },
  ];
  return (
    <PulseSheet title="Profile" onBack={onBack}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 18px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: `linear-gradient(135deg, ${PULSE.primary}, ${PULSE.primaryDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0b0d0c',
          fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em',
        }}>{s.profile.name[0]}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{s.profile.name}</div>
          <div style={{ fontSize: 12, color: PULSE.ink3, fontWeight: 600 }}>Member since Jan 2026</div>
        </div>
      </div>
      <div style={{ background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 18, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${PULSE.hairline}` : 'none' }}>
            <span style={{ color: PULSE.ink2, fontSize: 13, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 18, overflow: 'hidden' }}>
        {['Notifications', 'Dark mode', 'Privacy', 'Sign out'].map((r, i) => (
          <button key={r} className="tv-press" style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', padding: '14px 16px',
            borderBottom: i < 3 ? `1px solid ${PULSE.hairline}` : 'none', background: 'none', border: 'none',
            color: r === 'Sign out' ? PULSE.danger : PULSE.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{r}<Icons.chevR size={16} stroke={PULSE.ink3}/></button>
        ))}
      </div>
    </PulseSheet>
  );
}

function PulseAuth({ onAuth }) {
  const [mode, setMode] = useState('login');
  return (
    <PulseScreen>
      <PulseStatusBar />
      <div style={{ padding: '40px 28px 0', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `linear-gradient(135deg, ${PULSE.primary}, ${PULSE.primaryDeep})`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0b0d0c',
          boxShadow: `0 0 30px ${PULSE.primaryGlow}`,
        }}><Icons.bolt size={32} sw={2.4}/></div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 18 }}>TrackVibe</div>
        <div style={{ fontSize: 14, color: PULSE.ink2, marginTop: 6 }}>Body, energy & goals — in one place.</div>
      </div>
      <div style={{ padding: '32px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 14 }}>
          {['login', 'signup'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: 10, borderRadius: 10, background: mode === m ? PULSE.primary : 'transparent',
              color: mode === m ? '#0b0d0c' : PULSE.ink2, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>{m === 'login' ? 'Log in' : 'Sign up'}</button>
          ))}
        </div>
        <input placeholder="Email" defaultValue="alex@trackvibe.app" style={{
          background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 14, padding: '14px 16px',
          color: PULSE.ink, fontSize: 14, outline: 'none',
        }} />
        <input placeholder="Password" type="password" defaultValue="••••••••" style={{
          background: PULSE.surface, border: `1px solid ${PULSE.hairline}`, borderRadius: 14, padding: '14px 16px',
          color: PULSE.ink, fontSize: 14, outline: 'none',
        }} />
        <button onClick={onAuth} className="tv-press" style={{
          height: 50, marginTop: 6, background: PULSE.primary, color: '#0b0d0c', border: 'none',
          borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          boxShadow: `0 6px 20px ${PULSE.primaryGlow}`,
        }}>{mode === 'login' ? 'Continue' : 'Create account'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: PULSE.ink3, fontSize: 11, fontWeight: 600, margin: '8px 0' }}>
          <div style={{ flex: 1, height: 1, background: PULSE.hairline }}/>OR<div style={{ flex: 1, height: 1, background: PULSE.hairline }}/>
        </div>
        <button onClick={onAuth} className="tv-press" style={{
          height: 48, background: PULSE.surface, color: PULSE.ink, border: `1px solid ${PULSE.hairline}`,
          borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}><Icons.google size={18} stroke="none" fill={PULSE.ink}/>Continue with Google</button>
      </div>
    </PulseScreen>
  );
}

/* ───────── VOICE MODAL ───────── */

function PulseVoice({ open, onClose, onLogged }) {
  const [phase, setPhase] = useState('listen'); // listen | thinking | result
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  useEffect(() => { if (!open) { setPhase('listen'); setTranscript(''); setResult(null); } }, [open]);
  useEffect(() => {
    if (!open || phase !== 'listen') return;
    const samples = ['', 'two', 'two eggs', 'two eggs and', 'two eggs and toast', 'two eggs and toast with butter'];
    let i = 0;
    const t = setInterval(() => {
      i++; setTranscript(samples[Math.min(i, samples.length - 1)]);
      if (i >= samples.length - 1) {
        clearInterval(t);
        setTimeout(() => setPhase('thinking'), 600);
        setTimeout(() => {
          setResult({ items: [
            { name: '2 eggs', cal: 156, p: 12, c: 1, f: 11 },
            { name: 'Toast with butter', cal: 220, p: 5, c: 26, f: 11 },
          ]}); setPhase('result');
        }, 1700);
      }
    }, 350);
    return () => clearInterval(t);
  }, [open, phase]);
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: PULSE.surface, ink: PULSE.ink }}>
      <div style={{ padding: '20px 22px 28px', color: PULSE.ink, background: PULSE.surface, borderTop: `1px solid ${PULSE.hairline}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.primary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Voice log</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
              {phase === 'listen' && 'Listening…'}
              {phase === 'thinking' && 'Understanding…'}
              {phase === 'result' && 'Found 2 items'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: PULSE.surface2, border: 'none', color: PULSE.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.close size={16}/></button>
        </div>
        {phase !== 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 80 }}>
              {Array.from({length:9}).map((_,i) => (
                <div key={i} style={{
                  width: 6, height: 60, background: PULSE.primary, borderRadius: 3,
                  animation: phase === 'listen' ? `tvWave 0.9s ease-in-out ${i*0.07}s infinite` : 'none',
                  opacity: phase === 'thinking' ? 0.4 : 1,
                }}/>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 16, fontWeight: 600, color: transcript ? PULSE.ink : PULSE.ink3, minHeight: 24 }}>
              {transcript || 'Try: "two eggs and toast"'}
            </div>
          </div>
        )}
        {phase === 'result' && (
          <div>
            <div style={{ background: PULSE.surface2, borderRadius: 14, padding: 12, marginBottom: 10, fontSize: 13, color: PULSE.ink2, fontStyle: 'italic' }}>
              "{transcript}"
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.items.map((it, i) => (
                <div key={i} style={{
                  background: PULSE.surface2, borderRadius: 14, padding: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: PULSE.ink3, fontWeight: 600, marginTop: 2 }}>P {it.p}g · C {it.c}g · F {it.f}g</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: PULSE.primary, fontVariantNumeric: 'tabular-nums' }}>{it.cal}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onLogged(result.items); onClose(); }} className="tv-press" style={{
              width: '100%', height: 50, background: PULSE.primary, color: '#0b0d0c', border: 'none',
              borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 14,
              boxShadow: `0 6px 20px ${PULSE.primaryGlow}`,
            }}>Add all to log</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ───────── ADD FOOD / WORKOUT MODALS ───────── */

function PulseAddFood({ open, onClose, onSave }) {
  const [name, setName] = useState(''); const [meal, setMeal] = useState('Snack');
  const [cal, setCal] = useState(''); const [p, setP] = useState(''); const [c, setC] = useState(''); const [f, setF] = useState('');
  const reset = () => { setName(''); setMeal('Snack'); setCal(''); setP(''); setC(''); setF(''); };
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: PULSE.surface, ink: PULSE.ink }}>
      <div style={{ padding: '20px 22px 28px', color: PULSE.ink, background: PULSE.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Log food</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: PULSE.surface2, border: 'none', color: PULSE.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        <input placeholder="What did you eat?" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {['Breakfast','Lunch','Dinner','Snack'].map((m) => (
            <button key={m} onClick={() => setMeal(m)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: meal === m ? PULSE.primary : PULSE.surface2, color: meal === m ? '#0b0d0c' : PULSE.ink2,
              border: `1px solid ${meal === m ? PULSE.primary : PULSE.hairline}`,
            }}>{m}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <input placeholder="Calories" type="number" value={cal} onChange={(e) => setCal(e.target.value)} style={inputStyle}/>
          <input placeholder="Protein (g)" type="number" value={p} onChange={(e) => setP(e.target.value)} style={inputStyle}/>
          <input placeholder="Carbs (g)" type="number" value={c} onChange={(e) => setC(e.target.value)} style={inputStyle}/>
          <input placeholder="Fat (g)" type="number" value={f} onChange={(e) => setF(e.target.value)} style={inputStyle}/>
        </div>
        <button onClick={() => { if(!name)return; onSave({ name, meal, cal: +cal||0, p: +p||0, c: +c||0, f: +f||0, time: '12:00' }); reset(); onClose(); }} className="tv-press" style={{
          width: '100%', height: 50, marginTop: 14, background: PULSE.primary, color: '#0b0d0c',
          border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>Save</button>
      </div>
    </Modal>
  );
}

function PulseAddWorkout({ open, onClose, onSave }) {
  const [title, setTitle] = useState(''); const [type, setType] = useState('strength'); const [duration, setDuration] = useState(45);
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: PULSE.surface, ink: PULSE.ink }}>
      <div style={{ padding: '20px 22px 28px', color: PULSE.ink, background: PULSE.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>New workout</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: PULSE.surface2, border: 'none', color: PULSE.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        <input placeholder="Workout title (e.g. Push day)" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {['strength','cardio','flexibility','sports'].map((t) => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: type === t ? PULSE.primary : PULSE.surface2, color: type === t ? '#0b0d0c' : PULSE.ink2,
              border: `1px solid ${type === t ? PULSE.primary : PULSE.hairline}`, textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PULSE.ink3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Duration · {duration} min</div>
          <input type="range" min="5" max="120" step="5" value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ width: '100%', accentColor: PULSE.primary }}/>
        </div>
        <button onClick={() => { if(!title) return; onSave({ title, type, duration, exercises: [] }); onClose(); }} className="tv-press" style={{
          width: '100%', height: 50, marginTop: 14, background: PULSE.primary, color: '#0b0d0c',
          border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>Start workout</button>
      </div>
    </Modal>
  );
}

const inputStyle = {
  width: '100%', background: PULSE.surface2, border: `1px solid ${PULSE.hairline}`, borderRadius: 14,
  padding: '14px 16px', color: PULSE.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

/* ───────── ROOT ───────── */

function PulseApp({ __initial }) {
  const init = __initial || {};
  const s = useTrackVibeState();
  const [authed, setAuthed] = useState(init.authed !== undefined ? init.authed : true);
  const [tab, setTab] = useState(init.tab || 'home');
  const [screen, setScreen] = useState(init.screen || null); // overrides tab when set
  const [voiceOpen, setVoiceOpen] = useState(!!init.voiceOpen);
  const [foodOpen, setFoodOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  if (!authed) return (
    <div data-screen-label="Pulse · Auth" style={{ position: 'absolute', inset: 0 }}>
      <PulseAuth onAuth={() => setAuthed(true)} />
    </div>
  );

  let content;
  if (screen) {
    if (screen === 'water') content = <PulseWater s={s} onBack={() => setScreen(null)} />;
    else if (screen === 'weight') content = <PulseWeight s={s} onBack={() => setScreen(null)} />;
    else if (screen === 'sleep') content = <PulseSleep s={s} onBack={() => setScreen(null)} />;
    else if (screen === 'profile') content = <PulseProfile s={s} onBack={() => setScreen(null)} />;
    else if (screen === 'body') { content = <PulseBody s={s} onAddWorkout={() => setWorkoutOpen(true)} />; }
  } else if (tab === 'home') content = <PulseHome s={s} onNavScreen={(scr) => scr === 'body' ? setTab('body') : setScreen(scr)} onAddFood={() => setFoodOpen(true)} onAddWorkout={() => setWorkoutOpen(true)} />;
  else if (tab === 'body') content = <PulseBody s={s} onAddWorkout={() => setWorkoutOpen(true)} />;
  else if (tab === 'energy') content = <PulseEnergy s={s} onAddFood={() => setFoodOpen(true)} onRemove={s.removeFood} />;
  else if (tab === 'goals') content = <PulseGoals s={s} onAddGoal={() => alert('Goal modal — coming up')} />;

  return (
    <div data-screen-label="Pulse · App" style={{ position: 'absolute', inset: 0, background: PULSE.bg }}>
      {content}
      <PulseNav tab={tab} onTab={(t) => { setScreen(null); setTab(t); }} onVoice={() => setVoiceOpen(true)} />
      <PulseVoice open={voiceOpen} onClose={() => setVoiceOpen(false)} onLogged={(items) => items.forEach((i) => s.addFood({ ...i, meal: 'Breakfast', time: '08:00' }))} />
      <PulseAddFood open={foodOpen} onClose={() => setFoodOpen(false)} onSave={s.addFood} />
      <PulseAddWorkout open={workoutOpen} onClose={() => setWorkoutOpen(false)} onSave={s.addWorkout} />
    </div>
  );
}

window.PulseApp = PulseApp;
