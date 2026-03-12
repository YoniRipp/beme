import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, FileSpreadsheet, Type, ListPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { searchFoods } from '@/core/api/food';
import { mealPlanApi } from '@/core/api/mealPlan';
import type { MealPlanItem, MealPlanTemplate, MealType } from '@/types/mealPlan';
import * as XLSX from 'xlsx';

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_KEYWORDS: Record<string, MealType> = {
  breakfast: 'Breakfast',
  morning: 'Breakfast',
  lunch: 'Lunch',
  afternoon: 'Snack',
  snack: 'Snack',
  dinner: 'Dinner',
  evening: 'Dinner',
  supper: 'Dinner',
};

interface MealPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description?: string; items: Omit<MealPlanItem, 'id'>[] }) => Promise<unknown>;
  editTemplate?: MealPlanTemplate;
  saving: boolean;
}

type DraftItem = Omit<MealPlanItem, 'id'> & { _key: string };

let keyCounter = 0;
function nextKey() {
  return `draft-${++keyCounter}`;
}

function parseMealTypeFromText(line: string): MealType {
  const lower = line.toLowerCase();
  for (const [keyword, meal] of Object.entries(MEAL_KEYWORDS)) {
    if (lower.includes(keyword)) return meal;
  }
  return 'Lunch';
}

function parsePortionFromText(text: string): { name: string; portionAmount?: number; portionUnit?: string } {
  const match = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(g|kg|ml|oz|cup|cups|tbsp|tsp|serving|servings|slice|slices|piece|pieces)?\s*$/i);
  if (match) {
    return {
      name: match[1].trim(),
      portionAmount: parseFloat(match[2]),
      portionUnit: match[3]?.toLowerCase() || 'g',
    };
  }
  return { name: text.trim() };
}

function parseTextInput(text: string): DraftItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: DraftItem[] = [];
  let currentMeal: MealType = 'Breakfast';
  let sortOrder = 0;

  for (const line of lines) {
    // Check if this is a meal header line (e.g., "Breakfast:" or "## Lunch")
    const headerMatch = line.match(/^(?:#{1,3}\s*)?(?:(breakfast|lunch|dinner|snack|morning|evening|afternoon|supper)\s*[:—\-]?\s*)$/i);
    if (headerMatch) {
      currentMeal = parseMealTypeFromText(headerMatch[1]);
      continue;
    }

    // Check for "MealType: FoodName" pattern
    const prefixMatch = line.match(/^(breakfast|lunch|dinner|snack)\s*[:—\-]\s*(.+)$/i);
    let foodPart = line;
    if (prefixMatch) {
      currentMeal = parseMealTypeFromText(prefixMatch[1]);
      foodPart = prefixMatch[2];
    } else {
      // Check for "FoodName - MealType" suffix pattern
      const suffixMatch = line.match(/^(.+)\s*[-—]\s*(breakfast|lunch|dinner|snack)$/i);
      if (suffixMatch) {
        foodPart = suffixMatch[1];
        currentMeal = parseMealTypeFromText(suffixMatch[2]);
      } else {
        // No explicit meal type - use position-based assignment
        const lineIndex = items.length;
        if (lineIndex < 2) currentMeal = 'Breakfast';
        else if (lineIndex < 4) currentMeal = 'Lunch';
        else if (lineIndex < 6) currentMeal = 'Dinner';
        else currentMeal = 'Snack';
      }
    }

    // Remove bullet points and list markers
    foodPart = foodPart.replace(/^[-•*]\s*/, '').trim();
    if (!foodPart) continue;

    const parsed = parsePortionFromText(foodPart);
    items.push({
      _key: nextKey(),
      mealType: currentMeal,
      name: parsed.name,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      portionAmount: parsed.portionAmount,
      portionUnit: parsed.portionUnit,
      startTime: undefined,
      sortOrder: sortOrder++,
    });
  }

  return items;
}

function parseExcelData(data: unknown[][]): DraftItem[] {
  if (data.length < 2) return [];
  const headers = (data[0] as string[]).map((h) => String(h).toLowerCase().trim());

  const mealIdx = headers.findIndex((h) => h === 'meal' || h === 'meal type' || h === 'mealtype');
  const nameIdx = headers.findIndex((h) => h === 'food' || h === 'food name' || h === 'name' || h === 'item');
  const portionIdx = headers.findIndex((h) => h === 'portion' || h === 'amount' || h === 'serving');
  const timeIdx = headers.findIndex((h) => h === 'time' || h === 'start time');

  if (nameIdx === -1) return [];

  const items: DraftItem[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number | undefined)[];
    const name = row[nameIdx] ? String(row[nameIdx]).trim() : '';
    if (!name) continue;

    const mealRaw = mealIdx >= 0 && row[mealIdx] ? String(row[mealIdx]).trim() : '';
    const mealType = mealRaw ? parseMealTypeFromText(mealRaw) : 'Lunch';

    let portionAmount: number | undefined;
    let portionUnit: string | undefined;
    if (portionIdx >= 0 && row[portionIdx]) {
      const portionStr = String(row[portionIdx]);
      const match = portionStr.match(/(\d+(?:\.\d+)?)\s*(\w+)?/);
      if (match) {
        portionAmount = parseFloat(match[1]);
        portionUnit = match[2] || 'g';
      }
    }

    const startTime = timeIdx >= 0 && row[timeIdx] ? String(row[timeIdx]).trim() : undefined;

    items.push({
      _key: nextKey(),
      mealType,
      name,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      portionAmount,
      portionUnit,
      startTime,
      sortOrder: i - 1,
    });
  }

  return items;
}

function ItemEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: DraftItem;
  onUpdate: (key: string, updates: Partial<DraftItem>) => void;
  onRemove: (key: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.portionAmount ? `${item.portionAmount}${item.portionUnit || 'g'} · ` : ''}
            {item.calories} cal · P{Math.round(item.protein)}g · C{Math.round(item.carbs)}g · F{Math.round(item.fats)}g
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onRemove(item._key)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input
            value={item.name}
            onChange={(e) => onUpdate(item._key, { name: e.target.value })}
            placeholder="Food name"
            className="text-sm"
          />
        </div>
        <select
          value={item.mealType}
          onChange={(e) => onUpdate(item._key, { mealType: e.target.value as MealType })}
          className="text-sm border rounded-md px-2 py-1.5 bg-background"
        >
          {MEAL_ORDER.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex gap-1">
          <Input
            type="number"
            value={item.portionAmount ?? ''}
            onChange={(e) => onUpdate(item._key, { portionAmount: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Amt"
            className="text-sm w-20"
          />
          <Input
            value={item.portionUnit ?? ''}
            onChange={(e) => onUpdate(item._key, { portionUnit: e.target.value })}
            placeholder="g"
            className="text-sm w-16"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-xs">Cal</Label>
          <Input
            type="number"
            value={item.calories}
            onChange={(e) => onUpdate(item._key, { calories: Number(e.target.value) || 0 })}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Protein</Label>
          <Input
            type="number"
            value={item.protein}
            onChange={(e) => onUpdate(item._key, { protein: Number(e.target.value) || 0 })}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Carbs</Label>
          <Input
            type="number"
            value={item.carbs}
            onChange={(e) => onUpdate(item._key, { carbs: Number(e.target.value) || 0 })}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Fats</Label>
          <Input
            type="number"
            value={item.fats}
            onChange={(e) => onUpdate(item._key, { fats: Number(e.target.value) || 0 })}
            className="text-sm"
          />
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setEditing(false)} className="w-full">
        Done
      </Button>
    </div>
  );
}

function FormInputTab({ onAddItem }: { onAddItem: (item: DraftItem) => void }) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [portionAmount, setPortionAmount] = useState('');
  const [portionUnit, setPortionUnit] = useState('g');
  const [searchResults, setSearchResults] = useState<{ name: string; calories: number; protein: number; carbs: number; fat: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedNutrition, setSelectedNutrition] = useState<{ calories: number; protein: number; carbs: number; fat: number; per100g: boolean } | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchFoods(query, 5);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(name), 300);
    return () => clearTimeout(timer);
  }, [name, handleSearch]);

  const selectFood = (food: typeof searchResults[0]) => {
    setName(food.name);
    setSelectedNutrition({ calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, per100g: true });
    setSearchResults([]);
  };

  const handleAdd = () => {
    if (!name.trim()) return;

    let calories = 0, protein = 0, carbs = 0, fats = 0;
    if (selectedNutrition) {
      const scale = selectedNutrition.per100g && portionAmount ? Number(portionAmount) / 100 : 1;
      calories = Math.round(selectedNutrition.calories * scale);
      protein = Math.round(selectedNutrition.protein * scale * 10) / 10;
      carbs = Math.round(selectedNutrition.carbs * scale * 10) / 10;
      fats = Math.round(selectedNutrition.fat * scale * 10) / 10;
    }

    onAddItem({
      _key: nextKey(),
      mealType,
      name: name.trim(),
      calories,
      protein,
      carbs,
      fats,
      portionAmount: portionAmount ? Number(portionAmount) : undefined,
      portionUnit: portionUnit || undefined,
      startTime: undefined,
      sortOrder: 0,
    });

    setName('');
    setPortionAmount('');
    setSelectedNutrition(null);
    setSearchResults([]);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Label className="text-sm">Food Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Search or type food name..."
          className="mt-1"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((food, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-b-0"
                onClick={() => selectFood(food)}
              >
                <span className="font-medium">{food.name}</span>
                <span className="text-muted-foreground ml-2">{food.calories} cal/100g</span>
              </button>
            ))}
          </div>
        )}
        {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-sm">Meal</Label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="w-full text-sm border rounded-md px-2 py-2 bg-background mt-1"
          >
            {MEAL_ORDER.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-sm">Amount</Label>
          <Input
            type="number"
            value={portionAmount}
            onChange={(e) => setPortionAmount(e.target.value)}
            placeholder="200"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Unit</Label>
          <Input
            value={portionUnit}
            onChange={(e) => setPortionUnit(e.target.value)}
            placeholder="g"
            className="mt-1"
          />
        </div>
      </div>

      {selectedNutrition && (
        <p className="text-xs text-muted-foreground">
          Per 100g: {selectedNutrition.calories} cal · P{selectedNutrition.protein}g · C{selectedNutrition.carbs}g · F{selectedNutrition.fat}g
          {portionAmount && ` → Scaled: ${Math.round(selectedNutrition.calories * Number(portionAmount) / 100)} cal`}
        </p>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={handleAdd} disabled={!name.trim()}>
        <Plus className="w-4 h-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}

export function MealPlanModal({ open, onOpenChange, onSave, editTemplate, saving }: MealPlanModalProps) {
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [textInput, setTextInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      if (editTemplate) {
        setPlanName(editTemplate.name);
        setDescription(editTemplate.description || '');
        setItems(editTemplate.items.map((item) => ({ ...item, _key: nextKey() })));
      } else {
        setPlanName('');
        setDescription('');
        setItems([]);
        setTextInput('');
      }
    }
  }, [open, editTemplate]);

  const updateItem = useCallback((key: string, updates: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item) => (item._key === key ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item._key !== key));
  }, []);

  const addItem = useCallback((item: DraftItem) => {
    setItems((prev) => [...prev, { ...item, sortOrder: prev.length }]);
  }, []);

  const handleParseText = () => {
    const parsed = parseTextInput(textInput);
    if (parsed.length === 0) {
      toast.error('Could not parse any food items from the text');
      return;
    }
    setItems((prev) => [...prev, ...parsed.map((item, i) => ({ ...item, sortOrder: prev.length + i }))]);
    setTextInput('');
    toast.success(`Parsed ${parsed.length} items`);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        let parsed: DraftItem[] = [];

        if (file.name.endsWith('.csv')) {
          const text = data as string;
          const rows = text.split('\n').map((row) => row.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
          parsed = parseExcelData(rows);
        } else {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
          parsed = parseExcelData(jsonData);
        }

        if (parsed.length === 0) {
          toast.error('No items found. Expected columns: Meal, Food Name, Portion, Time');
          return;
        }

        setItems((prev) => [...prev, ...parsed.map((item, i) => ({ ...item, sortOrder: prev.length + i }))]);
        toast.success(`Imported ${parsed.length} items from ${file.name}`);
      } catch {
        toast.error('Failed to parse file');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    e.target.value = '';
  };

  const handleLookupNutrition = async () => {
    const namesToLookup = items.filter((item) => item.calories === 0).map((item) => item.name);
    if (namesToLookup.length === 0) {
      toast.info('All items already have nutrition data');
      return;
    }

    setLookingUp(true);
    try {
      const results = await mealPlanApi.lookupNutrition(namesToLookup);
      setItems((prev) =>
        prev.map((item) => {
          if (item.calories > 0) return item;
          const nutrition = results[item.name];
          if (!nutrition) return item;

          const scale = item.portionAmount ? item.portionAmount / 100 : 1;
          return {
            ...item,
            calories: Math.round(nutrition.calories * scale),
            protein: Math.round(nutrition.protein * scale * 10) / 10,
            carbs: Math.round(nutrition.carbs * scale * 10) / 10,
            fats: Math.round(nutrition.fat * scale * 10) / 10,
          };
        }),
      );
      const found = Object.values(results).filter(Boolean).length;
      toast.success(`Found nutrition for ${found}/${namesToLookup.length} items`);
    } catch {
      toast.error('Failed to look up nutrition');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error('Please enter a plan name');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one food item');
      return;
    }

    try {
      await onSave({
        name: planName.trim(),
        description: description.trim() || undefined,
        items: items.map(({ _key, ...item }, i) => ({ ...item, sortOrder: i })),
      });
      toast.success(editTemplate ? 'Meal plan updated' : 'Meal plan saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save meal plan');
    }
  };

  const groupedItems = MEAL_ORDER.map((meal) => ({
    meal,
    items: items.filter((item) => item.mealType === meal),
  })).filter((g) => g.items.length > 0);

  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTemplate ? 'Edit Meal Plan' : 'Create Meal Plan'}</DialogTitle>
          <DialogDescription>
            Add foods via text, form, or Excel upload. Nutrition is auto-looked up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Name & Description */}
          <div className="space-y-2">
            <div>
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., Clean Eating Monday"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="plan-desc">Description (optional)</Label>
              <Input
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., High protein, low carb day"
                className="mt-1"
              />
            </div>
          </div>

          {/* Input Tabs */}
          <Tabs defaultValue="text">
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1 gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Text
              </TabsTrigger>
              <TabsTrigger value="form" className="flex-1 gap-1.5">
                <ListPlus className="w-3.5 h-3.5" />
                Form
              </TabsTrigger>
              <TabsTrigger value="excel" className="flex-1 gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Paste your meal plan, e.g.:\nBreakfast: Oatmeal 200g\nBreakfast: Banana\nLunch: Chicken Breast 150g\nLunch: Rice 200g\nDinner: Salmon 180g\nSnack: Greek Yogurt 150g`}
                rows={6}
                className="text-sm"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={handleParseText} disabled={!textInput.trim()}>
                Parse Text
              </Button>
            </TabsContent>

            <TabsContent value="form">
              <FormInputTab onAddItem={addItem} />
            </TabsContent>

            <TabsContent value="excel" className="space-y-2">
              <Card className="p-4 border-dashed">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload .csv or .xlsx file</span>
                  <span className="text-xs text-muted-foreground">Expected columns: Meal, Food Name, Portion, Time</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" type="button" className="pointer-events-none">
                    Choose File
                  </Button>
                </label>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Items Preview */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  Items ({items.length}) · {totalCalories} cal
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLookupNutrition}
                  disabled={lookingUp}
                >
                  {lookingUp ? 'Looking up...' : 'Auto-fill Nutrition'}
                </Button>
              </div>

              {groupedItems.map(({ meal, items: mealItems }) => (
                <div key={meal}>
                  <p className="text-sm font-medium text-muted-foreground mb-1.5">{meal}</p>
                  <div className="space-y-1.5">
                    {mealItems.map((item) => (
                      <ItemEditor key={item._key} item={item} onUpdate={updateItem} onRemove={removeItem} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <Button className="w-full" onClick={handleSave} disabled={saving || !planName.trim() || items.length === 0}>
            {saving ? 'Saving...' : editTemplate ? 'Update Meal Plan' : 'Save Meal Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
