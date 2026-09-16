import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList } from 'react-native';
import { TextInput, Text, Chip, SegmentedButtons } from 'react-native-paper';
import { Card, Button } from '../components/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEnergy } from '../hooks/useEnergy';
import { useDebounce } from '../hooks/useDebounce';
import { searchFoods, FoodSearchResult } from '../core/api/food';
import {
  scalePortion,
  defaultPortionFor,
  servingSizesInMl,
  inferMealTypeFromHour,
  type PortionUnit,
} from '@trackvibe/shared/domain';
import Toast from 'react-native-toast-message';
import { spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';

const DEFAULT_REFERENCE_GRAMS = 100;
/** Gram presets for an ordinary per-100g solid; also the fallback before a food is picked. */
const DEFAULT_GRAM_PRESETS = [50, 100, 150, 200];
/** Glass / can / bottle, for a drink that publishes no serving sizes of its own. */
const DEFAULT_ML_PRESETS = [250, 330, 500];
/** Counts offered for a countable food (eggs, slices, drumsticks). */
const UNIT_PRESETS = [1, 2, 3, 4];

const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_OPTIONS[number];

const MEAL_START_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '18:00',
  snack: '15:00',
};

/**
 * The portion chips to offer for a food, and the unit they are measured in.
 *
 * Grams are only right for a per-100g solid. A drink is offered its own published
 * serving sizes in millilitres, and a countable food is offered whole counts of its own
 * unit — showing "50 g / 100 g" for milk or for an egg is what made the logged macros
 * wrong in the first place.
 */
export function portionPresetsFor(
  food: FoodSearchResult | null | undefined,
  currentUnit: PortionUnit = 'g',
): { unit: PortionUnit; presets: number[] } {
  if (!food) {
    // Editing an existing entry: there is no food row to consult, so the unit already on
    // the entry decides the shape of the chips. Offering "50 g / 100 g" while the field
    // reads "ml" is the same confusion this screen used to save into the database.
    if (currentUnit === 'ml') return { unit: 'ml', presets: [...DEFAULT_ML_PRESETS] };
    if (currentUnit !== 'g') return { unit: currentUnit, presets: [...UNIT_PRESETS] };
    return { unit: 'g', presets: [...DEFAULT_GRAM_PRESETS] };
  }
  if (food.defaultUnit && food.unitWeightGrams) {
    return { unit: food.defaultUnit, presets: [...UNIT_PRESETS] };
  }
  if (food.isLiquid) {
    const sizes = servingSizesInMl(food);
    return { unit: 'ml', presets: sizes.length > 0 ? sizes : [...DEFAULT_ML_PRESETS] };
  }
  const ref =
    food.referenceGrams && food.referenceGrams > 0 ? food.referenceGrams : DEFAULT_REFERENCE_GRAMS;
  const presets = [
    ...new Set([Math.round(ref / 2), ref, Math.round(ref * 1.5), ref * 2]),
  ].sort((a, b) => a - b);
  return { unit: 'g', presets };
}

/** How a food's own nutrition is summarised in the search results list. */
function searchResultMeta(food: FoodSearchResult): string {
  const ref =
    food.referenceGrams && food.referenceGrams > 0 ? food.referenceGrams : DEFAULT_REFERENCE_GRAMS;
  if (food.defaultUnit && food.unitWeightGrams) {
    return `${Math.round((food.calories * food.unitWeightGrams) / ref)} cal/${food.defaultUnit}`;
  }
  return `${Math.round(food.calories)} cal/${ref}${food.isLiquid ? 'ml' : 'g'}`;
}

export function FoodEntryFormScreen() {
  const styles = useThemedStyles((colors) => ({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    searchSection: { marginBottom: spacing.sm },
    input: { marginBottom: spacing.md },
    label: { marginTop: spacing.sm, marginBottom: spacing.sm, fontWeight: '600', color: colors.text },
    segment: { marginBottom: spacing.md },
    resultsCard: { marginTop: -spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surface },
    resultItem: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    resultMeta: { color: colors.textMuted },
    portionRow: { marginBottom: spacing.md },
    portionInput: { marginBottom: spacing.sm },
    presets: { flexDirection: 'row', gap: spacing.sm },
    presetChip: { marginRight: 4 },
    nutritionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    nutritionInput: { flex: 1 },
    saveButton: { marginTop: spacing.sm, backgroundColor: colors.primary },
  }));
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const entryId = route.params?.entryId;
  const routeMealType = route.params?.mealType as MealType | undefined;
  const { getFoodEntryById, addFoodEntry, updateFoodEntry } = useEnergy();
  const existing = entryId ? getFoodEntryById(entryId) : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [name, setName] = useState(existing?.name || '');
  const [calories, setCalories] = useState(existing?.calories?.toString() || '');
  const [protein, setProtein] = useState(existing?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(existing?.carbs?.toString() || '');
  const [fats, setFats] = useState(existing?.fats?.toString() || '');
  const [portionAmount, setPortionAmount] = useState(existing?.portionAmount?.toString() || '100');
  /** 'g', 'ml', or the food's own countable unit. Never assumed — it comes from the food. */
  const [portionUnit, setPortionUnit] = useState<PortionUnit>(existing?.portionUnit || 'g');
  const [mealType, setMealType] = useState<MealType>(existing?.mealType || routeMealType || inferMealTypeFromHour(new Date().getHours()));
  /** The food the macros are being scaled from, with its own reference basis and unit. */
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  const { presets } = portionPresetsFor(selectedFood, portionUnit);

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit Food Entry' : 'Log Food' });
  }, [existing, navigation]);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchFoods(debouncedSearch).then((results) => {
        setSearchResults(results);
        setShowResults(true);
      }).catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearch]);

  /** Write the macros for `amount` of `unit` of `food` into the nutrition fields. */
  const applyMacros = (food: FoodSearchResult, amount: number, unit: PortionUnit) => {
    const scaled = scalePortion(food, amount, unit);
    setCalories(scaled.calories.toString());
    setProtein(scaled.protein.toString());
    setCarbs(scaled.carbs.toString());
    setFats(scaled.fats.toString());
  };

  const selectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setName(food.name);
    // The food decides its own portion: a glass for a drink, one item for a countable
    // food, its reference quantity for a solid. Carrying over whatever number happened
    // to be in the field is how "250" ended up being read as 250 grams of milk.
    const { amount, unit } = defaultPortionFor(food);
    setPortionAmount(amount.toString());
    setPortionUnit(unit);
    applyMacros(food, amount, unit);
    setShowResults(false);
    setSearchQuery('');
  };

  const applyPortion = (amount: number) => {
    setPortionAmount(amount.toString());
    if (selectedFood) applyMacros(selectedFood, amount, portionUnit);
  };

  const handleAmountChange = (value: string) => {
    setPortionAmount(value);
    if (!selectedFood) return;
    const parsed = parseFloat(value);
    // A half-typed or cleared field falls back to the food's own default portion, not to
    // a flat 100 — 100 of a countable unit would be 100 eggs.
    const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPortionFor(selectedFood).amount;
    applyMacros(selectedFood, amount, portionUnit);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a food name' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        date: existing?.date || new Date(),
        name: name.trim(),
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fats) || 0,
        portionAmount: parseFloat(portionAmount) || undefined,
        portionUnit,
        mealType,
        startTime: existing?.startTime || MEAL_START_TIMES[mealType],
      };
      if (existing) {
        await updateFoodEntry(existing.id, data);
      } else {
        await addFoodEntry(data);
      }
      Toast.show({ type: 'success', text1: existing ? 'Entry updated' : 'Food logged' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!existing && (
          <View style={styles.searchSection}>
            <TextInput
              mode="outlined"
              label="Search food database"
              value={searchQuery}
              onChangeText={setSearchQuery}
              left={<TextInput.Icon icon="magnify" />}
              style={styles.input}
            />
            {showResults && searchResults.length > 0 && (
              <Card style={styles.resultsCard}>
                {searchResults.slice(0, 8).map((food, i) => (
                  <TouchableOpacity key={i} onPress={() => selectFood(food)} style={styles.resultItem}>
                    <Text variant="bodyMedium" numberOfLines={1}>{food.name}</Text>
                    <Text variant="bodySmall" style={styles.resultMeta}>{searchResultMeta(food)}</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>
        )}

        <TextInput mode="outlined" label="Food name" value={name} onChangeText={setName} style={styles.input} />

        <Text variant="titleSmall" style={styles.label}>Meal</Text>
        <SegmentedButtons
          value={mealType}
          onValueChange={(value) => setMealType(value as MealType)}
          buttons={MEAL_OPTIONS.map((meal) => ({
            value: meal,
            label: meal.charAt(0).toUpperCase() + meal.slice(1),
          }))}
          style={styles.segment}
        />

        <Text variant="titleSmall" style={styles.label}>Portion</Text>
        <View style={styles.portionRow}>
          <TextInput
            mode="outlined"
            label="Amount"
            value={portionAmount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            right={<TextInput.Affix text={portionUnit} />}
            style={styles.portionInput}
          />
          <View style={styles.presets}>
            {presets.map((amount) => (
              <Chip key={amount} compact onPress={() => applyPortion(amount)} selected={portionAmount === amount.toString()} style={styles.presetChip}>
                {amount}{portionUnit === 'g' || portionUnit === 'ml' ? portionUnit : ` ${portionUnit}`}
              </Chip>
            ))}
          </View>
        </View>

        <Text variant="titleSmall" style={styles.label}>Nutrition</Text>
        <View style={styles.nutritionRow}>
          <TextInput mode="outlined" label="Cal" value={calories} onChangeText={setCalories} keyboardType="numeric" dense style={styles.nutritionInput} />
          <TextInput mode="outlined" label="Protein" value={protein} onChangeText={setProtein} keyboardType="numeric" dense style={styles.nutritionInput} />
          <TextInput mode="outlined" label="Carbs" value={carbs} onChangeText={setCarbs} keyboardType="numeric" dense style={styles.nutritionInput} />
          <TextInput mode="outlined" label="Fats" value={fats} onChangeText={setFats} keyboardType="numeric" dense style={styles.nutritionInput} />
        </View>

        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>
          {existing ? 'Update Entry' : 'Log Food'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

