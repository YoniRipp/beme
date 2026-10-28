import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { fonts, spacing } from '../../../theme';
import { useThemedStyles } from '../../../theme/useThemedStyles';

/** The circular step badge, matching the web's `w-16 h-16` (`SetupWizard.tsx:88`). */
const BADGE_SIZE = 64;

/**
 * Step 1 of 5, matching `SetupWizard.tsx:86-97` — the heart badge, the greeting and the
 * "this only takes a minute" promise, which is the sentence that earns the four steps after
 * it. Copy is verbatim: a user who signs up on the phone should read what a user who signs
 * up in the browser reads.
 */
export function WelcomeStep() {
  const styles = useThemedStyles((colors) => ({
    badge: {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      // Geometry, not a design token: a circle's radius is half its box. `radius.*` carries
      // the shared corner scale (sm..xxl) and has no "full" step to reach for.
      borderRadius: BADGE_SIZE / 2,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.displaySemibold,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    body: {
      color: colors.textMuted,
      textAlign: 'center',
    },
    container: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    icon: {
      color: colors.primary,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Icon source="heart" size={32} color={styles.icon.color} />
      </View>
      <Text variant="headlineSmall" style={styles.title}>Welcome to TrackVibe</Text>
      <Text variant="bodyMedium" style={styles.body}>
        Let's set up your profile to personalize your fitness experience. This only takes a
        minute.
      </Text>
    </View>
  );
}
