import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Monitor, Smartphone } from 'lucide-react';

export function HeroSection() {
  const scrollToPricing = () => {
    document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section aria-label="Hero" className="relative flex min-h-screen items-center pt-16 bg-primary">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
              One app for your
              <br />
              <span className="text-primary-foreground/90">money, body,</span>
              <br />
              and daily life.
            </h1>

            <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-primary-foreground/80">
              BeMe brings your finances, fitness, energy, schedule, and goals into a single clean
              dashboard — with an AI assistant when you need it.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-primary transition-all hover:bg-white/90"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={scrollToPricing}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-foreground bg-transparent px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/10"
              >
                See pricing
              </button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-primary-foreground/80">
              <div className="flex items-center gap-2 text-sm">
                <Monitor className="h-4 w-4 text-primary-foreground" />
                Works in any browser
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-primary-foreground" />
                Optimized for mobile
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div
              className="relative overflow-hidden rounded-2xl shadow-2xl ring-2 ring-white/20"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div
                className="flex items-center gap-1.5 border-b px-4 py-3"
                style={{
                  backgroundColor: '#e8e8e0',
                  borderBottomColor: '#ddddd5',
                }}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#d07070' }}
                />
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#d4b860' }}
                />
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: '#6a8f5f' }}
                />
                <div className="mx-3 flex-1">
                  <div
                    className="flex h-5 items-center justify-center rounded-md text-[10px]"
                    style={{ backgroundColor: '#f0f0e8', color: '#aaaaaa' }}
                  >
                    app.beme.life
                  </div>
                </div>
              </div>

              <div
                className="flex"
                style={{ backgroundColor: '#f0f0e8', minHeight: '320px' }}
              >
                <div
                  className="w-36 flex-shrink-0 space-y-1 p-4"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRight: '1px solid #ddddd5',
                  }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded"
                      style={{ backgroundColor: '#6b8c65' }}
                    >
                      <span className="text-[8px] font-bold text-white">B</span>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold" style={{ color: '#2c2c2c' }}>
                        BeMe
                      </p>
                      <p className="text-[6px]" style={{ color: '#7a7a72' }}>
                        LIFE BALANCE
                      </p>
                    </div>
                  </div>
                  {[
                    'Dashboard',
                    'Money',
                    'Body',
                    'Energy',
                    'Schedule',
                    'Goals',
                    'Insights',
                  ].map((item, i) => (
                    <div
                      key={item}
                      className="rounded-md px-2 py-1.5 text-[9px] font-medium"
                      style={{
                        backgroundColor: i === 0 ? '#d4e4cf' : 'transparent',
                        color: i === 0 ? '#6b8c65' : '#7a7a72',
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="flex-1 p-5">
                  <p className="mb-4 text-[10px] font-semibold" style={{ color: '#2c2c2c' }}>
                    Dashboard
                  </p>
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {[
                      {
                        label: 'Balance',
                        val: '$4,280',
                        color: '#d4e4cf',
                        tc: '#6b8c65',
                      },
                      {
                        label: 'Workouts',
                        val: '12',
                        color: '#dce8f5',
                        tc: '#3a6090',
                      },
                      {
                        label: 'Energy',
                        val: '82%',
                        color: '#fdf0d4',
                        tc: '#9a7030',
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg p-2"
                        style={{ backgroundColor: s.color }}
                      >
                        <p className="text-[7px]" style={{ color: '#7a7a72' }}>
                          {s.label}
                        </p>
                        <p
                          className="mt-0.5 text-[11px] font-bold"
                          style={{ color: s.tc }}
                        >
                          {s.val}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: '#ddddd5',
                    }}
                  >
                    <p className="mb-2 text-[8px] font-medium" style={{ color: '#7a7a72' }}>
                      Monthly spending
                    </p>
                    <div className="flex h-14 items-end gap-1">
                      {[35, 55, 42, 70, 48, 65, 80, 52, 68, 45, 72, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === 11 ? '#6b8c65' : '#d4e4cf',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -bottom-6 -right-4 hidden overflow-hidden rounded-2xl shadow-xl lg:block"
              style={{
                width: '90px',
                border: '1px solid #ddddd5',
                backgroundColor: '#ffffff',
              }}
            >
              <div
                className="flex h-3 items-center justify-center"
                style={{ backgroundColor: '#2c2c2c' }}
              >
                <div className="h-1 w-8 rounded-full bg-white opacity-30" />
              </div>
              <div className="space-y-1.5 p-2">
                {[
                  {
                    label: 'Balance',
                    val: '$4,280',
                    color: '#d4e4cf',
                    tc: '#6b8c65',
                  },
                  {
                    label: 'Energy',
                    val: '82%',
                    color: '#fdf0d4',
                    tc: '#9a7030',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded p-1.5"
                    style={{ backgroundColor: s.color }}
                  >
                    <p className="text-[6px]" style={{ color: '#7a7a72' }}>
                      {s.label}
                    </p>
                    <p className="text-[9px] font-bold" style={{ color: s.tc }}>
                      {s.val}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
