/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickVoiceEntry from './QuickVoiceEntry';
import { LIMITS } from '@trackvibe/shared/constants';

vi.mock('@/features/energy/api', () => ({
  searchFoods: vi.fn(),
  lookupOrCreateFood: vi.fn(),
}));

/**
 * The real parser, with a seam.
 *
 * Everything below drives the shared parser for real; `mockReturnValueOnce` is used only
 * where a test has to state what the component does with a parsed SHAPE the parser is not
 * obliged to keep producing — a spelled-out unit that reaches the component as the word
 * rather than the abbreviation `foodText.ts` canonicalises to today.
 */
vi.mock('@/features/energy/parseFoodText', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/energy/parseFoodText')>();
  return { ...actual, parseFoodItems: vi.fn(actual.parseFoodItems) };
});

import { searchFoods } from '@/features/energy/api';
import { parseFoodItems, type ParsedFoodItem } from '@/features/energy/parseFoodText';

const searchFoodsMock = vi.mocked(searchFoods);
const parseFoodItemsMock = vi.mocked(parseFoodItems);

/** One parsed item, as the component receives it. */
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

const EGG = {
  name: 'Egg',
  calories: 155,
  protein: 13,
  carbs: 1.1,
  fat: 11,
  referenceGrams: 100,
  isLiquid: false,
  defaultUnit: 'egg',
  unitWeightGrams: 50,
};

/** A countable food whose published unit is heavy enough to make a misread count obvious. */
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

/** The kcal the review screen is about to save for the single resolved item. */
function loggedCalories(): number {
  return Number.parseInt(screen.getByText(/^\d+ kcal$/).textContent ?? '', 10);
}

/** Drive the typed path — jsdom has no Web Speech API — and land on the review screen. */
async function enter(text: string, onSave = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();
  render(
    <QuickVoiceEntry open={true} onOpenChange={vi.fn()} mealType="Lunch" onSave={onSave} />,
  );
  await user.click(screen.getByRole('button', { name: /or type it/i }));
  await user.type(screen.getByPlaceholderText(/2 eggs, toast with butter/i), text);
  await user.click(screen.getByRole('button', { name: /add items/i }));
  await screen.findByText(/1 item found/i);
  return { user, onSave };
}

describe('QuickVoiceEntry portion scaling', () => {
  beforeEach(() => {
    searchFoodsMock.mockReset();
  });

  it('scales a food published per 100 g to the grams the user spoke', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);

    const { user, onSave } = await enter('200g rice');

    // 130 kcal per 100 g, logged for a 200 g portion.
    expect(screen.getByText('260 kcal')).toBeInTheDocument();
    expect(screen.getByText(/P 5\.4g/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save all/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        name: 'Rice',
        calories: 260,
        protein: 5.4,
        carbs: 56,
        fats: 0.6,
        portionAmount: 200,
        portionUnit: 'g',
        mealType: 'lunch',
      }),
    ]);
  });

  it('scales a bare count by the weight the food publishes for one of its units', async () => {
    searchFoodsMock.mockResolvedValue([EGG]);

    await enter('3 eggs');

    // 3 x 50 g = 150 g, so 1.5x the published 155 kcal.
    expect(screen.getByText('233 kcal')).toBeInTheDocument();
  });

  it('leaves a unit with no unambiguous grams-equivalent on the published macros', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);

    // A cup of rice is a volume with no density in this response — unchanged, not guessed.
    await enter('2 cups rice');

    expect(screen.getByText('130 kcal')).toBeInTheDocument();
  });

  it('leaves an item with no amount on the published macros', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);

    await enter('rice');

    expect(screen.getByText('130 kcal')).toBeInTheDocument();
  });

  it('scales a bulk food by a spoken mass unit', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);

    await enter('200 grams of rice');

    // 130 kcal per 100 g, logged for the 200 g that was spoken.
    expect(loggedCalories()).toBe(260);
  });

  it('scales a countable food by a spoken mass, not by the weight of one of its units', async () => {
    searchFoodsMock.mockResolvedValue([BREAD]);

    await enter('200 grams of bread');

    // 200 GRAMS of bread — 530 kcal — not 200 SLICES of it, which is 12 kg and 31,800 kcal.
    expect(loggedCalories()).toBe(530);
  });

  it('takes a spelled-out mass unit that reaches it unabbreviated', async () => {
    searchFoodsMock.mockResolvedValue([RICE]);
    // `foodText.ts` canonicalises "grams" to "g" today. It is not obliged to, and the two
    // spellings name the same portion, so this component must scale either.
    parseFoodItemsMock.mockReturnValueOnce(parsedAs('rice', 200, 'grams'));

    await enter('200 grams of rice');

    expect(loggedCalories()).toBe(260);
  });

  it('takes a spelled-out mass unit on a countable food that reaches it unabbreviated', async () => {
    searchFoodsMock.mockResolvedValue([BREAD]);
    parseFoodItemsMock.mockReturnValueOnce(parsedAs('bread', 200, 'grams'));

    await enter('200 grams of bread');

    expect(loggedCalories()).toBe(530);
  });

  it('never reads a unit-less number as a count when the count is not a believable portion', async () => {
    searchFoodsMock.mockResolvedValue([BREAD]);

    // A transcript whose unit word went missing, which this product invites: the bulk entry
    // screen's own worked example is "250 grams of chicken with 300 pasta for lunch", and
    // its second half parses to `{ amount: 300, unit: null }`.
    const { user, onSave } = await enter('200 bread');

    // 200 slices is 12 kg of bread. The count is refused and the published macros stand.
    expect(loggedCalories()).toBe(265);
    expect(loggedCalories()).toBeLessThanOrEqual(LIMITS.MAX_CALORIES);

    await user.click(screen.getByRole('button', { name: /save all/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0][0].calories).toBe(265);
  });

  it('still reads a large but believable unit-less number as a count', async () => {
    searchFoodsMock.mockResolvedValue([EGG]);

    await enter('12 eggs');

    // 12 x 50 g = 600 g, 6x the published 155 kcal — a portion the entry form accepts, so
    // the count stands. The guard is about believable entries, not about small numbers.
    expect(loggedCalories()).toBe(930);
  });
});
