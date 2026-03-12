import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, Dumbbell, Mic, Heart, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    icon: UtensilsCrossed,
    iconBg: 'bg-orange-100 text-orange-600',
    title: 'Track Your Nutrition',
    description: 'Log meals with voice or text. Track calories, protein, carbs, and fats effortlessly.',
  },
  {
    icon: Dumbbell,
    iconBg: 'bg-blue-100 text-blue-600',
    title: 'Log Your Workouts',
    description: 'Record exercises, sets, and reps. Save templates for quick logging next time.',
  },
  {
    icon: Mic,
    iconBg: 'bg-purple-100 text-purple-600',
    title: 'Talk to Your AI Coach',
    description: "Just speak naturally. Say 'I ate chicken breast' or 'I did 5 sets of squats' and we'll log it for you.",
  },
  {
    icon: Heart,
    iconBg: 'bg-green-100 text-green-600',
    title: "Let's Get Started",
    description: 'Set up your profile to personalize your fitness journey. It only takes a minute.',
  },
];

interface WelcomeSlidesProps {
  onComplete: () => void;
}

export function WelcomeSlides({ onComplete }: WelcomeSlidesProps) {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
      {/* Skip button */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onComplete}>
          Skip
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full text-center space-y-8">
        {/* Icon */}
        <div className={`w-24 h-24 rounded-full ${slide.iconBg} flex items-center justify-center`}>
          <Icon className="w-12 h-12" />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">{slide.title}</h2>
          <p className="text-muted-foreground text-base leading-relaxed">{slide.description}</p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="w-full max-w-sm space-y-6 pb-8">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? 'bg-primary' : 'bg-muted'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Action button */}
        <Button className="w-full h-12 text-base" onClick={isLast ? onComplete : () => setCurrent(current + 1)}>
          {isLast ? 'Get Started' : 'Next'}
          {!isLast && <ChevronRight className="w-5 h-5 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
