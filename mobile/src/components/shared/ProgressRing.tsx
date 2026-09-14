import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  displayValue?: string;
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color,
  label,
  displayValue,
}: ProgressRingProps) {
  const { colors } = useThemeContext();
  const resolvedColor = color ?? colors.primary;
  /**
   * The unfilled remainder of the ring.
   *
   * This was a hardcoded '#e5e7eb': a light-mode grey, frozen at write time, unreachable by
   * the user's accent choice and far too loud against the dark palette (14.44:1 on a
   * `#191715` card). It then spent one release on `border` as an interim, because
   * `ColorRoles` had no role for what the web actually uses.
   *
   * `muted` is the real answer and is now a role: the web draws every one of its five ring
   * tracks with `hsl(var(--muted))` — `ui/progress-ring.tsx`, `insights/AiInsightsSection.tsx`,
   * `goals/GoalCard.tsx`, `home/MacroCircles.tsx`, `pages/Energy.tsx` — plus the bar in
   * `home/WaterTracker.tsx`. (The spec says "plus `ui/progress.tsx`'s bar"; that shadcn
   * primitive is `bg-secondary` and has no call sites, so it is not evidence either way.)
   *
   * THE TRAP, and why this is not `surfaceMuted`: the names read as synonyms and are not the
   * same value. `ColorRoles.surfaceMuted` maps to the web's `--paper-2` (see
   * packages/shared/src/tokens/colors.ts), not to `--muted`. Contrast against the card
   * surface this ring sits on, WCAG, dark / light:
   *
   *   surfaceMuted  1.03:1 / 1.13:1   <- ~5 units per channel apart from the card in dark
   *   border        1.27:1 / 1.37:1   <- the interim; the loudest of the three
   *   muted         1.19:1 / 1.17:1   <- what the web draws, and what this is now
   *
   * Dark ships as the default theme, so `surfaceMuted` would make the unfilled remainder
   * disappear and the ring read as 100% at every value — a silent failure, and worse than
   * the loud grey it replaces.
   *
   * 1.19:1 is a deliberately quiet contrast, and quiet is what the web looks like. It is
   * also the one number here that a screenshot can overrule: whether a 1.19:1 hairline
   * ring reads on a real dark phone screen is not something the ratio settles.
   */
  const trackColor = colors.muted;
  const styles = useThemedStyles((colors) => ({
    container: { alignItems: 'center' },
    textContainer: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
    value: { fontWeight: '700', color: colors.text },
    label: { marginTop: 4, color: colors.textMuted, textAlign: 'center' },
  }));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <View style={[styles.container, { width: size }]}>
      <Svg width={size} height={size}>
        <Circle
          testID="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text variant="titleSmall" style={styles.value}>
          {displayValue ?? `${Math.round(clampedValue)}%`}
        </Text>
      </View>
      {label && <Text variant="labelSmall" style={styles.label}>{label}</Text>}
    </View>
  );
}
