import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mic,
  Sparkles,
  DollarSign,
  Dumbbell,
  Apple,
  Calendar,
  Target,
  Check,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Mic,
    title: 'Voice-First Tracking',
    description: 'Just speak naturally. "I spent $12 on lunch" or "30 minute run" — BeMe handles the rest.',
  },
  {
    icon: Sparkles,
    title: 'AI Insights',
    description: 'Get personalized recommendations based on your habits across health, finances, and productivity.',
  },
  {
    icon: DollarSign,
    title: 'Money Management',
    description: 'Track income, expenses, and budgets. Understand where your money goes at a glance.',
  },
  {
    icon: Dumbbell,
    title: 'Workout Tracking',
    description: 'Log workouts with exercises, sets, and reps. Monitor your weekly training volume.',
  },
  {
    icon: Apple,
    title: 'Nutrition & Food',
    description: 'Track meals and macros with AI-powered food lookup. No more manual calorie counting.',
  },
  {
    icon: Calendar,
    title: 'Daily Schedule',
    description: 'Organize your day with a flexible schedule. Build routines that stick.',
  },
  {
    icon: Target,
    title: 'Goal Setting',
    description: 'Set measurable goals across all life domains and track your progress over time.',
  },
];

const FREE_FEATURES = [
  'Manual data entry for all domains',
  'Money tracking (income & expenses)',
  'Workout logging',
  'Food & nutrition tracking',
  'Daily schedule management',
  'Goal setting & tracking',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Voice input — speak to track anything',
  'AI Insights — personalized analytics',
  'AI Food Lookup — instant nutrition data',
  'Daily AI summary & recommendations',
  'Priority support',
];

export function Landing() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const [pricingVisible, setPricingVisible] = useState(false);

  useEffect(() => {
    const el = pricingRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPricingVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* Skip to content (a11y) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <nav role="navigation" aria-label="Main" className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src="/logo.png" alt="BeMe" className="h-10 w-auto rounded-full object-contain" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="main-content" aria-label="Hero" className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          One app for your{' '}
          <span className="text-primary">whole life</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Track your health, finances, schedule, and goals — all in one place.
          Just speak and BeMe takes care of the rest.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/signup">
            <Button size="lg" className="gap-2">
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#pricing">
            <Button size="lg" variant="outline">
              View Pricing
            </Button>
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section aria-label="Features" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need, nothing you don't
          </h2>
          <p className="mt-2 text-muted-foreground">
            BeMe consolidates your daily tracking into a single, intelligent app.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md" role="listitem">
              <CardContent className="flex flex-col gap-3 p-6">
                <feature.icon className="h-8 w-8 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Voice Demo Section */}
      <section aria-label="Voice demo" className="bg-muted/50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Mic className="h-10 w-10 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Talk, don't type
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Say things like "I had a chicken salad for lunch", "bench press 3 sets of 10 at 135",
            or "paid $45 for groceries" — BeMe understands and logs it instantly.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" aria-label="Pricing" className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Simple pricing</h2>
          <p className="mt-2 text-muted-foreground">
            Start free. Upgrade when you want the AI-powered experience.
          </p>
        </div>

        <div ref={pricingRef} className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <Card className={pricingVisible ? 'animate-reveal' : 'opacity-0'}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold">Free</h3>
                <p className="text-sm text-muted-foreground">Track everything manually</p>
                <p className="mt-2 text-3xl font-bold">
                  $0<span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
              </div>
              <ul className="space-y-2" role="list">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className={`border-primary ring-1 ring-primary ${pricingVisible ? 'animate-reveal-delay' : 'opacity-0'}`}>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">Pro</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Popular
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">AI-powered life tracking</p>
                <p className="mt-2 text-3xl font-bold">
                  $7.99<span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
              </div>
              <ul className="space-y-2" role="list">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block">
                <Button className="w-full">Start Free Trial</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BeMe. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
