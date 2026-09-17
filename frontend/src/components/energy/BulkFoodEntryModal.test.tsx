/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkFoodEntryModal } from './BulkFoodEntryModal';

vi.mock('@/features/energy/api', () => ({
  searchFoods: vi.fn(),
  lookupOrCreateFood: vi.fn(),
}));

/**
 * The real parser, with a seam — see `QuickVoiceEntry.test.tsx`. `mockReturnValueOnce` is
 * used only where a test states what this modal does with a parsed SHAPE the shared parser
 * is not obliged to keep producing.
 */
vi.mock('@/features/energy/parseFoodText', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/energy/parseFoodText')>();
  return { ...actual, parseFoodItems: vi.fn(actual.parseFoodItems) };
});

import { searchFoods } from '@/features/energy/api';
import { parseFoodItems, type ParsedFoodItem } from '@/features/energy/parseFoodText';

const searchFoodsMock = vi.mocked(searchFoods);
const parseFoodItemsMock = vi.mocked(parseFoodItems);

const parsedAs = (name: string, amount: number, unit: string | null): ParsedFoodItem[] => [
  { rawText: `${amount} ${unit ?? ''} ${name}`.trim(), name, amount, unit, meal: 'Lunch' },
];

/** `/api/food/search` publishes macros against `referenceGrams` — 100 for every food today. */
const RICE = {
  name: 'Rice',
  calories: 130,
  protein: 2.7,
  carbs: 28,
  fat: 0.3,
  referenceGrams: 100,
  isLiquid: false,
  defaultUnit: null,
  unitWeightGrams: null,
};

/** A countable food: `unitWeightGrams` is one slice, so a misread count multiplies by 60. */
const BREAD = {
  name: 'Bread',
  calories: 265,
  protein: 9,
  carbs: 49,
  fat: 3.2,
  referenceGrams: 100,
  isLiquid: false,
  defaultUnit: 'slice',
  unitWeightGrams: 60,
};

/** Type a menu into the Text tab and land on the review screen. */
async function parseText(text: string) {
  const user = userEvent.setup();
  render(<BulkFoodEntryModal open={true} onOpenChange={vi.fn()} onSave={vi.fn()} />);
  await user.type(screen.getByPlaceholderText(/2 eggs and 2 toasts/i), text);
  await user.click(screen.getByRole('button', { name: /parse & look up nutrition/i }));
  return user;
}

describe('BulkFoodEntryModal portion scaling', () => {
  beforeEach(() => {
    searchFoodsMock.mockReset();
  });

  it('scales a bulk food by a spoken mass unit', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);

    await parseText('200 grams of rice');

    // 130 kcal per 100 g, logged for the 200 g that was spoken.
    expect(await screen.findByRole('button', { name: 'Add 1 Items (260 cal)' })).toBeInTheDocument();
  });

  it('takes a spelled-out mass unit that reaches it unabbreviated', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);
    // `foodText.ts` canonicalises "kilograms" to "kg" today. It is not obliged to, and both
    // spellings name the same portion.
    parseFoodItemsMock.mockReturnValueOnce(parsedAs('rice', 2, 'kilograms'));

    await parseText('2 kilograms of rice');

    // 2 kg, not the 2 g an unrecognised unit used to fall through to.
    expect(await screen.findByRole('button', { name: 'Add 1 Items (2600 cal)' })).toBeInTheDocument();
  });

  it('never reads a unit-less number as a count when the count is not a believable portion', async () => {
    searchFoodsMock.mockResolvedValue([BREAD]);

    // A transcript whose unit word went missing — the shape this screen's own placeholder
    // invites with "250 grams of chicken with 300 pasta for lunch".
    await parseText('200 bread');

    // 200 slices is 12 kg of bread and 31,800 kcal. Refused, so the number falls through to
    // this file's existing "assume grams": 200 g of bread.
    expect(await screen.findByRole('button', { name: 'Add 1 Items (530 cal)' })).toBeInTheDocument();
  });

  it('still counts a portion word against the weight the food publishes for one unit', async () => {
    searchFoodsMock.mockResolvedValue([BREAD]);

    await parseText('3 slices of bread');

    // 3 x 60 g = 180 g, 1.8x the published 265 kcal — believable, so the count stands.
    expect(await screen.findByRole('button', { name: 'Add 1 Items (477 cal)' })).toBeInTheDocument();
  });
});
