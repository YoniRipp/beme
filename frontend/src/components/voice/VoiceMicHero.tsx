import { Mic } from 'lucide-react';
import { PulseCard } from '@/components/pulse/PulseUI';

export function VoiceMicHero({ onOpenAgent }: { onOpenAgent: () => void }) {
  return (
    <PulseCard className="overflow-hidden">
      <div className="flex flex-col items-center gap-4 px-5 py-8">
        <button
          type="button"
          onClick={onOpenAgent}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card-lg transition-all hover:scale-105 press"
          aria-label="Open voice agent"
        >
          <Mic className="h-10 w-10" />
        </button>

        <div className="max-w-sm text-center">
          <p className="text-lg font-extrabold tracking-tight text-foreground">Tap to log by voice</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Opens the same Voice Agent as the bottom mic.
          </p>
        </div>
      </div>
    </PulseCard>
  );
}
