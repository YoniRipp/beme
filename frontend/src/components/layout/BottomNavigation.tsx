import { Link } from 'react-router-dom';
import { Mic, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface BottomNavigationProps {
  items: NavItem[];
  currentPath: string;
  onCenterPress?: () => void;
  /**
   * Whether to dock the AI Coach button beside the mic. The bar renders an affordance; it
   * does not learn about subscriptions — `Base44Layout` keeps `hasAiAccess`, the
   * `/insights` exception and the panel itself.
   */
  showAiCoach?: boolean;
  onAiCoachPress?: () => void;
}

/**
 * The bottom chrome: four tabs, the centre mic, and — when the caller asks for it — the AI
 * Coach button docked above the bar's right edge.
 *
 * The AI button lives here rather than in `Base44Layout` because the two floating controls
 * are one system. It used to be `position: fixed` against the viewport at a bare `rem`
 * literal in `Base44Layout` that matched nothing the bar measures, so it floated in the
 * gap *above* the scrim and above `<main>`'s reserved strip — the only element in the
 * app sitting on top of live content with nothing behind it. It covered the right 48px of
 * the content column at every scroll offset: `FoodCard`/`WorkoutCard`/`GoalCard` delete,
 * "Copy day", and every right-aligned Profile switch.
 *
 * Now it is a child of the pill, offset from the pill's own height, and it shares the pill's
 * `mx-3.5` edge, its `pb-safe`/`px-safe` insets and the strip `--bottom-chrome` reserves.
 * Everything it needs comes from `--bar-*`/`--dock-*` in `index.css`, so the reservation and
 * the chrome cannot drift apart again.
 *
 * Not a fifth tab: `hasAiAccess` is conditional, so the bar would gain and lose an item as a
 * user's quota ran out and shift the four fixed tabs under their thumb.
 */
export function BottomNavigation({
  items,
  currentPath,
  onCenterPress,
  showAiCoach = false,
  onAiCoachPress,
}: BottomNavigationProps) {
  // Split items into left and right halves for the center button
  const half = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, half);
  const rightItems = items.slice(half);

  const renderItem = (item: NavItem) => {
    const isActive = currentPath === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex-1 flex flex-col items-center justify-center gap-1 text-caption font-bold uppercase tracking-[0.06em] py-2 transition-colors press min-h-[48px]
          ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.9} />
        <span className="leading-none">
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none pb-safe px-safe"
      aria-label="Main navigation"
    >
      {/* The scrim covers the whole chrome strip, inset included — it is positioned against
          the nav's padding box, so it has to add `--safe-bottom` itself. */}
      <div className="absolute inset-x-0 bottom-0 h-[calc(var(--bottom-chrome)+var(--safe-bottom))] bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
      <div className="relative mx-3.5 mb-3.5 h-16 rounded-2xl border border-border bg-card/95 flex items-center justify-around shadow-card-lg pointer-events-auto backdrop-blur-xl">
        {leftItems.map(renderItem)}
        <div className="w-16" />
        {rightItems.map(renderItem)}
        <button
          type="button"
          onClick={onCenterPress}
          className="absolute top-[-22px] left-1/2 -translate-x-1/2 w-[60px] h-[60px] rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-[3px] ring-background press shadow-fab"
          aria-label="Open voice"
        >
          <Mic className="w-6 h-6 text-primary-foreground" strokeWidth={2.2} />
        </button>
        {showAiCoach && (
          /* Docked to the pill, not to the viewport: `bottom-[calc(100%+var(--dock-gap))]`
             is "one pill-height up, plus the gap", and `right-0` is the pill's own edge, so
             the two chrome elements finally share one inset instead of sitting 2px apart on
             unrelated constants.

             Elevation, decided rather than inherited: the mic is the primary action and
             keeps `shadow-fab`'s primary glow; this is secondary chrome and takes
             `shadow-card-lg`, the same step as the bar it docks to. Both take the bar's
             `ring-[3px] ring-background`, because both punch out of the same scrim. */
          <Button
            size="icon"
            onClick={onAiCoachPress}
            className="absolute right-0 bottom-[calc(100%+var(--dock-gap))] h-[var(--dock-size)] w-[var(--dock-size)] rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-card-lg ring-[3px] ring-background press"
            aria-label="Open AI Coach"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        )}
      </div>
    </nav>
  );
}
