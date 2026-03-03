import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    cta: 'Start free',
    popular: false,
    description: 'Everything you need to get started. No credit card required.',
    features: [
      'Money, body, energy, schedule & goals tracking',
      'Groups — shared spaces for households',
      'Basic charts and trend views',
      'AI actions and voice assistant (limited)',
      'Limited AI food lookup',
    ],
  },
  {
    name: 'Pro',
    price: '$7.99',
    period: '/month',
    cta: 'Get Pro',
    popular: true,
    description: 'Unlimited AI — voice, insights, food lookup, and semantic search.',
    features: [
      'Everything in Free',
      'Voice input — speak to track anything',
      'AI Insights — personalized analytics',
      'AI Food Lookup — instant nutrition data',
      'Daily AI summary & recommendations',
      'Priority support',
    ],
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="py-24 lg:py-32 bg-background overflow-visible"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8 overflow-visible">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 max-w-xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Start free. Upgrade when ready.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            All the core tracking is free forever. Pay only when you want unlimited AI features.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 overflow-visible">
          {plans.map((plan, i) => (
            <div key={plan.name} className={`relative ${plan.popular ? 'pt-6' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 left-6 z-10">
                  <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl p-7 transition-all duration-200 ${
                  !plan.popular ? 'border border-border hover:border-primary/30 hover:shadow-lg' : ''
                }`}
                style={{
                  backgroundColor: plan.popular ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                }}
              >
              <div className="mb-6">
                <h3 className={`mb-1 text-sm font-semibold ${plan.popular ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {plan.name}
                </h3>
                <div className="mb-3 flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${plan.popular ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${plan.popular ? 'bg-primary-foreground/20' : 'bg-primary/20'}`}>
                      <Check className={`h-2.5 w-2.5 ${plan.popular ? 'text-primary-foreground' : 'text-primary'}`} />
                    </div>
                    <span className={`text-xs leading-relaxed ${plan.popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                aria-label={`${plan.cta} - ${plan.name} plan`}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 ${plan.popular ? 'bg-primary-foreground text-primary' : 'border border-border bg-muted text-foreground'}`}
              >
                {plan.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
