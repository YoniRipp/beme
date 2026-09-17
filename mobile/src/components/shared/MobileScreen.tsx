import React from 'react';
import { RefreshControl, ScrollView, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, spacing } from '../../theme';
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
  /**
   * Pull to refresh. Optional, and screens without a refetch simply omit it.
   *
   * Worth having rather than relying on React Query's own refetching: `staleTime` is 60s and
   * a failed query does not retry itself, so recovering from one dropped request meant
   * force-quitting the app. There was no manual refresh anywhere in this client.
   *
   * The spinner state lives here rather than in every call site — a screen passes its
   * `refetch` and nothing else.
   */
  onRefresh?: () => Promise<unknown>;
}

export function MobileScreen({ kicker, title, subtitle, children, scroll = true, contentStyle, onRefresh }: MobileScreenProps) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // `finally`, so a rejected refetch still clears the spinner. React Query has already
      // put the failure on the query's `error`, which the screen renders; leaving the wheel
      // turning would claim it was still trying.
      setRefreshing(false);
    }
  }, [onRefresh]);
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
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.bold,
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined
      }
    >
      {content}
    </ScrollView>
  );
}


