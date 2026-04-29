import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface MobileScreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

export function MobileScreen({ title, subtitle, children, scroll = true, contentStyle }: MobileScreenProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.content, { paddingBottom: spacing.xl + insets.bottom }, contentStyle]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text variant="headlineMedium" style={styles.title}>{title}</Text>}
          {subtitle && <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textMuted,
  },
});
