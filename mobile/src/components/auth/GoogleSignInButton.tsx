import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '../ui';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { fonts, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The social sign-in this client never had. Mirrors the web's `SocialLoginButtons.tsx`,
 * including its disabled-when-unconfigured behaviour: the web disables its button and
 * explains itself in a title when `VITE_GOOGLE_CLIENT_ID` is unset, rather than offering a
 * control that cannot work.
 *
 * The web draws Google's four-colour mark as inline SVG with the brand hex values. That is
 * not portable here — `noFrozenPaletteImports` fails the build on a hex literal outside the
 * palette, and those six brand colours are exactly the kind of frozen value it exists to
 * catch. The Material "google" glyph carries the same meaning and takes its colour from the
 * theme, so the button reads correctly in both schemes.
 */
export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const { isAvailable, unavailableReason, isSigningIn, error, signIn } = useGoogleSignIn();

  const styles = useThemedStyles((c) => ({
    wrap: {
      marginBottom: spacing.md,
    },
    divider: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    error: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: c.danger,
      marginTop: spacing.sm,
    },
    unavailable: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  }));

  /**
   * Rendered at all only where signing in is both possible AND permitted.
   *
   * Two reasons to render nothing, and they are different in kind. In Expo Go the native
   * module is absent and no configuration changes that. On iOS it would work — and must not
   * be offered, because App Store guideline 4.8 requires Sign in with Apple alongside it and
   * this app has no Apple provider (see `useGoogleSignIn`). Either way a control the user
   * cannot act on is noise, so it is absent rather than disabled.
   *
   * A dev client missing only the client id DOES show it, disabled and explained, because
   * that one is actionable by whoever is running the build.
   */
  if (unavailableReason === 'unsupported-build' || unavailableReason === 'ios-needs-apple-signin') {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.divider}>or</Text>
      <Button
        mode="outlined"
        icon="google"
        onPress={signIn}
        disabled={!isAvailable || disabled || isSigningIn}
        loading={isSigningIn}
        accessibilityLabel="Sign in with Google"
      >
        Continue with Google
      </Button>
      {unavailableReason === 'not-configured' ? (
        <Text style={styles.unavailable}>
          Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB to enable Google sign-in.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
