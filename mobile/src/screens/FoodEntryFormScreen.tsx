import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList } from 'react-native';
import { TextInput, Button, Text, Card, Chip } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEnergy } from '../hooks/useEnergy';
import { useDebounce } from '../hooks/useDebounce';
import { searchFoods, FoodSearchResult } from '../core/api/food';
import Toast from 'react-native-toast-message';

const PORTION_PRESETS = [50, 100, 150, 200];

export function FoodEntryFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const entryId = route.params?.entryId;
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
  const [basePer100g, setBasePer100g] = useState<FoodSearchResult | null>(null);
  const [saving, setSaving] = useState(false);

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

  const selectFood = (food: FoodSearchResult) => {
    setBasePer100g(food);
    setName(food.name);
    const portion = parseFloat(portionAmount) || 100;
    const scale = portion / 100;
    setCalories(Math.round(food.calories * scale).toString());
    setProtein(Math.round(food.protein * scale).toString());
    setCarbs(Math.round(food.carbs * scale).toString());
    setFats(Math.round(food.fat * scale).toString());
    setShowResults(false);
    setSearchQuery('');
  };

  const applyPortion = (grams: number) => {
    setPortionAmount(grams.toString());
    if (basePer100g) {
      const scale = grams / 100;
      setCalories(Math.round(basePer100g.calories * scale).toString());
      setProtein(Math.round(basePer100g.protein * scale).toString());
      setCarbs(Math.round(basePer100g.carbs * scale).toString());
      setFats(Math.round(basePer100g.fat * scale).toString());
    }
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
        portionUnit: 'g' as const,
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
                    <Text variant="bodySmall" style={styles.resultMeta}>{food.calories} cal/100g</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>
        )}

        <TextInput mode="outlined" label="Food name" value={name} onChangeText={setName} style={styles.input} />

        <Text variant="titleSmall" style={styles.label}>Portion</Text>
        <View style={styles.portionRow}>
          <TextInput
            mode="outlined"
            label="Amount"
            value={portionAmount}
            onChangeText={(v) => { setPortionAmount(v); if (basePer100g) applyPortion(parseFloat(v) || 100); }}
            keyboardType="numeric"
            right={<TextInput.Affix text="g" />}
            style={styles.portionInput}
          />
          <View style={styles.presets}>
            {PORTION_PRESETS.map((g) => (
              <Chip key={g} compact onPress={() => applyPortion(g)} selected={portionAmount === g.toString()} style={styles.presetChip}>
                {g}g
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  searchSection: { marginBottom: 8 },
  input: { marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 8, fontWeight: '600' },
  resultsCard: { marginTop: -8, marginBottom: 12 },
  resultItem: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resultMeta: { color: '#6b7280' },
  portionRow: { marginBottom: 12 },
  portionInput: { marginBottom: 8 },
  presets: { flexDirection: 'row', gap: 8 },
  presetChip: { marginRight: 4 },
  nutritionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  nutritionInput: { flex: 1 },
  saveButton: { marginTop: 8, backgroundColor: '#3b82f6' },
});
