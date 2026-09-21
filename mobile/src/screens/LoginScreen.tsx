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
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { fonts, radius, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

export function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const { colors } = useThemeContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
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
      color: colors.text,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.textMuted,
      marginBottom: spacing.xl,
    },
    error: {
      fontFamily: fonts.regular,
      color: colors.danger,
      marginBottom: spacing.md,
    },
    input: {
      fontFamily: fonts.regular,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
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
      // `fonts.regular` was here beside `fontWeight: '600'` — a named font, and still the
      // wrong face for the weight it asks for. That is why `rawTextNamesItsFont` passed on
      // this file while the button still rendered at 400.
      color: colors.primaryForeground,
      fontSize: 16,
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    link: {
      fontFamily: fonts.regular,
      color: colors.primary,
      fontSize: 14,
    },
  }));

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
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
        <Text style={styles.title}>TrackVibe</Text>
        <Text style={styles.subtitle}>Sign in</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
        />
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
        <GoogleSignInButton disabled={loading} />
        <Pressable onPress={() => navigation.navigate('Signup' as never)} disabled={loading}>
          <Text style={styles.link}>Create an account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
