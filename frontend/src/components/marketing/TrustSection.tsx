import { motion } from 'framer-motion';
import { Shield, Lock, Smartphone, Monitor, Zap, Eye } from 'lucide-react';

const pillars = [
  {
    icon: Shield,
    title: 'Your data stays yours',
    description:
      'We never sell your data to advertisers. Everything you track is stored securely in your account — private by default.',
    accent: '#d4e4cf',
    iconColor: '#6b8c65',
  },
  {
    icon: Lock,
    title: 'Secure by design',
    description:
      'All data is encrypted in transit and at rest. Secure authentication with optional social login.',
    accent: '#dce8f5',
    iconColor: '#3a6090',
  },
  {
    icon: Zap,
    title: 'Fast everywhere',
    description:
      'BeMe loads instantly on any connection. Optimized for low latency so your data is always there when you need it.',
    accent: '#fdf0d4',
    iconColor: '#9a7030',
  },
  {
    icon: Eye,
    title: 'No ads, ever',
    description:
      'BeMe is a paid product. That means no ad tracking, no behavioral profiling, no selling insights about your habits.',
    accent: '#f0dce8',
    iconColor: '#804a70',
  },
  {
    icon: Monitor,
    title: 'Full web app',
    description:
      'Open BeMe in any browser on any computer. No install, no update prompts, no app store gatekeeping.',
    accent: '#e8dcd4',
    iconColor: '#7a5040',
  },
  {
    icon: Smartphone,
    title: 'Optimized for mobile',
    description:
      'The full experience on your phone. Add a transaction, log a workout, or check your schedule — from anywhere.',
    accent: '#dce4e8',
    iconColor: '#3a6070',
  },
];

export function TrustSection() {
  return (
    <section
      aria-label="Privacy and performance"
      className="py-24 lg:py-32 bg-muted"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 max-w-xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Privacy & Performance
          </p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Built for people who care about their data.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            We don't monetize you. BeMe earns from subscriptions, not from selling your habits to
            the highest bidder.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/20"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: p.accent }}
                >
                  <Icon className="h-5 w-5" style={{ color: p.iconColor }} />
                </div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
