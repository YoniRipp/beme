/**
 * The Expo client's primitive layer, mirroring `frontend/src/components/ui/` by name so
 * `agent-os/standards/frontend/components.md`'s "reach for `components/ui/` first" rule reads
 * across both clients rather than only the web.
 *
 * `components/shared/` keeps the composite and domain pieces — `MetricCard`,
 * `MobileFoodCard`, `MobileScreen`, `ProgressRing` — exactly as it does on the web.
 */
export { Card } from './Card';
export { Button } from './Button';
export { IconButton, MIN_TOUCH_TARGET } from './IconButton';
