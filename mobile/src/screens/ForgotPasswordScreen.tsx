import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../core/api/auth';
import { fonts, radius, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

/**
 * The recovery route this client did not have.
 *
 * The Expo app is email+password only and there is no admin reset path in the backend, so a
 * user who forgot their password had NO way back into their account from the app at all --
 * the one flow people are genuinely locked out of (`docs/HANDOFF.md`, owner item 1, and the
 * parity audit independently).
 *
 * ONLY THE REQUEST LIVES HERE, not the reset. The emailed link points at the web
 * (`${FRONTEND_ORIGIN}/reset-password?token=…&email=…`, `backend/src/services/auth.ts`), so
 * the new password is chosen there and the user comes back to sign in. Adding a reset screen
 * here would mean either retargeting that link -- changing behaviour for every web user to
 * serve this client -- or asking someone to copy a 64-character hex token out of an email by
 * hand. Neither is worth it while the web page already works.
 *
 * WORTH KNOWING: this is inert in production today. `RESEND_API_KEY` is unset in Railway, so
 * `sendMail` is a no-op and no reset email is ever delivered -- for the web's page too, which
 * has had this problem since it shipped. Two variables are needed, not one: `email.ts`
 * defaults the sender to `onboarding@resend.dev`, Resend's shared sandbox address, which only
 * delivers to the Resend account's own inbox. An API key alone gives a flow that works when
 * you test it on yourself and silently reaches nobody else. Set `RESEND_API_KEY` AND
 * `RESEND_FROM` against a verified domain.
 */
export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { colors } = useThemeContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: c.background,
    },
    form: {
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.display,
      marginBottom: spacing.xs,
      color: c.text,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 16,
      color: c.textMuted,
      marginBottom: spacing.xl,
    },
    error: {
      fontFamily: fonts.regular,
      color: c.danger,
      marginBottom: spacing.md,
    },
    sent: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: c.text,
      marginBottom: spacing.lg,
      lineHeight: 22,
    },
    input: {
      fontFamily: fonts.regular,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
      backgroundColor: c.surface,
      color: c.text,
    },
    button: {
      backgroundColor: c.primary,
      padding: 14,
      borderRadius: radius.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: c.primaryForeground,
      fontSize: 16,
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    link: {
      fontFamily: fonts.regular,
      color: c.primary,
      fontSize: 14,
    },
  }));

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter the email address for your account');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      /**
       * Shown whatever the server said, because the server deliberately says the same thing
       * either way. Branching on "we found that account" here would hand an anonymous caller
       * the account-enumeration oracle the endpoint's wording is written to deny them.
       */
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          {sent ? 'Check your inbox' : 'We will email you a link to choose a new one.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sent ? (
          <>
            <Text style={styles.sent}>
              If an account exists for {email.trim()}, a reset link is on its way. Open it on
              this device or any browser to choose a new password, then sign in here.
            </Text>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonText}>Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel="Email"
              editable={!loading}
            />
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.buttonText}>Send reset link</Text>
              )}
            </Pressable>
            <Pressable onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.link}>Back to sign in</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
