import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, Layers, BrainCircuit, ArrowRight } from 'lucide-react';

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Privacy First',
    description: 'Your data belongs to you. We never sell it, and we encrypt everything in transit. Passwords are hashed, and we follow industry best practices to keep your information safe.',
  },
  {
    icon: Layers,
    title: 'Simplicity Over Complexity',
    description: 'One app, one login, one place to see your whole life. No bloat, no feature overload — just the tools you need to track what matters.',
  },
  {
    icon: BrainCircuit,
    title: 'AI That Helps, Not Hypes',
    description: 'Our AI gives you practical insights based on your real data — not generic advice. It connects patterns across your health, finances, and habits to surface what actually matters.',
  },
];

export function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/welcome">
            <img src="/logo.png" alt="BeMe" className="h-10 w-auto rounded-full object-contain" />
          </Link>
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
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">About BeMe</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          We believe managing your life shouldn't require five different apps.
        </p>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-2xl font-bold tracking-tight">Our Mission</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          BeMe was born from a simple frustration: tracking health, finances, and goals meant juggling
          multiple apps that never talked to each other. We built BeMe to be the single place where all
          your life data lives — and where AI connects the dots to give you insights no single-purpose
          app ever could.
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Whether you're monitoring your spending habits, logging workouts, counting macros, or planning
          your week, BeMe brings it all together. And with voice-first input, tracking takes seconds
          instead of minutes.
        </p>
      </section>

      {/* Values */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">What We Believe</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {VALUES.map((v) => (
              <Card key={v.title} className="transition-shadow hover:shadow-md">
                <CardContent className="p-6 space-y-3">
                  <v.icon className="h-8 w-8 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The Product */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight">The Product</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          BeMe covers six life domains: <strong>Money</strong> (income & expense tracking),{' '}
          <strong>Body</strong> (workouts & exercise logging), <strong>Energy</strong> (nutrition,
          sleep & wellness), <strong>Schedule</strong> (daily planning), <strong>Goals</strong>{' '}
          (measurable targets), and <strong>Groups</strong> (household & team management). Every
          domain supports voice input powered by Google Gemini AI.
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Pro subscribers get AI-powered insights that connect patterns across all domains — like
          how your sleep quality affects your workout performance, or how your spending habits shift
          with your energy levels.
        </p>
        <div className="mt-6">
          <Link to="/welcome#features">
            <Button variant="outline" className="gap-2">
              See all features <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Community */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold tracking-tight">Open Source & Community</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            BeMe is built in the open. We welcome contributions from developers, designers, and
            anyone passionate about building better tools for personal growth. Check out our
            contribution guidelines to get started — whether it's a bug fix, a new feature idea,
            or improving documentation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to take control?</h2>
        <p className="mt-4 text-muted-foreground">
          Join thousands of people who track their whole life in one place.
        </p>
        <div className="mt-8">
          <Link to="/signup">
            <Button size="lg" className="gap-2">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BeMe. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/welcome" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
