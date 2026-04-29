/* FRESH — Direction 2: Light, vibrant, friendly.
   Warm paper bg, vivid sage-green primary, terracotta heat accents. */

const FRESH = {
  bg: '#f5f1e8',         // warm cream paper
  surface: '#ffffff',
  surface2: '#ebe6d8',
  hairline: 'rgba(40,30,20,0.10)',
  hairline2: 'rgba(40,30,20,0.16)',
  ink: '#1c1f1a',
  ink2: 'rgba(28,31,26,0.66)',
  ink3: 'rgba(28,31,26,0.44)',
  primary: '#2e7d3e',     // vivid forest sage
  primaryLight: '#d4ebd5',
  primaryDeep: '#1f5a2e',
  hot: '#d2643a',
  cool: '#4a86b5',
  yellow: '#dba03a',
  danger: '#c44a4a',
};

function FreshScreen({ children, padBottom = 96 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: FRESH.bg, color: FRESH.ink,
      fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', overflowX: 'hidden',
    }} className="tv-no-scroll">
      <div style={{ paddingBottom: padBottom }}>{children}</div>
    </div>
  );
}

function FreshStatusBar() {
  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 22px 6px', fontSize: 14, fontWeight: 600, color: FRESH.ink, letterSpacing: '-0.01em',
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11" fill={FRESH.ink}><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="4" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={FRESH.ink} strokeWidth="1"><path d="M1 4a10 10 0 0 1 14 0M3.5 6.5a6.5 6.5 0 0 1 9 0M6 9a3 3 0 0 1 4 0" strokeLinecap="round"/></svg>
        <div style={{ width: 25, height: 12, border: `1px solid ${FRESH.ink}`, borderRadius: 3, padding: 1 }}>
          <div style={{ width: '78%', height: '100%', background: FRESH.ink, borderRadius: 1 }}/>
        </div>
      </div>
    </div>
  );
}

function FreshNav({ tab, onTab, onVoice }) {
  const items = [
    { id: 'home', label: 'Home', Icon: Icons.home },
    { id: 'body', label: 'Body', Icon: Icons.dumbbell },
    { id: 'energy', label: 'Energy', Icon: Icons.flame },
    { id: 'goals', label: 'Goals', Icon: Icons.target },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 14px)', pointerEvents: 'none',
    }}>
      <div style={{
        margin: '0 14px 14px', height: 64, background: FRESH.surface,
        border: `1px solid ${FRESH.hairline}`, borderRadius: 22, display: 'flex',
        alignItems: 'center', justifyContent: 'space-around', position: 'relative',
        boxShadow: '0 6px 24px rgba(40,30,20,0.10), 0 1px 3px rgba(40,30,20,0.06)', pointerEvents: 'auto',
      }}>
        {items.slice(0, 2).map(({ id, label, Icon: Ico }) => (
          <button key={id} onClick={() => onTab(id)} className="tv-press"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? FRESH.primary : FRESH.ink2, padding: '8px 14px', minWidth: 56,
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
              color: tab === id ? FRESH.primary : FRESH.ink2, padding: '8px 14px', minWidth: 56,
            }}>
            <Ico size={22} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </button>
        ))}
        <button onClick={onVoice} className="tv-press" style={{
          position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
          width: 60, height: 60, borderRadius: 30,
          background: `linear-gradient(135deg, ${FRESH.primary}, ${FRESH.primaryDeep})`,
          color: '#fff', border: `4px solid ${FRESH.bg}`,
          boxShadow: '0 10px 24px rgba(46,125,62,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icons.mic size={26} sw={2.4} />
        </button>
      </div>
    </div>
  );
}

/* ───── HOME ───── */
function FreshHome({ s, onNavScreen, onAddFood, onAddWorkout }) {
  const calPct = Math.min(s.totals.cal / s.macroGoals.cal, 1);
  return (
    <FreshScreen>
      <FreshStatusBar />
      <div style={{ padding: '6px 22px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: FRESH.ink3, textTransform: 'uppercase' }}>Mon · Apr 27</div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>Hi {s.profile.name}</div>
        </div>
        <button onClick={() => onNavScreen('profile')} className="tv-press" style={{
          width: 42, height: 42, borderRadius: 21, background: FRESH.surface, border: `1px solid ${FRESH.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: FRESH.ink,
        }}><Icons.user size={20} /></button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="tv-card-in" style={{
          background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 28, padding: 22,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(40,30,20,0.04)',
        }}>
          <div style={{
            position: 'absolute', top: -50, right: -40, width: 180, height: 180, borderRadius: '50%',
            background: FRESH.primaryLight, opacity: 0.5, pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: FRESH.primary, textTransform: 'uppercase' }}>Today's fuel</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3 }}>{s.totals.cal} / {s.macroGoals.cal} kcal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, position: 'relative' }}>
            <Ring pct={calPct} size={132} stroke={11} color={FRESH.primary} track={FRESH.surface2}>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 38, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.totals.cal}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: FRESH.ink3, textTransform: 'uppercase', marginTop: 4 }}>kcal in</div>
            </Ring>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Protein', cur: s.totals.p, goal: s.macroGoals.p, color: FRESH.primary },
                { label: 'Carbs', cur: s.totals.c, goal: s.macroGoals.c, color: FRESH.cool },
                { label: 'Fat', cur: s.totals.f, goal: s.macroGoals.f, color: FRESH.yellow },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: FRESH.ink2 }}>{m.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: FRESH.ink }}>{m.cur}<span style={{ color: FRESH.ink3 }}>/{m.goal}g</span></span>
                  </div>
                  <div style={{ height: 5, background: FRESH.surface2, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(m.cur/m.goal*100, 100)}%`, height: '100%', background: m.color, transition: 'width .6s' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <FreshStat icon={<Icons.dumbbell size={18}/>} label="Workouts" big={s.weekWorkouts.reduce((a,b)=>a+b,0)} sub="this week" tint={FRESH.primary} onClick={() => onNavScreen('body')} />
        <FreshStat icon={<Icons.moon size={18}/>} label="Sleep" big={s.sleepHours.toFixed(1)} sub="hrs · last night" tint={FRESH.cool} onClick={() => onNavScreen('sleep')} />
        <FreshStat icon={<Icons.scale size={18}/>} label="Weight" big={s.weightKg.toFixed(1)} sub="kg · -1.9" tint={FRESH.hot} onClick={() => onNavScreen('weight')} />
      </div>

      <div style={{ padding: '18px 22px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>Quick log</h2>
        <span style={{ fontSize: 11, color: FRESH.ink3, fontWeight: 600 }}>Tap to add</span>
      </div>
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FreshQuick label="Log food" Icon={Icons.apple} bg={FRESH.primary} fg="#fff" onClick={onAddFood}/>
        <FreshQuick label="Log workout" Icon={Icons.dumbbell} bg={FRESH.surface} fg={FRESH.ink} border onClick={onAddWorkout}/>
        <FreshQuick label="Water" Icon={Icons.drop} bg={FRESH.surface} fg={FRESH.ink} border onClick={() => onNavScreen('water')} pill={`${s.water}/8`} pillBg={FRESH.surface2}/>
        <FreshQuick label="Sleep" Icon={Icons.moon} bg={FRESH.surface} fg={FRESH.ink} border onClick={() => onNavScreen('sleep')} pill={`${s.sleepHours}h`} pillBg={FRESH.surface2}/>
      </div>

      <div style={{ padding: '18px 16px 0' }}>
        <div style={{
          background: `linear-gradient(95deg, ${FRESH.surface} 0%, #f9e8d8 100%)`,
          border: `1px solid ${FRESH.hairline}`, borderRadius: 20, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: FRESH.hot,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}><Icons.flame size={24} sw={2.2}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Current streak</div>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>12 days <span style={{ fontSize: 13, color: FRESH.ink2, fontFamily: 'Inter', fontWeight: 600 }}>· keep going</span></div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 20, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>This week</div>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 600, marginTop: 2 }}>Calories</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>1,843</div>
              <div style={{ fontSize: 10, color: FRESH.ink3, fontWeight: 600 }}>avg / day</div>
            </div>
          </div>
          <BarChart values={s.weekCals} max={2400} color={FRESH.primary} track={FRESH.surface2} height={70} labels={['M','T','W','T','F','S','S']} />
        </div>
      </div>
    </FreshScreen>
  );
}

function FreshStat({ icon, label, big, sub, tint, onClick }) {
  return (
    <button onClick={onClick} className="tv-press" style={{
      background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 18,
      padding: '12px 12px 10px', textAlign: 'left', cursor: 'pointer', color: FRESH.ink,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ color: tint, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {icon}
        <Icons.chevR size={14} stroke={FRESH.ink3} />
      </div>
      <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{big}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: FRESH.ink3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sub}</div>
    </button>
  );
}
function FreshQuick({ label, Icon: Ico, bg, fg, border, onClick, pill, pillBg }) {
  return (
    <button onClick={onClick} className="tv-press" style={{
      background: bg, color: fg, border: border ? `1px solid ${FRESH.hairline}` : 'none',
      borderRadius: 18, padding: 14, height: 78, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Ico size={22} sw={2}/>
        {pill && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: pillBg ?? 'rgba(255,255,255,0.18)', borderRadius: 8, color: fg }}>{pill}</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</div>
    </button>
  );
}

/* ───── BODY ───── */
function FreshBody({ s, onAddWorkout }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Strength', 'Cardio', 'Flexibility'];
  const filtered = s.workouts.filter((w) => filter === 'All' || w.type.toLowerCase() === filter.toLowerCase());
  return (
    <FreshScreen>
      <FreshStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: FRESH.ink3, textTransform: 'uppercase' }}>Body</div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>Workouts</div>
        </div>
        <button onClick={onAddWorkout} className="tv-press" style={{
          height: 42, padding: '0 16px', borderRadius: 21, background: FRESH.primary, color: '#fff',
          border: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}><Icons.plus size={18} sw={2.4}/>New</button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Goal · 4 / week</div>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32, fontWeight: 600, marginTop: 2 }}><span style={{ color: FRESH.primary }}>3</span><span style={{ color: FRESH.ink3 }}>/4</span></div>
            </div>
            <Ring pct={3/4} size={72} stroke={7} color={FRESH.primary} track={FRESH.surface2}>
              <div style={{ fontSize: 11, fontWeight: 800, color: FRESH.primary }}>75%</div>
            </Ring>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: FRESH.ink3 }}>{d}</div>
                <div style={{ width: 32, height: 32, borderRadius: 10,
                  background: s.weekWorkouts[i] ? FRESH.primary : FRESH.surface2,
                  border: i === 6 ? `2px solid ${FRESH.ink}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.weekWorkouts[i] ? '#fff' : FRESH.ink3,
                }}>{s.weekWorkouts[i] ? <Icons.check size={16} sw={2.6}/> : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }} className="tv-no-scroll">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="tv-press" style={{
            padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${filter === f ? FRESH.primary : FRESH.hairline}`,
            background: filter === f ? FRESH.primary : 'transparent',
            color: filter === f ? '#fff' : FRESH.ink2, whiteSpace: 'nowrap',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((w) => (
          <div key={w.id} className="tv-card-in" style={{
            background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 20, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: w.type === 'cardio' ? `${FRESH.cool}22` : FRESH.primaryLight,
                  color: w.type === 'cardio' ? FRESH.cool : FRESH.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{w.type === 'cardio' ? <Icons.run size={18}/> : <Icons.dumbbell size={18}/>}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
                  <div style={{ fontSize: 11, color: FRESH.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                    {new Date(w.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} · {w.duration} min
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3 }}>{w.exercises.length} ex</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {w.exercises.slice(0, 3).map((ex, i) => (
                <div key={i} style={{
                  fontSize: 11, fontWeight: 600, color: FRESH.ink2,
                  background: FRESH.surface2, padding: '5px 10px', borderRadius: 10,
                }}>{ex.name} <span style={{ color: FRESH.ink3 }}>· {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ''}</span></div>
              ))}
              {w.exercises.length > 3 && (
                <div style={{ fontSize: 11, color: FRESH.ink3, padding: '5px 10px' }}>+{w.exercises.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </FreshScreen>
  );
}

/* ───── ENERGY ───── */
function FreshEnergy({ s, onAddFood, onRemove }) {
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  return (
    <FreshScreen>
      <FreshStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: FRESH.ink3, textTransform: 'uppercase' }}>Energy</div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>Food log</div>
        </div>
        <button onClick={onAddFood} className="tv-press" style={{
          height: 42, padding: '0 16px', borderRadius: 21, background: FRESH.primary, color: '#fff',
          border: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}><Icons.plus size={18} sw={2.4}/>Add</button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Today</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 38, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.totals.cal}</span>
                <span style={{ color: FRESH.ink3, fontWeight: 600 }}>/ {s.macroGoals.cal} kcal</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: FRESH.ink3, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 600, color: FRESH.primary, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{Math.max(0, s.macroGoals.cal - s.totals.cal)}</div>
            </div>
          </div>
          <div style={{ height: 8, background: FRESH.surface2, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(s.totals.cal/s.macroGoals.cal*100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${FRESH.primary}, ${FRESH.primaryDeep})`, transition: 'width .6s' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            {[['Protein', s.totals.p, s.macroGoals.p, FRESH.primary],['Carbs', s.totals.c, s.macroGoals.c, FRESH.cool],['Fat', s.totals.f, s.macroGoals.f, FRESH.yellow]].map(([l,c,g,col]) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}><span style={{ color: col, fontVariantNumeric: 'tabular-nums' }}>{c}</span><span style={{ color: FRESH.ink3 }}>/{g}g</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {meals.map((meal) => {
        const items = s.foods.filter((f) => f.meal === meal);
        const total = items.reduce((a, f) => a + f.cal, 0);
        const MealIcon = meal === 'Dinner' ? Icons.moon : meal === 'Snack' ? Icons.apple : Icons.sun;
        return (
          <div key={meal} style={{ padding: '18px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MealIcon size={16} stroke={FRESH.primary}/>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{meal}</span>
              </div>
              <span style={{ fontSize: 12, color: FRESH.ink3, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{total} kcal</span>
            </div>
            {items.length === 0 ? (
              <button onClick={onAddFood} className="tv-press" style={{
                width: '100%', background: 'transparent', border: `1.5px dashed ${FRESH.hairline2}`,
                borderRadius: 16, padding: 14, color: FRESH.ink3, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><Icons.plus size={14}/> Add to {meal.toLowerCase()}</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((f) => (
                  <div key={f.id} style={{
                    background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 16,
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: FRESH.ink3, marginTop: 2, fontWeight: 600 }}>
                        {f.time} · P {f.p}g · C {f.c}g · F {f.f}g
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: FRESH.primary }}>{f.cal}</div>
                    <button onClick={() => onRemove(f.id)} style={{
                      background: 'none', border: 'none', color: FRESH.ink3, cursor: 'pointer', padding: 4,
                    }}><Icons.trash size={16}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </FreshScreen>
  );
}

/* ───── GOALS ───── */
function FreshGoals({ s, onAddGoal }) {
  return (
    <FreshScreen>
      <FreshStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: FRESH.ink3, textTransform: 'uppercase' }}>Goals</div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>Stay on target</div>
        </div>
        <button onClick={onAddGoal} className="tv-press" style={{
          height: 42, padding: '0 16px', borderRadius: 21, background: FRESH.primary, color: '#fff',
          border: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}><Icons.plus size={18} sw={2.4}/>New</button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {s.goals.map((g) => {
          const pct = g.kind === 'calories' ? (1 - Math.min(g.current / g.target, 1)) : Math.min(g.current / g.target, 1);
          const ok = g.kind === 'calories' ? g.current <= g.target : g.current >= g.target;
          const color = ok ? FRESH.primary : FRESH.yellow;
          const Ico = g.kind === 'calories' ? Icons.flame : g.kind === 'workouts' ? Icons.dumbbell : Icons.moon;
          return (
            <div key={g.id} className="tv-card-in" style={{
              background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Ring pct={pct} size={64} stroke={6} color={color} track={FRESH.surface2}>
                  <Ico size={20} stroke={color}/>
                </Ring>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{g.period}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: FRESH.ink2, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color, fontWeight: 700 }}>{g.current}</span> / {g.target} {g.kind === 'calories' ? 'kcal' : g.kind === 'workouts' ? 'sessions' : 'hrs'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </FreshScreen>
  );
}

/* ───── SHEETS (water/weight/sleep/profile) ───── */
function FreshSheet({ title, onBack, children }) {
  return (
    <FreshScreen>
      <FreshStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} className="tv-press" style={{
          width: 40, height: 40, borderRadius: 20, background: FRESH.surface, border: `1px solid ${FRESH.hairline}`,
          color: FRESH.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Icons.chevL size={18}/></button>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
      </div>
      <div style={{ padding: '0 16px' }}>{children}</div>
    </FreshScreen>
  );
}

function FreshWater({ s, onBack }) {
  return (
    <FreshSheet title="Water" onBack={onBack}>
      <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 22, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.cool, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Today</div>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 64, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', marginTop: 4, color: FRESH.cool, lineHeight: 1 }}>{s.water}<span style={{ color: FRESH.ink3, fontSize: 28 }}>/8</span></div>
        <div style={{ fontSize: 13, color: FRESH.ink2, fontWeight: 600, marginTop: 6 }}>{s.water * 250} ml</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          {Array.from({length:8}).map((_,i)=>(
            <button key={i} onClick={() => s.setWater(i + 1 <= s.water ? i : i + 1)} className="tv-press" style={{
              width: 36, height: 48, borderRadius: 10, cursor: 'pointer',
              background: i < s.water ? FRESH.cool : 'transparent',
              border: `1.5px solid ${i < s.water ? FRESH.cool : FRESH.hairline2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i < s.water ? '#fff' : FRESH.ink3,
            }}><Icons.drop size={16} sw={2}/></button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center' }}>
          <button onClick={() => s.setWater(Math.max(0, s.water - 1))} className="tv-press" style={{ width: 48, height: 48, borderRadius: 24, background: FRESH.surface2, border: `1px solid ${FRESH.hairline}`, color: FRESH.ink, fontWeight: 800, cursor: 'pointer' }}>−</button>
          <button onClick={() => s.setWater(Math.min(12, s.water + 1))} className="tv-press" style={{ width: 48, height: 48, borderRadius: 24, background: FRESH.cool, color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </FreshSheet>
  );
}

function FreshWeight({ s, onBack }) {
  const [val, setVal] = useState(s.weightKg);
  return (
    <FreshSheet title="Weight" onBack={onBack}>
      <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Current</div>
            <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 40, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.weightKg.toFixed(1)} <span style={{ fontSize: 16, color: FRESH.ink3, fontFamily: 'Inter', fontWeight: 600 }}>kg</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3 }}>Target</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: FRESH.primary }}>{s.profile.targetKg} kg</div>
          </div>
        </div>
        <Sparkline values={s.weightHistory} color={FRESH.primary} fill={`${FRESH.primary}1f`} width={300} height={70} />
      </div>
      <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 18, marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Log new entry</div>
        <input type="number" step="0.1" value={val} onChange={(e) => setVal(parseFloat(e.target.value) || 0)} style={{
          width: '100%', background: FRESH.surface2, border: `1px solid ${FRESH.hairline}`, borderRadius: 14,
          padding: '14px 16px', color: FRESH.ink, fontSize: 18, fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box',
        }} />
        <button onClick={() => { s.setWeightKg(val); s.setWeightHistory([...s.weightHistory.slice(1), val]); onBack(); }} className="tv-press" style={{
          width: '100%', marginTop: 10, height: 48, background: FRESH.primary, color: '#fff', border: 'none',
          borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>Save weight</button>
      </div>
    </FreshSheet>
  );
}

function FreshSleep({ s, onBack }) {
  return (
    <FreshSheet title="Sleep" onBack={onBack}>
      <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 22, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.cool, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Last night</div>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 56, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', color: FRESH.ink, marginTop: 4, lineHeight: 1 }}>{s.sleepHours.toFixed(1)}<span style={{ fontSize: 22, color: FRESH.ink3, fontFamily: 'Inter', fontWeight: 600 }}>h</span></div>
        <div style={{ fontSize: 13, color: FRESH.ink2, fontWeight: 600, marginTop: 6 }}>11:14 pm → 6:25 am</div>
        <div style={{ marginTop: 18 }}>
          <input type="range" min="0" max="12" step="0.25" value={s.sleepHours} onChange={(e) => s.setSleepHours(parseFloat(e.target.value))} style={{ width: '100%', accentColor: FRESH.cool }} />
        </div>
      </div>
      <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 22, padding: 18, marginTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Past 7 days</div>
        <BarChart values={s.weekSleep} max={10} color={FRESH.cool} track={FRESH.surface2} height={70} labels={['M','T','W','T','F','S','S']} />
      </div>
    </FreshSheet>
  );
}

function FreshProfile({ s, onBack }) {
  const rows = [
    { label: 'Name', value: s.profile.name },
    { label: 'Height', value: `${s.profile.heightCm} cm` },
    { label: 'Target weight', value: `${s.profile.targetKg} kg` },
    { label: 'Activity level', value: s.profile.activity },
  ];
  return (
    <FreshSheet title="Profile" onBack={onBack}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 18px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: `linear-gradient(135deg, ${FRESH.primary}, ${FRESH.primaryDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 24, letterSpacing: '-0.02em',
        }}>{s.profile.name[0]}</div>
        <div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 600 }}>{s.profile.name}</div>
          <div style={{ fontSize: 12, color: FRESH.ink3, fontWeight: 600 }}>Member since Jan 2026</div>
        </div>
      </div>
      <div style={{ background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 18, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${FRESH.hairline}` : 'none' }}>
            <span style={{ color: FRESH.ink2, fontSize: 13, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 18, overflow: 'hidden' }}>
        {['Notifications', 'Dark mode', 'Privacy', 'Sign out'].map((r, i) => (
          <button key={r} className="tv-press" style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', padding: '14px 16px',
            borderBottom: i < 3 ? `1px solid ${FRESH.hairline}` : 'none', background: 'none', border: 'none',
            color: r === 'Sign out' ? FRESH.danger : FRESH.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{r}<Icons.chevR size={16} stroke={FRESH.ink3}/></button>
        ))}
      </div>
    </FreshSheet>
  );
}

function FreshAuth({ onAuth }) {
  const [mode, setMode] = useState('login');
  return (
    <FreshScreen padBottom={20}>
      <FreshStatusBar />
      <div style={{ padding: '40px 28px 0', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `linear-gradient(135deg, ${FRESH.primary}, ${FRESH.primaryDeep})`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}><Icons.bolt size={32} sw={2.4}/></div>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 18 }}>TrackVibe</div>
        <div style={{ fontSize: 14, color: FRESH.ink2, marginTop: 6 }}>Body, energy & goals — in one place.</div>
      </div>
      <div style={{ padding: '32px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 14 }}>
          {['login', 'signup'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: 10, borderRadius: 10, background: mode === m ? FRESH.primary : 'transparent',
              color: mode === m ? '#fff' : FRESH.ink2, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>{m === 'login' ? 'Log in' : 'Sign up'}</button>
          ))}
        </div>
        <input placeholder="Email" defaultValue="alex@trackvibe.app" style={{
          background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 14, padding: '14px 16px',
          color: FRESH.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }} />
        <input placeholder="Password" type="password" defaultValue="••••••••" style={{
          background: FRESH.surface, border: `1px solid ${FRESH.hairline}`, borderRadius: 14, padding: '14px 16px',
          color: FRESH.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }} />
        <button onClick={onAuth} className="tv-press" style={{
          height: 50, marginTop: 6, background: FRESH.primary, color: '#fff', border: 'none',
          borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(46,125,62,0.25)',
        }}>{mode === 'login' ? 'Continue' : 'Create account'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: FRESH.ink3, fontSize: 11, fontWeight: 600, margin: '8px 0' }}>
          <div style={{ flex: 1, height: 1, background: FRESH.hairline }}/>OR<div style={{ flex: 1, height: 1, background: FRESH.hairline }}/>
        </div>
        <button onClick={onAuth} className="tv-press" style={{
          height: 48, background: FRESH.surface, color: FRESH.ink, border: `1px solid ${FRESH.hairline}`,
          borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}><Icons.google size={18} stroke="none" fill={FRESH.ink}/>Continue with Google</button>
      </div>
    </FreshScreen>
  );
}

/* ───── VOICE / ADD MODALS ───── */
function FreshVoice({ open, onClose, onLogged }) {
  const [phase, setPhase] = useState('listen');
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
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: FRESH.surface, ink: FRESH.ink }}>
      <div style={{ padding: '20px 22px 28px', color: FRESH.ink, background: FRESH.surface, borderTop: `1px solid ${FRESH.hairline}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.primary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Voice log</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, marginTop: 2 }}>
              {phase === 'listen' && 'Listening…'}
              {phase === 'thinking' && 'Understanding…'}
              {phase === 'result' && 'Found 2 items'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: FRESH.surface2, border: 'none', color: FRESH.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        {phase !== 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 80 }}>
              {Array.from({length:9}).map((_,i) => (
                <div key={i} style={{
                  width: 6, height: 60, background: FRESH.primary, borderRadius: 3,
                  animation: phase === 'listen' ? `tvWave 0.9s ease-in-out ${i*0.07}s infinite` : 'none',
                  opacity: phase === 'thinking' ? 0.4 : 1,
                }}/>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 16, fontWeight: 600, color: transcript ? FRESH.ink : FRESH.ink3, minHeight: 24 }}>
              {transcript || 'Try: "two eggs and toast"'}
            </div>
          </div>
        )}
        {phase === 'result' && (
          <div>
            <div style={{ background: FRESH.surface2, borderRadius: 14, padding: 12, marginBottom: 10, fontSize: 13, color: FRESH.ink2, fontStyle: 'italic' }}>
              "{transcript}"
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.items.map((it, i) => (
                <div key={i} style={{
                  background: FRESH.surface2, borderRadius: 14, padding: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: FRESH.ink3, fontWeight: 600, marginTop: 2 }}>P {it.p}g · C {it.c}g · F {it.f}g</div>
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 20, color: FRESH.primary, fontVariantNumeric: 'tabular-nums' }}>{it.cal}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onLogged(result.items); onClose(); }} className="tv-press" style={{
              width: '100%', height: 50, background: FRESH.primary, color: '#fff', border: 'none',
              borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 14,
            }}>Add all to log</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FreshAddFood({ open, onClose, onSave }) {
  const [name, setName] = useState(''); const [meal, setMeal] = useState('Snack');
  const [cal, setCal] = useState(''); const [p, setP] = useState(''); const [c, setC] = useState(''); const [f, setF] = useState('');
  const inp = {
    width: '100%', background: FRESH.surface2, border: `1px solid ${FRESH.hairline}`, borderRadius: 14,
    padding: '14px 16px', color: FRESH.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: FRESH.surface, ink: FRESH.ink }}>
      <div style={{ padding: '20px 22px 28px', color: FRESH.ink, background: FRESH.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 }}>Log food</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: FRESH.surface2, border: 'none', color: FRESH.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        <input placeholder="What did you eat?" value={name} onChange={(e) => setName(e.target.value)} style={inp} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {['Breakfast','Lunch','Dinner','Snack'].map((m) => (
            <button key={m} onClick={() => setMeal(m)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: meal === m ? FRESH.primary : FRESH.surface2, color: meal === m ? '#fff' : FRESH.ink2,
              border: `1px solid ${meal === m ? FRESH.primary : FRESH.hairline}`,
            }}>{m}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <input placeholder="Calories" type="number" value={cal} onChange={(e) => setCal(e.target.value)} style={inp}/>
          <input placeholder="Protein (g)" type="number" value={p} onChange={(e) => setP(e.target.value)} style={inp}/>
          <input placeholder="Carbs (g)" type="number" value={c} onChange={(e) => setC(e.target.value)} style={inp}/>
          <input placeholder="Fat (g)" type="number" value={f} onChange={(e) => setF(e.target.value)} style={inp}/>
        </div>
        <button onClick={() => { if(!name)return; onSave({ name, meal, cal: +cal||0, p: +p||0, c: +c||0, f: +f||0, time: '12:00' }); onClose(); }} className="tv-press" style={{
          width: '100%', height: 50, marginTop: 14, background: FRESH.primary, color: '#fff',
          border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>Save</button>
      </div>
    </Modal>
  );
}

function FreshAddWorkout({ open, onClose, onSave }) {
  const [title, setTitle] = useState(''); const [type, setType] = useState('strength'); const [duration, setDuration] = useState(45);
  const inp = {
    width: '100%', background: FRESH.surface2, border: `1px solid ${FRESH.hairline}`, borderRadius: 14,
    padding: '14px 16px', color: FRESH.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: FRESH.surface, ink: FRESH.ink }}>
      <div style={{ padding: '20px 22px 28px', color: FRESH.ink, background: FRESH.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600 }}>New workout</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, background: FRESH.surface2, border: 'none', color: FRESH.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        <input placeholder="Workout title (e.g. Push day)" value={title} onChange={(e) => setTitle(e.target.value)} style={inp} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {['strength','cardio','flexibility','sports'].map((t) => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: type === t ? FRESH.primary : FRESH.surface2, color: type === t ? '#fff' : FRESH.ink2,
              border: `1px solid ${type === t ? FRESH.primary : FRESH.hairline}`, textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: FRESH.ink3, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Duration · {duration} min</div>
          <input type="range" min="5" max="120" step="5" value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ width: '100%', accentColor: FRESH.primary }}/>
        </div>
        <button onClick={() => { if(!title) return; onSave({ title, type, duration, exercises: [] }); onClose(); }} className="tv-press" style={{
          width: '100%', height: 50, marginTop: 14, background: FRESH.primary, color: '#fff',
          border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>Start workout</button>
      </div>
    </Modal>
  );
}

/* ───── ROOT ───── */
function FreshApp({ __initial }) {
  const init = __initial || {};
  const s = useTrackVibeState();
  const [authed, setAuthed] = useState(init.authed !== undefined ? init.authed : true);
  const [tab, setTab] = useState(init.tab || 'home');
  const [screen, setScreen] = useState(init.screen || null);
  const [voiceOpen, setVoiceOpen] = useState(!!init.voiceOpen);
  const [foodOpen, setFoodOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  if (!authed) return (
    <div data-screen-label="Fresh · Auth" style={{ position: 'absolute', inset: 0 }}>
      <FreshAuth onAuth={() => setAuthed(true)} />
    </div>
  );

  let content;
  if (screen === 'water') content = <FreshWater s={s} onBack={() => setScreen(null)} />;
  else if (screen === 'weight') content = <FreshWeight s={s} onBack={() => setScreen(null)} />;
  else if (screen === 'sleep') content = <FreshSleep s={s} onBack={() => setScreen(null)} />;
  else if (screen === 'profile') content = <FreshProfile s={s} onBack={() => setScreen(null)} />;
  else if (tab === 'home') content = <FreshHome s={s} onNavScreen={(scr) => scr === 'body' ? setTab('body') : setScreen(scr)} onAddFood={() => setFoodOpen(true)} onAddWorkout={() => setWorkoutOpen(true)} />;
  else if (tab === 'body') content = <FreshBody s={s} onAddWorkout={() => setWorkoutOpen(true)} />;
  else if (tab === 'energy') content = <FreshEnergy s={s} onAddFood={() => setFoodOpen(true)} onRemove={s.removeFood} />;
  else if (tab === 'goals') content = <FreshGoals s={s} onAddGoal={() => alert('Goal modal')} />;

  return (
    <div data-screen-label="Fresh · App" style={{ position: 'absolute', inset: 0, background: FRESH.bg }}>
      {content}
      <FreshNav tab={tab} onTab={(t) => { setScreen(null); setTab(t); }} onVoice={() => setVoiceOpen(true)} />
      <FreshVoice open={voiceOpen} onClose={() => setVoiceOpen(false)} onLogged={(items) => items.forEach((i) => s.addFood({ ...i, meal: 'Breakfast', time: '08:00' }))} />
      <FreshAddFood open={foodOpen} onClose={() => setFoodOpen(false)} onSave={s.addFood} />
      <FreshAddWorkout open={workoutOpen} onClose={() => setWorkoutOpen(false)} onSave={s.addWorkout} />
    </div>
  );
}

window.FreshApp = FreshApp;
