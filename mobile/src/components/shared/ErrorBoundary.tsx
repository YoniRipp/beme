import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, spacing } from '../../theme';

/**
 * The last line before a white screen.
 *
 * A render-time throw anywhere in the tree unmounts the whole React Native root: the app does
 * not crash to the home screen, it goes blank and stays blank, with nothing to tap. The web
 * client has had `LocalErrorBoundary.tsx` for this; this one had nothing, so any such throw
 * looked exactly like "the app is broken" — to a user and to an App Store reviewer, who has no
 * reason to assume it is recoverable.
 *
 * A class component because that is still the only way to catch a render error in React —
 * there is no hook equivalent, and `react-error-boundary` would be a dependency for forty
 * lines.
 *
 * **The fallback deliberately uses bare React Native primitives.** It sits above
 * `ThemeProvider` in `App.tsx`, so it can catch a throw from the providers themselves — which
 * means it cannot use anything that reads the theme. The first version of this rendered
 * `components/ui`'s `Button`, and its own test caught the consequence: `useThemeContext must
 * be used within ThemeProvider`, thrown by the fallback, i.e. a blank screen again with an
 * extra step. A last-resort UI must not depend on anything that can itself fail, so this uses
 * no palette, no Paper and no context. The font token is a plain static import and is safe.
 *
 * "Try again" remounts the subtree by resetting state rather than reloading the app. That is
 * enough for a transient failure and honest about the rest: if the throw is deterministic the
 * error comes straight back rather than pretending to have fixed it.
 */
interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // `console.error` rather than a logger: there is no error-reporting service wired up on
    // this client, and swallowing it entirely would make the blank screen unexplainable in a
    // dev build too. When a reporter is added, this is the one place to send it from.
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        {/* The message, not the stack. It is the only clue anyone gets from a release build,
            and it is what someone will read out over support. */}
        <Text style={styles.message}>
          {this.state.error.message || 'The app hit an unexpected error.'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null })}>
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

// No colours at all, for the reason in the docstring: this renders above the theme. Platform
// defaults are legible on the default background, which is the only background there is here.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  retry: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    textDecorationLine: 'underline',
    padding: spacing.sm,
  },
});
