/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickVoiceEntry from './QuickVoiceEntry';

vi.mock('@/features/energy/api', () => ({
  searchFoods: vi.fn(),
  lookupOrCreateFood: vi.fn(),
}));

import { searchFoods } from '@/features/energy/api';

const searchFoodsMock = vi.mocked(searchFoods);

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
});
