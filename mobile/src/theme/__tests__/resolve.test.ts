import { resolveScheme } from '../useAppTheme';

// Mirrors next-themes' semantics on the web: `ThemeProvider` is mounted with
// `defaultTheme="dark" enableSystem` (frontend/src/App.tsx:14). 'light'/'dark' pin the
// scheme regardless of what the OS reports; 'system' defers to the OS. React Native's
// `useColorScheme()` reports `null` when the OS scheme is unavailable — that case falls
// back to the app default, dark, matching `DEFAULT_SETTINGS.theme`
// (packages/shared/src/settings/types.ts).
//
// Pure function, no renderer needed — this is the whole of Task 3's logic worth
// testing in isolation; `useAppTheme` itself is exercised in useAppTheme.test.tsx.
describe('resolveScheme', () => {
  it("returns 'light' when the setting is 'light', regardless of the OS scheme", () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('light', 'light')).toBe('light');
    expect(resolveScheme('light', null)).toBe('light');
  });

  it("returns 'dark' when the setting is 'dark', regardless of the OS scheme", () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('dark', 'dark')).toBe('dark');
    expect(resolveScheme('dark', null)).toBe('dark');
  });

  it("defers to the OS scheme when the setting is 'system'", () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it("falls back to the app default (dark) when the setting is 'system' and the OS scheme is unavailable", () => {
    expect(resolveScheme('system', null)).toBe('dark');
  });
});
