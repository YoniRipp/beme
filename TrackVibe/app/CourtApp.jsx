/* COURT — Direction 3: Editorial high-contrast.
   Cream paper, bold green blocks, Fraunces display headlines, magazine cards. */

const COURT = {
  bg: '#f0ede4',
  surface: '#ffffff',
  surface2: '#e6e1d3',
  hairline: 'rgba(20,30,20,0.14)',
  hairline2: 'rgba(20,30,20,0.22)',
  ink: '#0d1410',
  ink2: 'rgba(13,20,16,0.62)',
  ink3: 'rgba(13,20,16,0.40)',
  primary: '#0a4d2e',     // deep forest
  primaryLight: '#bce0ca',
  accent: '#7ee05a',      // bright lime accent for highlights
  hot: '#e25530',
  cool: '#3a6cb8',
  yellow: '#e4b94a',
  danger: '#c83c3c',
};

function CourtScreen({ children, padBottom = 96 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: COURT.bg, color: COURT.ink,
      fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', overflowX: 'hidden',
    }} className="tv-no-scroll">
      <div style={{ paddingBottom: padBottom }}>{children}</div>
    </div>
  );
}

function CourtStatusBar() {
  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 22px 6px', fontSize: 14, fontWeight: 700, color: COURT.ink, letterSpacing: '-0.01em',
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11" fill={COURT.ink}><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="4" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={COURT.ink} strokeWidth="1.2"><path d="M1 4a10 10 0 0 1 14 0M3.5 6.5a6.5 6.5 0 0 1 9 0M6 9a3 3 0 0 1 4 0" strokeLinecap="round"/></svg>
        <div style={{ width: 25, height: 12, border: `1px solid ${COURT.ink}`, borderRadius: 3, padding: 1 }}>
          <div style={{ width: '78%', height: '100%', background: COURT.ink, borderRadius: 1 }}/>
        </div>
      </div>
    </div>
  );
}

function CourtNav({ tab, onTab, onVoice }) {
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
        margin: '0 0', height: 80, background: COURT.ink, color: '#fff',
        display: 'grid', gridTemplateColumns: '1fr 1fr 88px 1fr 1fr', alignItems: 'center',
        position: 'relative', pointerEvents: 'auto',
      }}>
        {items.slice(0, 2).map(({ id, label, Icon: Ico }) => (
          <button key={id} onClick={() => onTab(id)} className="tv-press"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? COURT.accent : 'rgba(255,255,255,0.55)', padding: '10px 0',
            }}>
            <Ico size={22} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
          </button>
        ))}
        <div />
        {items.slice(2).map(({ id, label, Icon: Ico }) => (
          <button key={id} onClick={() => onTab(id)} className="tv-press"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? COURT.accent : 'rgba(255,255,255,0.55)', padding: '10px 0',
            }}>
            <Ico size={22} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
          </button>
        ))}
        <button onClick={onVoice} className="tv-press" style={{
          position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
          width: 64, height: 64, borderRadius: 32,
          background: COURT.accent, color: COURT.ink, border: `4px solid ${COURT.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
        }}>
          <Icons.mic size={28} sw={2.4} />
        </button>
      </div>
    </div>
  );
}

/* Section header — editorial */
function CourtTitle({ kicker, title, action }) {
  return (
    <div style={{ padding: '6px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.ink3, textTransform: 'uppercase' }}>{kicker}</div>
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 4, lineHeight: 1 }}>{title}</div>
      </div>
      {action}
    </div>
  );
}

/* ───── HOME ───── */
function CourtHome({ s, onNavScreen, onAddFood, onAddWorkout }) {
  const calPct = Math.min(s.totals.cal / s.macroGoals.cal, 1);
  return (
    <CourtScreen>
      <CourtStatusBar />
      <CourtTitle kicker="Mon · Apr 27"
        title={<span>Hey, <span style={{ fontStyle: 'italic' }}>{s.profile.name}</span></span>}
        action={<button onClick={() => onNavScreen('profile')} className="tv-press" style={{
          width: 42, height: 42, borderRadius: 21, background: COURT.surface, border: `1px solid ${COURT.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COURT.ink,
        }}><Icons.user size={20} /></button>}
      />

      {/* Hero — bold green block */}
      <div style={{ padding: '0 16px' }}>
        <div className="tv-card-in" style={{
          background: COURT.primary, color: '#fff', borderRadius: 4, padding: 22,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.accent, textTransform: 'uppercase' }}>Today's fuel</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.totals.cal} / {s.macroGoals.cal} kcal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 64, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', lineHeight: 0.9 }}>{s.totals.cal}</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: 6 }}>kcal in</div>
            </div>
            <Ring pct={calPct} size={88} stroke={8} color={COURT.accent} track="rgba(255,255,255,0.18)">
              <div style={{ fontSize: 16, fontWeight: 800, color: COURT.accent }}>{Math.round(calPct*100)}%</div>
            </Ring>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Protein', cur: s.totals.p, goal: s.macroGoals.p },
              { label: 'Carbs', cur: s.totals.c, goal: s.macroGoals.c },
              { label: 'Fat', cur: s.totals.f, goal: s.macroGoals.f },
            ].map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.cur}<span style={{ opacity: 0.55 }}>/{m.goal}g</span></span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(m.cur/m.goal*100, 100)}%`, height: '100%', background: COURT.accent, transition: 'width .6s' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <CourtStat icon={<Icons.dumbbell size={18}/>} label="Workouts" big={s.weekWorkouts.reduce((a,b)=>a+b,0)} sub="this week" onClick={() => onNavScreen('body')} />
        <CourtStat icon={<Icons.moon size={18}/>} label="Sleep" big={s.sleepHours.toFixed(1)} sub="last night" onClick={() => onNavScreen('sleep')} />
        <CourtStat icon={<Icons.scale size={18}/>} label="Weight" big={s.weightKg.toFixed(1)} sub="−1.9 kg" onClick={() => onNavScreen('weight')} />
      </div>

      {/* Quick log (editorial — labeled list) */}
      <div style={{ padding: '20px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.ink3, textTransform: 'uppercase' }}>Section 02</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Quick log</div>
        </div>
      </div>
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <CourtQuick label="Log food" Icon={Icons.apple} bg={COURT.ink} fg="#fff" onClick={onAddFood}/>
        <CourtQuick label="Log workout" Icon={Icons.dumbbell} bg={COURT.surface} fg={COURT.ink} border onClick={onAddWorkout}/>
        <CourtQuick label="Water" Icon={Icons.drop} bg={COURT.surface} fg={COURT.ink} border onClick={() => onNavScreen('water')} pill={`${s.water}/8`}/>
        <CourtQuick label="Sleep" Icon={Icons.moon} bg={COURT.surface} fg={COURT.ink} border onClick={() => onNavScreen('sleep')} pill={`${s.sleepHours}h`}/>
      </div>

      {/* Streak — editorial banner */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 4, background: COURT.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: COURT.ink,
          }}><Icons.flame size={28} sw={2.2}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.ink3, textTransform: 'uppercase' }}>Current streak</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Twelve <span style={{ fontStyle: 'italic' }}>days</span></div>
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 600, color: COURT.primary }}>12</div>
        </div>
      </div>

      {/* Weekly bars */}
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.ink3, textTransform: 'uppercase' }}>This week</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, marginTop: 2 }}>Calories</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>1,843</div>
              <div style={{ fontSize: 10, color: COURT.ink3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>avg / day</div>
            </div>
          </div>
          <BarChart values={s.weekCals} max={2400} color={COURT.primary} track={COURT.surface2} height={70} radius={2} labels={['M','T','W','T','F','S','S']} />
        </div>
      </div>
    </CourtScreen>
  );
}

function CourtStat({ icon, label, big, sub, onClick }) {
  return (
    <button onClick={onClick} className="tv-press" style={{
      background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4,
      padding: '12px 12px 10px', textAlign: 'left', cursor: 'pointer', color: COURT.ink,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ color: COURT.primary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {icon}<span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: COURT.ink3, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{big}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: COURT.ink3 }}>{sub}</div>
    </button>
  );
}
function CourtQuick({ label, Icon: Ico, bg, fg, border, onClick, pill }) {
  return (
    <button onClick={onClick} className="tv-press" style={{
      background: bg, color: fg, border: border ? `1px solid ${COURT.hairline}` : 'none',
      borderRadius: 4, padding: 14, height: 78, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Ico size={22} sw={2}/>
        {pill && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: 'rgba(0,0,0,0.06)', color: fg }}>{pill}</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>{label}</div>
    </button>
  );
}

/* ───── BODY ───── */
function CourtBody({ s, onAddWorkout }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Strength', 'Cardio', 'Flexibility'];
  const filtered = s.workouts.filter((w) => filter === 'All' || w.type.toLowerCase() === filter.toLowerCase());
  const newBtn = (
    <button onClick={onAddWorkout} className="tv-press" style={{
      height: 42, padding: '0 16px', borderRadius: 4, background: COURT.ink, color: '#fff',
      border: 'none', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    }}><Icons.plus size={16} sw={2.4}/>New</button>
  );
  return (
    <CourtScreen>
      <CourtStatusBar />
      <CourtTitle kicker="Body" title="Workouts" action={newBtn} />

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: COURT.primary, color: '#fff', borderRadius: 4, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.accent, textTransform: 'uppercase' }}>Goal · 4 / week</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 600, marginTop: 4, lineHeight: 1 }}>3 of 4</div>
            </div>
            <Ring pct={3/4} size={64} stroke={6} color={COURT.accent} track="rgba(255,255,255,0.18)">
              <div style={{ fontSize: 12, fontWeight: 800, color: COURT.accent }}>75%</div>
            </Ring>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em' }}>{d}</div>
                <div style={{ width: 30, height: 30,
                  background: s.weekWorkouts[i] ? COURT.accent : 'rgba(255,255,255,0.12)',
                  border: i === 6 ? `2px solid #fff` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.weekWorkouts[i] ? COURT.ink : 'rgba(255,255,255,0.4)',
                }}>{s.weekWorkouts[i] ? <Icons.check size={14} sw={2.6}/> : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 8px', display: 'flex', gap: 6, overflowX: 'auto' }} className="tv-no-scroll">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="tv-press" style={{
            padding: '8px 14px', borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: 'pointer',
            border: `1px solid ${filter === f ? COURT.ink : COURT.hairline}`,
            background: filter === f ? COURT.ink : 'transparent',
            color: filter === f ? '#fff' : COURT.ink2, whiteSpace: 'nowrap',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((w, idx) => (
          <div key={w.id} className="tv-card-in" style={{
            background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 16,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.ink3, textTransform: 'uppercase' }}>
                  №{String(idx + 1).padStart(2, '0')} · {new Date(w.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>{w.title}</div>
              </div>
              <div style={{
                background: w.type === 'cardio' ? COURT.cool : COURT.primary, color: '#fff',
                fontSize: 10, fontWeight: 800, padding: '4px 10px', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>{w.type}</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: COURT.ink2, fontWeight: 600, marginBottom: 12 }}>
              <span>{w.duration} min</span>
              <span>·</span>
              <span>{w.exercises.length} exercises</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {w.exercises.slice(0, 3).map((ex, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderTop: `1px solid ${COURT.hairline}`, fontSize: 12,
                }}>
                  <span style={{ fontWeight: 600 }}>{ex.name}</span>
                  <span style={{ color: COURT.ink3, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CourtScreen>
  );
}

/* ───── ENERGY ───── */
function CourtEnergy({ s, onAddFood, onRemove }) {
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const addBtn = (
    <button onClick={onAddFood} className="tv-press" style={{
      height: 42, padding: '0 16px', borderRadius: 4, background: COURT.ink, color: '#fff',
      border: 'none', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    }}><Icons.plus size={16} sw={2.4}/>Add</button>
  );
  return (
    <CourtScreen>
      <CourtStatusBar />
      <CourtTitle kicker="Energy" title="Food log" action={addBtn} />

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: COURT.ink, color: '#fff', borderRadius: 4, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.accent, textTransform: 'uppercase' }}>Today</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 44, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{s.totals.cal}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>/ {s.macroGoals.cal} kcal</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: COURT.accent, fontVariantNumeric: 'tabular-nums', marginTop: 2, lineHeight: 1 }}>{Math.max(0, s.macroGoals.cal - s.totals.cal)}</div>
            </div>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(s.totals.cal/s.macroGoals.cal*100, 100)}%`, height: '100%', background: COURT.accent, transition: 'width .6s' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            {[['Protein', s.totals.p, s.macroGoals.p],['Carbs', s.totals.c, s.macroGoals.c],['Fat', s.totals.f, s.macroGoals.f]].map(([l,c,g]) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{c}<span style={{ color: 'rgba(255,255,255,0.45)' }}>/{g}g</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {meals.map((meal) => {
        const items = s.foods.filter((f) => f.meal === meal);
        const total = items.reduce((a, f) => a + f.cal, 0);
        return (
          <div key={meal} style={{ padding: '20px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 8px', borderBottom: `1px solid ${COURT.hairline2}`, marginBottom: 10 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{meal}</div>
              <span style={{ fontSize: 11, color: COURT.ink3, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{total} kcal</span>
            </div>
            {items.length === 0 ? (
              <button onClick={onAddFood} className="tv-press" style={{
                width: '100%', background: 'transparent', border: `1.5px dashed ${COURT.hairline2}`,
                borderRadius: 4, padding: 14, color: COURT.ink3, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>+ Add to {meal.toLowerCase()}</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((f) => (
                  <div key={f.id} style={{
                    background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4,
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: COURT.ink3, marginTop: 2, fontWeight: 600 }}>
                        {f.time} · P {f.p}g · C {f.c}g · F {f.f}g
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 20, fontVariantNumeric: 'tabular-nums', color: COURT.primary }}>{f.cal}</div>
                    <button onClick={() => onRemove(f.id)} style={{
                      background: 'none', border: 'none', color: COURT.ink3, cursor: 'pointer', padding: 4,
                    }}><Icons.trash size={16}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </CourtScreen>
  );
}

/* ───── GOALS ───── */
function CourtGoals({ s, onAddGoal }) {
  const newBtn = (
    <button onClick={onAddGoal} className="tv-press" style={{
      height: 42, padding: '0 16px', borderRadius: 4, background: COURT.ink, color: '#fff',
      border: 'none', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    }}><Icons.plus size={16} sw={2.4}/>New</button>
  );
  return (
    <CourtScreen>
      <CourtStatusBar />
      <CourtTitle kicker="Goals" title="On target" action={newBtn} />
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {s.goals.map((g, idx) => {
          const pct = g.kind === 'calories' ? (1 - Math.min(g.current / g.target, 1)) : Math.min(g.current / g.target, 1);
          const ok = g.kind === 'calories' ? g.current <= g.target : g.current >= g.target;
          const color = ok ? COURT.primary : COURT.yellow;
          const Ico = g.kind === 'calories' ? Icons.flame : g.kind === 'workouts' ? Icons.dumbbell : Icons.moon;
          return (
            <div key={g.id} className="tv-card-in" style={{
              background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Ring pct={pct} size={64} stroke={6} color={color} track={COURT.surface2}>
                  <Ico size={20} stroke={color}/>
                </Ring>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: COURT.ink3, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{g.period} · №{String(idx+1).padStart(2,'0')}</div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: COURT.ink2, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color, fontWeight: 800 }}>{g.current}</span> / {g.target} {g.kind === 'calories' ? 'kcal' : g.kind === 'workouts' ? 'sessions' : 'hrs'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CourtScreen>
  );
}

/* ───── SHEETS ───── */
function CourtSheet({ title, kicker, onBack, children }) {
  return (
    <CourtScreen>
      <CourtStatusBar />
      <div style={{ padding: '6px 22px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} className="tv-press" style={{
          width: 40, height: 40, borderRadius: 4, background: COURT.surface, border: `1px solid ${COURT.hairline}`,
          color: COURT.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><Icons.chevL size={18}/></button>
        <div>
          {kicker && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: COURT.ink3, textTransform: 'uppercase' }}>{kicker}</div>}
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
        </div>
      </div>
      <div style={{ padding: '0 16px' }}>{children}</div>
    </CourtScreen>
  );
}

function CourtWater({ s, onBack }) {
  return (
    <CourtSheet title="Water" kicker="Hydration" onBack={onBack}>
      <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 22, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 80, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', color: COURT.cool, lineHeight: 1 }}>{s.water}<span style={{ color: COURT.ink3, fontSize: 32 }}>/8</span></div>
        <div style={{ fontSize: 12, color: COURT.ink2, fontWeight: 700, marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.water * 250} ml today</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          {Array.from({length:8}).map((_,i)=>(
            <button key={i} onClick={() => s.setWater(i + 1 <= s.water ? i : i + 1)} className="tv-press" style={{
              width: 36, height: 48, borderRadius: 4, cursor: 'pointer',
              background: i < s.water ? COURT.cool : 'transparent',
              border: `1.5px solid ${i < s.water ? COURT.cool : COURT.hairline2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i < s.water ? '#fff' : COURT.ink3,
            }}><Icons.drop size={16} sw={2}/></button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center' }}>
          <button onClick={() => s.setWater(Math.max(0, s.water - 1))} className="tv-press" style={{ width: 48, height: 48, borderRadius: 4, background: COURT.surface2, border: `1px solid ${COURT.hairline}`, color: COURT.ink, fontWeight: 800, cursor: 'pointer' }}>−</button>
          <button onClick={() => s.setWater(Math.min(12, s.water + 1))} className="tv-press" style={{ width: 48, height: 48, borderRadius: 4, background: COURT.cool, color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </CourtSheet>
  );
}

function CourtWeight({ s, onBack }) {
  const [val, setVal] = useState(s.weightKg);
  return (
    <CourtSheet title="Weight" kicker="Body · Metric" onBack={onBack}>
      <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: COURT.ink3, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Current</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 44, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.weightKg.toFixed(1)} <span style={{ fontSize: 16, color: COURT.ink3, fontFamily: 'Inter', fontWeight: 600 }}>kg</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: COURT.ink3, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Target</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: COURT.primary }}>{s.profile.targetKg} kg</div>
          </div>
        </div>
        <Sparkline values={s.weightHistory} color={COURT.primary} fill={`${COURT.primary}1f`} width={300} height={70} />
      </div>
      <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 18, marginTop: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: COURT.ink3, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>Log new entry</div>
        <input type="number" step="0.1" value={val} onChange={(e) => setVal(parseFloat(e.target.value) || 0)} style={{
          width: '100%', background: COURT.surface2, border: `1px solid ${COURT.hairline}`, borderRadius: 4,
          padding: '14px 16px', color: COURT.ink, fontSize: 18, fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box',
        }} />
        <button onClick={() => { s.setWeightKg(val); s.setWeightHistory([...s.weightHistory.slice(1), val]); onBack(); }} className="tv-press" style={{
          width: '100%', marginTop: 10, height: 48, background: COURT.ink, color: '#fff', border: 'none',
          borderRadius: 4, fontWeight: 800, fontSize: 13, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Save weight</button>
      </div>
    </CourtSheet>
  );
}

function CourtSleep({ s, onBack }) {
  return (
    <CourtSheet title="Sleep" kicker="Last night" onBack={onBack}>
      <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 22, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 64, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', color: COURT.ink, lineHeight: 1 }}>{s.sleepHours.toFixed(1)}<span style={{ fontSize: 22, color: COURT.ink3, fontFamily: 'Inter', fontWeight: 600 }}>h</span></div>
        <div style={{ fontSize: 12, color: COURT.ink2, fontWeight: 600, marginTop: 6 }}>11:14 pm → 6:25 am</div>
        <div style={{ marginTop: 18 }}>
          <input type="range" min="0" max="12" step="0.25" value={s.sleepHours} onChange={(e) => s.setSleepHours(parseFloat(e.target.value))} style={{ width: '100%', accentColor: COURT.primary }} />
        </div>
      </div>
      <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: 18, marginTop: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: COURT.ink3, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>Past 7 nights</div>
        <BarChart values={s.weekSleep} max={10} color={COURT.primary} track={COURT.surface2} height={70} radius={2} labels={['M','T','W','T','F','S','S']} />
      </div>
    </CourtSheet>
  );
}

function CourtProfile({ s, onBack }) {
  const rows = [
    { label: 'Name', value: s.profile.name },
    { label: 'Height', value: `${s.profile.heightCm} cm` },
    { label: 'Target weight', value: `${s.profile.targetKg} kg` },
    { label: 'Activity level', value: s.profile.activity },
  ];
  return (
    <CourtSheet title="Profile" kicker="Account" onBack={onBack}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 18px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 4, background: COURT.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 28, letterSpacing: '-0.02em',
        }}>{s.profile.name[0]}</div>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600 }}>{s.profile.name}</div>
          <div style={{ fontSize: 11, color: COURT.ink3, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Member · Jan 2026</div>
        </div>
      </div>
      <div style={{ background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${COURT.hairline}` : 'none' }}>
            <span style={{ color: COURT.ink2, fontSize: 13, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, overflow: 'hidden' }}>
        {['Notifications', 'Dark mode', 'Privacy', 'Sign out'].map((r, i) => (
          <button key={r} className="tv-press" style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', padding: '14px 16px',
            borderBottom: i < 3 ? `1px solid ${COURT.hairline}` : 'none', background: 'none', border: 'none',
            color: r === 'Sign out' ? COURT.danger : COURT.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{r}<Icons.chevR size={16} stroke={COURT.ink3}/></button>
        ))}
      </div>
    </CourtSheet>
  );
}

function CourtAuth({ onAuth }) {
  const [mode, setMode] = useState('login');
  return (
    <CourtScreen padBottom={20}>
      <CourtStatusBar />
      <div style={{ padding: '40px 28px 0', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 4, background: COURT.primary,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: COURT.accent,
        }}><Icons.bolt size={32} sw={2.4}/></div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 18 }}>TrackVibe</div>
        <div style={{ fontSize: 13, color: COURT.ink2, marginTop: 6, letterSpacing: '0.04em' }}>Body · Energy · Goals — together.</div>
      </div>
      <div style={{ padding: '32px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 0, padding: 0, background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4 }}>
          {['login', 'signup'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: 12, background: mode === m ? COURT.ink : 'transparent',
              color: mode === m ? '#fff' : COURT.ink2, border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>{m === 'login' ? 'Log in' : 'Sign up'}</button>
          ))}
        </div>
        <input placeholder="Email" defaultValue="alex@trackvibe.app" style={{
          background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: '14px 16px',
          color: COURT.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }} />
        <input placeholder="Password" type="password" defaultValue="••••••••" style={{
          background: COURT.surface, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: '14px 16px',
          color: COURT.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }} />
        <button onClick={onAuth} className="tv-press" style={{
          height: 50, marginTop: 6, background: COURT.ink, color: '#fff', border: 'none',
          borderRadius: 4, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{mode === 'login' ? 'Continue →' : 'Create account →'}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COURT.ink3, fontSize: 11, fontWeight: 700, margin: '8px 0', letterSpacing: '0.12em' }}>
          <div style={{ flex: 1, height: 1, background: COURT.hairline }}/>OR<div style={{ flex: 1, height: 1, background: COURT.hairline }}/>
        </div>
        <button onClick={onAuth} className="tv-press" style={{
          height: 48, background: COURT.surface, color: COURT.ink, border: `1px solid ${COURT.hairline}`,
          borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}><Icons.google size={18} stroke="none" fill={COURT.ink}/>Continue with Google</button>
      </div>
    </CourtScreen>
  );
}

/* ───── VOICE / ADD ───── */
function CourtVoice({ open, onClose, onLogged }) {
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
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: COURT.surface, ink: COURT.ink }}>
      <div style={{ padding: '20px 22px 28px', color: COURT.ink, background: COURT.surface, borderTop: `2px solid ${COURT.ink}`, borderRadius: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: COURT.primary, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Voice log</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>
              {phase === 'listen' && 'Listening…'}
              {phase === 'thinking' && 'Understanding…'}
              {phase === 'result' && 'Found 2 items'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 4, background: COURT.surface2, border: 'none', color: COURT.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        {phase !== 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 80 }}>
              {Array.from({length:9}).map((_,i) => (
                <div key={i} style={{
                  width: 6, height: 60, background: COURT.primary,
                  animation: phase === 'listen' ? `tvWave 0.9s ease-in-out ${i*0.07}s infinite` : 'none',
                  opacity: phase === 'thinking' ? 0.4 : 1,
                }}/>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 16, fontWeight: 600, color: transcript ? COURT.ink : COURT.ink3, minHeight: 24 }}>
              {transcript || 'Try: "two eggs and toast"'}
            </div>
          </div>
        )}
        {phase === 'result' && (
          <div>
            <div style={{ background: COURT.surface2, borderRadius: 0, padding: 12, marginBottom: 10, fontSize: 13, color: COURT.ink2, fontStyle: 'italic', borderLeft: `3px solid ${COURT.primary}` }}>
              "{transcript}"
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.items.map((it, i) => (
                <div key={i} style={{
                  background: COURT.surface2, borderRadius: 4, padding: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: COURT.ink3, fontWeight: 600, marginTop: 2 }}>P {it.p}g · C {it.c}g · F {it.f}g</div>
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 22, color: COURT.primary, fontVariantNumeric: 'tabular-nums' }}>{it.cal}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onLogged(result.items); onClose(); }} className="tv-press" style={{
              width: '100%', height: 50, background: COURT.ink, color: '#fff', border: 'none',
              borderRadius: 4, fontWeight: 800, fontSize: 13, cursor: 'pointer', marginTop: 14,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Add all to log →</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CourtAddFood({ open, onClose, onSave }) {
  const [name, setName] = useState(''); const [meal, setMeal] = useState('Snack');
  const [cal, setCal] = useState(''); const [p, setP] = useState(''); const [c, setC] = useState(''); const [f, setF] = useState('');
  const inp = { width: '100%', background: COURT.surface2, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: '14px 16px', color: COURT.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: COURT.surface, ink: COURT.ink }}>
      <div style={{ padding: '20px 22px 28px', color: COURT.ink, background: COURT.surface, borderTop: `2px solid ${COURT.ink}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600 }}>Log food</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 4, background: COURT.surface2, border: 'none', color: COURT.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        <input placeholder="What did you eat?" value={name} onChange={(e) => setName(e.target.value)} style={inp} />
        <div style={{ display: 'flex', gap: 0, marginTop: 10, border: `1px solid ${COURT.hairline}` }}>
          {['Breakfast','Lunch','Dinner','Snack'].map((m) => (
            <button key={m} onClick={() => setMeal(m)} style={{
              flex: 1, padding: '10px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              background: meal === m ? COURT.ink : 'transparent', color: meal === m ? '#fff' : COURT.ink2,
              border: 'none', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{m}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <input placeholder="Calories" type="number" value={cal} onChange={(e) => setCal(e.target.value)} style={inp}/>
          <input placeholder="Protein (g)" type="number" value={p} onChange={(e) => setP(e.target.value)} style={inp}/>
          <input placeholder="Carbs (g)" type="number" value={c} onChange={(e) => setC(e.target.value)} style={inp}/>
          <input placeholder="Fat (g)" type="number" value={f} onChange={(e) => setF(e.target.value)} style={inp}/>
        </div>
        <button onClick={() => { if(!name)return; onSave({ name, meal, cal: +cal||0, p: +p||0, c: +c||0, f: +f||0, time: '12:00' }); onClose(); }} className="tv-press" style={{
          width: '100%', height: 50, marginTop: 14, background: COURT.ink, color: '#fff',
          border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Save →</button>
      </div>
    </Modal>
  );
}

function CourtAddWorkout({ open, onClose, onSave }) {
  const [title, setTitle] = useState(''); const [type, setType] = useState('strength'); const [duration, setDuration] = useState(45);
  const inp = { width: '100%', background: COURT.surface2, border: `1px solid ${COURT.hairline}`, borderRadius: 4, padding: '14px 16px', color: COURT.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  return (
    <Modal open={open} onClose={onClose} side="bottom" theme={{ surface: COURT.surface, ink: COURT.ink }}>
      <div style={{ padding: '20px 22px 28px', color: COURT.ink, background: COURT.surface, borderTop: `2px solid ${COURT.ink}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600 }}>New workout</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 4, background: COURT.surface2, border: 'none', color: COURT.ink, cursor: 'pointer' }}><Icons.close size={16}/></button>
        </div>
        <input placeholder="Workout title" value={title} onChange={(e) => setTitle(e.target.value)} style={inp} />
        <div style={{ display: 'flex', gap: 0, marginTop: 10, border: `1px solid ${COURT.hairline}` }}>
          {['strength','cardio','flexibility','sports'].map((t) => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: '10px 4px', fontSize: 10, fontWeight: 800, cursor: 'pointer',
              background: type === t ? COURT.ink : 'transparent', color: type === t ? '#fff' : COURT.ink2,
              border: 'none', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: COURT.ink3, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Duration · {duration} min</div>
          <input type="range" min="5" max="120" step="5" value={duration} onChange={(e) => setDuration(+e.target.value)} style={{ width: '100%', accentColor: COURT.primary }}/>
        </div>
        <button onClick={() => { if(!title) return; onSave({ title, type, duration, exercises: [] }); onClose(); }} className="tv-press" style={{
          width: '100%', height: 50, marginTop: 14, background: COURT.ink, color: '#fff',
          border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Start →</button>
      </div>
    </Modal>
  );
}

/* ───── ROOT ───── */
function CourtApp({ __initial }) {
  const init = __initial || {};
  const s = useTrackVibeState();
  const [authed, setAuthed] = useState(init.authed !== undefined ? init.authed : true);
  const [tab, setTab] = useState(init.tab || 'home');
  const [screen, setScreen] = useState(init.screen || null);
  const [voiceOpen, setVoiceOpen] = useState(!!init.voiceOpen);
  const [foodOpen, setFoodOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  if (!authed) return (
    <div data-screen-label="Court · Auth" style={{ position: 'absolute', inset: 0 }}>
      <CourtAuth onAuth={() => setAuthed(true)} />
    </div>
  );

  let content;
  if (screen === 'water') content = <CourtWater s={s} onBack={() => setScreen(null)} />;
  else if (screen === 'weight') content = <CourtWeight s={s} onBack={() => setScreen(null)} />;
  else if (screen === 'sleep') content = <CourtSleep s={s} onBack={() => setScreen(null)} />;
  else if (screen === 'profile') content = <CourtProfile s={s} onBack={() => setScreen(null)} />;
  else if (tab === 'home') content = <CourtHome s={s} onNavScreen={(scr) => scr === 'body' ? setTab('body') : setScreen(scr)} onAddFood={() => setFoodOpen(true)} onAddWorkout={() => setWorkoutOpen(true)} />;
  else if (tab === 'body') content = <CourtBody s={s} onAddWorkout={() => setWorkoutOpen(true)} />;
  else if (tab === 'energy') content = <CourtEnergy s={s} onAddFood={() => setFoodOpen(true)} onRemove={s.removeFood} />;
  else if (tab === 'goals') content = <CourtGoals s={s} onAddGoal={() => alert('Goal modal')} />;

  return (
    <div data-screen-label="Court · App" style={{ position: 'absolute', inset: 0, background: COURT.bg }}>
      {content}
      <CourtNav tab={tab} onTab={(t) => { setScreen(null); setTab(t); }} onVoice={() => setVoiceOpen(true)} />
      <CourtVoice open={voiceOpen} onClose={() => setVoiceOpen(false)} onLogged={(items) => items.forEach((i) => s.addFood({ ...i, meal: 'Breakfast', time: '08:00' }))} />
      <CourtAddFood open={foodOpen} onClose={() => setFoodOpen(false)} onSave={s.addFood} />
      <CourtAddWorkout open={workoutOpen} onClose={() => setWorkoutOpen(false)} onSave={s.addWorkout} />
    </div>
  );
}

window.CourtApp = CourtApp;
