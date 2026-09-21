import React, { useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Chip, Icon, Text } from 'react-native-paper';
import { Button, Card } from '../ui';
import { SectionCard } from '../shared/SectionCard';
import { ProgressRing } from '../shared/ProgressRing';
import { useAiInsights } from '../../hooks/useAiInsights';
import {
  hasNarrative,
  stripEmphasis,
  todayRecommendations,
  type AiFailure,
  type TodayRecommendation,
} from '../../lib/aiInsightsState';
import {
  DEFAULT_INSIGHT_PERIOD,
  INSIGHT_PERIODS,
  type InsightPeriod,
} from '../../core/api/aiInsights';
import { fonts, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The AI half of the Insights screen — the wellness score, the narrative, the highlights and
 * suggestions, and today's recommendations. Mirrors
 * `frontend/src/components/insights/AiInsightsSection.tsx`, which is the specification for
 * what it shows.
 *
 * **It is a component rather than more of `InsightsScreen`, and that is not a style
 * preference.** `InsightsScreen.tsx` imports `react-native-gifted-charts`, which Jest cannot
 * transform, so nothing in that screen's module graph can be rendered in a test — the reason
 * `lib/insightsViewState.ts` exists at all. Everything here is testable precisely because
 * none of it is in there.
 *
 * ── Where this deliberately does not mirror the web ──────────────────────────────────────
 *
 * **1. Nothing generates on mount.** The web fires `getInsights(30)`, prefetches the other
 * three periods and calls `getTodayRecommendations` on every mount, then auto-fires
 * `POST /refresh` when `/freshness` reports new activity. Each of those is a debit against an
 * allowance that defaults to ten calls a month (`AI_MONTHLY_LIMIT`, unset in production), and
 * `GET /api/insights` debits even when it serves a cached row — so the web spends a user's
 * month in two page loads. Here the free `/freshness` read runs on open and everything else
 * waits for a press. See `hooks/useAiInsights.ts` for the full cost table.
 *
 * **2. Staleness is shown, not acted on.** The web's auto-refresh spends two calls on the
 * user's behalf without telling them. This says "there is newer activity than this" and puts
 * the decision in a button — which is also the only version of the web's smart-refresh that
 * does not present a live-looking control that silently `return`s.
 *
 * **3. No chat panel and no semantic search.** Both are the web's, both are separate
 * endpoints (`/api/chat`, `POST /api/search`) rather than part of the insights read, and this
 * client has no chat screen for a "Chat Now" button to open. Absent, not forgotten.
 *
 * **4. An empty success is its own state.** `generateTodayRecommendations` swallows every
 * error and returns four empty strings with a 200 (`backend/src/services/insights.ts:481`),
 * and a cached row from a partial generation reads back with an empty summary. Both are
 * routine, and both would otherwise render a card with a heading and nothing under it.
 */

/** The four periods the backend keeps a separate cached row for, as the web labels them. */
const PERIOD_LABELS: Record<InsightPeriod, string> = {
  7: '7d',
  14: '14d',
  30: '30d',
  90: '90d',
};

/** Which `SectionCard` tone each recommendation slot is drawn in. */
const SLOT_TONE: Record<TodayRecommendation['key'], 'primary' | 'food' | 'workout' | 'sleep'> = {
  workout: 'workout',
  sleep: 'sleep',
  nutrition: 'food',
  focus: 'primary',
};

export function AiInsightsSection() {
  const { colors } = useThemeContext();
  const [periodDays, setPeriodDays] = useState<InsightPeriod>(DEFAULT_INSIGHT_PERIOD);
  const ai = useAiInsights(periodDays);

  const styles = useThemedStyles((colors) => ({
    section: { gap: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    heading: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    periods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    // A status line, not an alert: nothing has failed when insights are merely behind.
    stale: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    staleText: { flex: 1, color: colors.textMuted },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    summary: { flex: 1, color: colors.textMuted },
    centered: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    centeredTitle: {
      color: colors.text,
      textAlign: 'center',
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    centeredDetail: { color: colors.textMuted, textAlign: 'center' },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    busyText: { color: colors.textMuted },
    list: { gap: spacing.md },
    listItem: { flexDirection: 'row', gap: spacing.sm },
    // `xxs` (2) is Tailwind's `mt-0.5` — the optical nudge that puts a small glyph on the
    // first line's baseline rather than its box top. The web spells it `mt-0.5` at both of
    // the call sites this mirrors.
    listGlyph: { marginTop: spacing.xxs },
    listText: { flex: 1, color: colors.text },
    /** The same `flex: 1` slot as `listText`, minus the `color` a `View` cannot take. */
    listBody: { flex: 1 },
    recLabel: { color: colors.text, fontFamily: fonts.semibold, fontWeight: '600' },
    recText: { color: colors.textMuted },
  }));

  /**
   * The ring's colour, role for role with the web's `score >= 75 ? chart-1 : score >= 50 ?
   * chart-3 : destructive`. In `frontend/src/index.css` dark mode `--chart-1` *is*
   * `var(--sage)` and `--chart-3` *is* `var(--gold)`, which are this palette's `primary` and
   * `sleep`; in light mode the two hex values match those roles as well. So this is the same
   * three colours, reached through the shared token names instead of copied.
   */
  const scoreColor = (score: number) =>
    score >= 75 ? colors.primary : score >= 50 ? colors.sleep : colors.danger;

  const recommendations = todayRecommendations(ai.today);
  const showTodayCard = ai.todayLoading || ai.today !== undefined || ai.todayFailure !== null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Icon source="auto-fix" size={20} color={colors.primary} />
        <Text variant="titleLarge" style={styles.heading} accessibilityRole="header">
          AI-Powered Insights
        </Text>
        {ai.hasContent && (
          <Button
            mode="outlined"
            compact
            icon="refresh"
            disabled={!ai.canRefresh}
            loading={ai.refreshing}
            onPress={ai.refresh}
            accessibilityLabel="Refresh AI insights"
          >
            Refresh
          </Button>
        )}
      </View>

      <View style={styles.periods}>
        {INSIGHT_PERIODS.map((days) => (
          <Chip
            key={days}
            selected={days === periodDays}
            mode={days === periodDays ? 'flat' : 'outlined'}
            onPress={() => setPeriodDays(days)}
            accessibilityLabel={`Last ${days} days`}
          >
            {PERIOD_LABELS[days]}
          </Chip>
        ))}
      </View>

      {/* The free endpoint already said the allowance is gone, so nothing below can work and
          offering a button would only spend a call to prove it. */}
      {ai.entitlementFailure ? (
        <FailureCard failure={ai.entitlementFailure} />
      ) : ai.insightsFailure ? (
        <FailureCard failure={ai.insightsFailure} onRetry={ai.generate} />
      ) : ai.refreshFailure && !ai.insightsLoading ? (
        <FailureCard failure={ai.refreshFailure} onRetry={ai.canRefresh ? ai.refresh : undefined} />
      ) : null}

      {ai.insightsLoading ? (
        <Card>
          <Card.Content style={styles.centered}>
            <View style={styles.busyRow}>
              <ActivityIndicator size="small" />
              <Text variant="bodyMedium" style={styles.busyText}>
                Analyzing your data…
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : !ai.hasContent && !ai.entitlementFailure && !ai.insightsFailure ? (
        /**
         * The resting state, and the one the web does not have. It is a call to action rather
         * than a spinner because generating costs the user one of a small monthly allowance,
         * so it has to be something they chose.
         */
        <Card>
          <Card.Content style={styles.centered}>
            <Icon source="auto-fix" size={32} color={colors.primary} />
            <Text variant="titleSmall" style={styles.centeredTitle}>
              Get an AI read on your last {periodDays} days
            </Text>
            <Text variant="bodySmall" style={styles.centeredDetail}>
              A wellness score, what is going well, and what to change — generated from the
              same data the charts below are drawn from. Uses one of your monthly AI calls.
            </Text>
            <Button mode="contained" onPress={ai.generate} accessibilityLabel="Generate AI insights">
              Generate insights
            </Button>
          </Card.Content>
        </Card>
      ) : ai.insights && !hasNarrative(ai.insights) ? (
        /**
         * A 200 with nothing in it. Routine rather than exceptional — see this file's
         * docblock — and deliberately not worded as a failure, because nothing failed.
         */
        <Card>
          <Card.Content style={styles.centered}>
            <Icon source="information-outline" size={28} color={colors.textMuted} />
            <Text variant="titleSmall" style={styles.centeredTitle}>
              No insight for this period yet
            </Text>
            <Text variant="bodySmall" style={styles.centeredDetail}>
              There was not enough logged in the last {periodDays} days for the coach to say
              anything useful. Log a few more days and try again.
            </Text>
          </Card.Content>
        </Card>
      ) : ai.insights ? (
        <>
          {ai.isStale && (
            <View style={styles.stale} accessibilityRole="text">
              <Icon source="clock-alert-outline" size={16} color={colors.sleep} />
              <Text variant="bodySmall" style={styles.staleText}>
                You have logged new activity since these were generated.
              </Text>
            </View>
          )}

          <Card>
            <Card.Content style={styles.scoreRow}>
              <ProgressRing
                value={ai.insights.score}
                size={100}
                strokeWidth={10}
                color={scoreColor(ai.insights.score)}
                displayValue={`${Math.round(ai.insights.score)}`}
                label="Wellness Score"
              />
              <Text variant="bodyMedium" style={styles.summary}>
                {stripEmphasis(ai.insights.summary)}
              </Text>
            </Card.Content>
          </Card>

          {ai.insights.highlights.length > 0 && (
            <SectionCard icon="trending-up" title="Highlights" tone="primary">
              <View style={styles.list}>
                {ai.insights.highlights.map((highlight, i) => (
                  <View key={`${i}-${highlight}`} style={styles.listItem}>
                    <View style={styles.listGlyph}>
                      <Icon source="check" size={14} color={colors.success} />
                    </View>
                    <Text variant="bodyMedium" style={styles.listText}>
                      {stripEmphasis(highlight)}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {ai.insights.suggestions.length > 0 && (
            <SectionCard icon="lightbulb-outline" title="Suggestions" tone="sleep">
              <View style={styles.list}>
                {ai.insights.suggestions.map((suggestion, i) => (
                  <View key={`${i}-${suggestion}`} style={styles.listItem}>
                    <View style={styles.listGlyph}>
                      <Icon source="arrow-right" size={14} color={colors.sleep} />
                    </View>
                    <Text variant="bodyMedium" style={styles.listText}>
                      {stripEmphasis(suggestion)}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}
        </>
      ) : null}

      {showTodayCard && (
        <SectionCard icon="lightbulb-on-outline" title="Today's Recommendations" tone="primary">
          {ai.todayLoading ? (
            <View style={styles.busyRow}>
              <ActivityIndicator size="small" />
              <Text variant="bodyMedium" style={styles.busyText}>
                Generating recommendations…
              </Text>
            </View>
          ) : ai.todayFailure ? (
            <Text variant="bodySmall" style={styles.centeredDetail}>
              {ai.todayFailure.title}
            </Text>
          ) : recommendations.length === 0 ? (
            // Four empty strings and a 200 — the shape `generateTodayRecommendations`
            // returns whenever the model call fails. Said plainly rather than left blank.
            <Text variant="bodySmall" style={styles.centeredDetail}>
              Your coach had nothing specific for today.
            </Text>
          ) : (
            <View style={styles.list}>
              {recommendations.map((rec) => (
                <View key={rec.key} style={styles.listItem}>
                  <View style={styles.listGlyph}>
                    <Icon source={rec.icon} size={16} color={colors[SLOT_TONE[rec.key]]} />
                  </View>
                  <View style={styles.listBody}>
                    <Text variant="bodyMedium" style={styles.recLabel}>
                      {rec.label}
                    </Text>
                    <Text variant="bodySmall" style={styles.recText}>
                      {rec.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      )}
    </View>
  );
}

/**
 * The one way this section says an AI read did not work.
 *
 * `shared/ErrorNotice` is the app's error line and is deliberately not reused: it is a single
 * red sentence with `accessibilityRole="alert"`, which is right for "your workouts did not
 * load" and wrong for all three of these. Two of the three are not the user's fault and not
 * retryable, and none of them means the screen is broken — the charts below are unaffected,
 * which is why the detail lines say so.
 */
function FailureCard({ failure, onRetry }: { failure: AiFailure; onRetry?: () => void }) {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    content: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
    title: {
      color: colors.text,
      textAlign: 'center',
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
    detail: { color: colors.textMuted, textAlign: 'center' },
  }));

  const icon = failure.kind === 'quota' ? 'update' : 'alert-circle-outline';

  return (
    <Card>
      <Card.Content style={styles.content}>
        <Icon
          source={icon}
          size={28}
          color={failure.kind === 'generic' ? colors.danger : colors.textMuted}
        />
        <Text variant="titleSmall" style={styles.title} accessibilityRole="alert">
          {failure.title}
        </Text>
        <Text variant="bodySmall" style={styles.detail}>
          {failure.detail}
        </Text>
        {failure.retryable && onRetry && (
          <Button mode="outlined" icon="refresh" onPress={onRetry} accessibilityLabel="Retry AI insights">
            Retry
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
