import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ColorRoles } from '@trackvibe/shared/tokens';
import { useThemeContext } from './ThemeContext';

/**
 * Builds a `StyleSheet` from the active resolved palette, memoised so the sheet is
 * only rebuilt when the palette actually changes (a theme or accent-colour switch),
 * not on every render.
 *
 * `StyleSheet.create` runs exactly once, at whatever moment it is called. A
 * module-scope `const styles = StyleSheet.create({ ... colors.foo ... })` built from
 * the static `colors` import (`mobile/src/theme.ts`, which is always `lightColors` —
 * see `packages/shared/src/tokens/colors.ts`) can therefore never repaint for dark
 * mode, no matter what `ThemeProvider` resolves. Calling `StyleSheet.create` here
 * instead — inside the component, from `useThemeContext()`'s resolved colours — is
 * what makes a screen's styles actually theme-reactive.
 *
 * Usage — the migration off the static import is this mechanical swap:
 *
 *   const styles = StyleSheet.create({ card: { backgroundColor: colors.surface } });
 *
 * becomes, called from inside the component:
 *
 *   const styles = useThemedStyles((colors) => ({
 *     card: { backgroundColor: colors.surface },
 *   }));
 *
 * The callback parameter is deliberately named `colors`, shadowing the old static
 * import it replaces, so every reference inside the style body — `colors.primary`,
 * `colors.border`, etc — reads identically to what it replaced. Only the `import`
 * line and this one wrapper line change; the style bodies themselves don't.
 *
 * `radius` and `spacing` are not resolved here — they are not part of `AppTheme`
 * (see `useAppTheme.ts`), because the spacing/radius scale does not change with the
 * colour scheme. Screens keep importing those directly from `../theme` and can
 * reference them inside the callback passed here exactly as before.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  buildStyles: (colors: ColorRoles) => T
): T {
  const { colors } = useThemeContext();
  return useMemo(() => StyleSheet.create(buildStyles(colors)), [colors]);
}
