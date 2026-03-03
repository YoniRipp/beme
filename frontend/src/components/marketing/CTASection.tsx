import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Leaf } from 'lucide-react';

export function CTASection() {
  const scrollToPricing = () => {
    document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section aria-label="Call to action" className="font-sans py-24 lg:py-32 bg-primary">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center"
        >
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-primary-foreground">BeMe</span>
              <span className="text-xs uppercase tracking-widest text-primary-foreground/50">
                Life Balance
              </span>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-primary-foreground sm:text-4xl">
              Ready to get your life
              <br />
              in balance?
            </h2>
            <p className="mt-4 max-w-lg text-base text-primary-foreground/80">
              Start for free. Track everything. Upgrade only when you want AI superpowers.
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="font-sans inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={scrollToPricing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/20"
            >
              View pricing
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
