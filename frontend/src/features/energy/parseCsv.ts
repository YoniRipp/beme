import { type MealType, type ParsedFoodItem } from './parseFoodText';

function extractAmountAndUnit(text: string): { name: string; amount: number | null; unit: string | null } {
  const trimmed = text.trim();
  if (!trimmed) return { name: '', amount: null, unit: null };

  const prefixMatch = trimmed.match(/^(\d+\.?\d*)\s*(g|kg|ml|oz|cups?|tbsp|tsp|l)\s+(.+)$/i);
  if (prefixMatch) {
    return { name: prefixMatch[3].trim(), amount: parseFloat(prefixMatch[1]), unit: prefixMatch[2].toLowerCase() };
  }

  const suffixMatch = trimmed.match(/^(.+?)\s+(\d+\.?\d*)\s*(g|kg|ml|oz|cups?|tbsp|tsp|l)$/i);
  if (suffixMatch) {
    return { name: suffixMatch[1].trim(), amount: parseFloat(suffixMatch[2]), unit: suffixMatch[3].toLowerCase() };
  }

  const countMatch = trimmed.match(/^(\d+\.?\d*)\s+(.+)$/);
  if (countMatch) {
    return { name: countMatch[2].trim(), amount: parseFloat(countMatch[1]), unit: null };
  }

  return { name: trimmed, amount: null, unit: null };
}

function isMealLabel(text: string): MealType | null {
  const lower = text.trim().toLowerCase();
  if (lower === 'breakfast') return 'Breakfast';
  if (lower === 'lunch') return 'Lunch';
  if (lower === 'dinner') return 'Dinner';
  if (lower === 'snack' || lower === 'snacks') return 'Snack';
  return null;
}

export interface CsvParsedItem extends ParsedFoodItem {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export function parseCsvFile(content: string): CsvParsedItem[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect format: columnar CSV (has header with "meal" or "name") or simple "meal: items" format
  const firstLine = lines[0].toLowerCase();
  const isColumnar = firstLine.includes('meal') && (firstLine.includes('name') || firstLine.includes('food'));

  if (isColumnar) {
    return parseColumnarCsv(lines);
  }

  return parseSimpleCsv(lines);
}

function parseColumnarCsv(lines: string[]): CsvParsedItem[] {
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const mealIdx = headers.indexOf('meal');
  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'food');
  const amountIdx = headers.findIndex((h) => h === 'amount' || h === 'portion');
  const unitIdx = headers.indexOf('unit');
  const calIdx = headers.findIndex((h) => h === 'calories' || h === 'cal' || h === 'kcal');
  const proteinIdx = headers.findIndex((h) => h === 'protein' || h === 'p');
  const carbsIdx = headers.findIndex((h) => h === 'carbs' || h === 'c');
  const fatsIdx = headers.findIndex((h) => h === 'fats' || h === 'fat' || h === 'f');

  if (nameIdx === -1) return [];

  const items: CsvParsedItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[nameIdx]?.trim();
    if (!name) continue;

    const meal = mealIdx >= 0 ? (isMealLabel(cols[mealIdx] ?? '') ?? 'Snack') : 'Snack';
    const amount = amountIdx >= 0 ? parseFloat(cols[amountIdx] ?? '') || null : null;
    const unit = unitIdx >= 0 ? (cols[unitIdx]?.trim() || null) : null;

    const item: CsvParsedItem = {
      rawText: name,
      name,
      amount,
      unit,
      meal,
    };

    if (calIdx >= 0 && cols[calIdx]) {
      const cal = parseFloat(cols[calIdx]);
      if (!isNaN(cal)) item.calories = cal;
    }
    if (proteinIdx >= 0 && cols[proteinIdx]) {
      const p = parseFloat(cols[proteinIdx]);
      if (!isNaN(p)) item.protein = p;
    }
    if (carbsIdx >= 0 && cols[carbsIdx]) {
      const c = parseFloat(cols[carbsIdx]);
      if (!isNaN(c)) item.carbs = c;
    }
    if (fatsIdx >= 0 && cols[fatsIdx]) {
      const f = parseFloat(cols[fatsIdx]);
      if (!isNaN(f)) item.fats = f;
    }

    items.push(item);
  }

  return items;
}

function parseSimpleCsv(lines: string[]): CsvParsedItem[] {
  const items: CsvParsedItem[] = [];

  for (const line of lines) {
    // "breakfast: 2 eggs, 2 toasts" format
    const colonMatch = line.match(/^(breakfast|lunch|dinner|snacks?)\s*:\s*(.+)$/i);
    if (colonMatch) {
      const meal = isMealLabel(colonMatch[1]) ?? 'Snack';
      const foodItems = colonMatch[2].split(',').map((s) => s.trim()).filter(Boolean);
      for (const food of foodItems) {
        const { name, amount, unit } = extractAmountAndUnit(food);
        if (name) {
          items.push({ rawText: food, name, amount, unit, meal });
        }
      }
    }
  }

  return items;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
