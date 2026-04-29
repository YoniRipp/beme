import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, IconButton, Text } from 'react-native-paper';
import { FoodEntry } from '../../types/energy';
import { colors, radius, spacing } from '../../theme';

interface MobileFoodCardProps {
  entry: FoodEntry;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MobileFoodCard({ entry, onEdit, onDelete }: MobileFoodCardProps) {
  const portion = entry.portionAmount != null
    ? `${entry.portionAmount}${entry.portionUnit ? ` ${entry.portionUnit}` : ''}`
    : undefined;

  return (
    <Card mode="contained" style={styles.card} onPress={onEdit}>
      <Card.Content style={styles.content}>
        <View style={styles.image}>
          <Icon source="food-apple" size={24} color={colors.food} />
        </View>
        <View style={styles.body}>
          <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{entry.name}</Text>
          {portion && <Text variant="bodySmall" style={styles.meta}>{portion}</Text>}
          <Text variant="bodySmall" style={styles.macro} numberOfLines={1}>
            P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · F {Math.round(entry.fats)}g
          </Text>
        </View>
        <View style={styles.calorieBlock}>
          <Text variant="titleMedium" style={styles.calories}>{Math.round(entry.calories)}</Text>
          <Text variant="labelSmall" style={styles.kcal}>kcal</Text>
        </View>
        {onDelete && (
          <IconButton icon="trash-can-outline" size={18} iconColor={colors.danger} onPress={onDelete} />
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.foodSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  macro: {
    color: colors.textMuted,
    marginTop: 3,
  },
  calorieBlock: {
    alignItems: 'flex-end',
    minWidth: 52,
  },
  calories: {
    color: colors.text,
    fontWeight: '800',
  },
  kcal: {
    color: colors.textMuted,
    letterSpacing: 0.7,
  },
});
