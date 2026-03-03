import { motion } from 'framer-motion';
import {
  Wallet,
  Dumbbell,
  Zap,
  CalendarDays,
  Target,
  Users,
  Mic,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: Wallet,
    title: 'Money',
    description:
      'Track income and expenses by category. See monthly trends, recurring transactions, and always know where your money goes.',
    accent: '#d4e4cf',
    iconColor: '#6b8c65',
  },
  {
    icon: Dumbbell,
    title: 'Body',
    description:
      'Log every workout — sets, reps, weight. Track streaks and frequency across strength, cardio, flexibility, and sports.',
    accent: '#dce8f5',
    iconColor: '#3a6090',
  },
  {
    icon: Zap,
    title: 'Energy',
    description:
      'Daily wellness check-ins, sleep hours, food entries with calories and macros. Know what affects your energy levels.',
    accent: '#fdf0d4',
    iconColor: '#9a7030',
  },
  {
    icon: CalendarDays,
    title: 'Schedule',
    description:
      'Plan your day with clear time blocks, categories, and optional recurrence. See everything at a glance.',
    accent: '#f0dce8',
    iconColor: '#804a70',
  },
  {
    icon: Target,
    title: 'Goals',
    description:
      'Set targets for calories, workouts, or savings. Track weekly, monthly, or yearly — and actually follow through.',
    accent: '#e8dcd4',
    iconColor: '#7a5040',
  },
  {
    icon: Users,
    title: 'Groups',
    description:
      'Shared spaces for households, couples, or projects. Invite members and manage budgets and goals together.',
    accent: '#dce4e8',
    iconColor: '#3a6070',
  },
  {
    icon: Mic,
    title: 'Voice Assistant',
    description:
      '"Add coffee for $5." "Log 30 minutes cardio." BeMe understands natural language and fills in your data instantly.',
    accent: '#e4dced',
    iconColor: '#5a4080',
  },
  {
    icon: Sparkles,
    title: 'AI Insights',
    description:
      'Wellness score, smart summaries, personalized suggestions, and semantic search — find any entry by meaning, not just keyword.',
    accent: '#d4e4cf',
    iconColor: '#6b8c65',
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-label="Features"
      className="py-24 lg:py-32 bg-background"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 max-w-xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Everything you need to manage your life.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            No more switching between five different apps. BeMe covers all of it — in one clean,
            focused place.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: f.accent }}
                >
                  <Icon className="h-5 w-5" style={{ color: f.iconColor }} />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
