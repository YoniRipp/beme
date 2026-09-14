import React from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface MobileScreenProps {
  /**
   * A small uppercase line ABOVE the title — the web `PageHeader`'s `kicker`
   * (`frontend/src/components/ui/page.tsx`), which this component is the Expo analogue of.
   * Home uses it for today's date; every other screen leaves it unset, so nothing else
   * changes shape.
   */
  kicker?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

export function MobileScreen({ kicker, title, subtitle, children, scroll = true, contentStyle }: MobileScreenProps) {
  const styles = useThemedStyles((colors) => ({
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
    kicker: {
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    title: {
      color: colors.text,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    subtitle: {
      color: colors.textMuted,
    },
  }));
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.content, { paddingBottom: spacing.xl + insets.bottom }, contentStyle]}>
      {(kicker || title || subtitle) && (
        <View style={styles.header}>
          {kicker && <Text variant="labelSmall" style={styles.kicker}>{kicker}</Text>}
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


