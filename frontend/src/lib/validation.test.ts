import { describe, it, expect } from 'vitest';
import {
  validateTransactionAmount,
  validateTransactionDate,
  validateCategory,
  validateCalories,
  validateProtein,
  validateCarbs,
  validateFats,
  validateFoodName,
  validateWorkoutDuration,
  validateExerciseName,
  validateExerciseSets,
  validateExerciseReps,
  validateExerciseWeight,
  validateSleepHours,
  validateScheduleTime,
  validateTimeRange,
  isPositiveNumber,
  isNonNegativeNumber,
  isDateInRange,
} from './validation';
const SAMPLE_CATEGORIES = ['Food', 'Housing', 'Transportation', 'Entertainment', 'Other'] as const;

describe('isPositiveNumber', () => {
  it('returns true for positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(100)).toBe(true);
    expect(isPositiveNumber(0.5)).toBe(true);
  });

  it('returns false for zero or negative', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
  });

  it('returns false for non-finite numbers', () => {
    expect(isPositiveNumber(Infinity)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
  });
});

describe('isNonNegativeNumber', () => {
  it('returns true for zero and positive numbers', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(1)).toBe(true);
    expect(isNonNegativeNumber(100)).toBe(true);
  });

  it('returns false for negative numbers', () => {
    expect(isNonNegativeNumber(-1)).toBe(false);
  });
});

describe('isDateInRange', () => {
  it('returns true for dates within range', () => {
    const today = new Date();
    expect(isDateInRange(today, 1, 365)).toBe(true);
  });

  it('returns false for dates too far in future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    expect(isDateInRange(future, 1, 365)).toBe(false);
  });

  it('returns false for dates too far in past', () => {
    const past = new Date();
    past.setDate(past.getDate() - 366);
    expect(isDateInRange(past, 1, 365)).toBe(false);
  });
});

describe('validateTransactionAmount', () => {
  it('validates positive amounts', () => {
    expect(validateTransactionAmount(100).isValid).toBe(true);
    expect(validateTransactionAmount(0.01).isValid).toBe(true);
  });

  it('rejects negative or zero amounts', () => {
    expect(validateTransactionAmount(-1).isValid).toBe(false);
    expect(validateTransactionAmount(0).isValid).toBe(false);
  });

  it('rejects amounts below minimum', () => {
    expect(validateTransactionAmount(0.005).isValid).toBe(false);
  });

  it('rejects amounts above maximum', () => {
    expect(validateTransactionAmount(2000000).isValid).toBe(false);
  });
});

describe('validateTransactionDate', () => {
  it('validates valid dates', () => {
    const today = new Date();
    expect(validateTransactionDate(today).isValid).toBe(true);
  });

  it('rejects invalid dates', () => {
    const invalid = new Date('invalid');
    expect(validateTransactionDate(invalid).isValid).toBe(false);
  });

  it('rejects dates too far in future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    expect(validateTransactionDate(future).isValid).toBe(false);
  });
});

describe('validateCategory', () => {
  it('validates existing categories', () => {
    const result = validateCategory('Food', SAMPLE_CATEGORIES);
    expect(result.isValid).toBe(true);
  });

  it('rejects empty category', () => {
    const result = validateCategory('', SAMPLE_CATEGORIES);
    expect(result.isValid).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = validateCategory('InvalidCategory', SAMPLE_CATEGORIES);
    expect(result.isValid).toBe(false);
  });
});

describe('validateCalories', () => {
  it('validates non-negative calories', () => {
    expect(validateCalories(0).isValid).toBe(true);
    expect(validateCalories(2000).isValid).toBe(true);
  });

  it('rejects negative calories', () => {
    expect(validateCalories(-1).isValid).toBe(false);
  });

  it('rejects calories above maximum', () => {
    expect(validateCalories(15000).isValid).toBe(false);
  });
});

describe('validateProtein', () => {
  it('validates valid protein amounts', () => {
    expect(validateProtein(50).isValid).toBe(true);
    expect(validateProtein(0).isValid).toBe(true);
  });

  it('rejects negative protein', () => {
    expect(validateProtein(-1).isValid).toBe(false);
  });

  it('rejects protein above maximum', () => {
    expect(validateProtein(600).isValid).toBe(false);
  });
});

describe('validateFoodName', () => {
  it('validates non-empty names', () => {
    expect(validateFoodName('Chicken').isValid).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateFoodName('').isValid).toBe(false);
    expect(validateFoodName('   ').isValid).toBe(false);
  });

  it('rejects names too long', () => {
    const longName = 'a'.repeat(101);
    expect(validateFoodName(longName).isValid).toBe(false);
  });
});

describe('validateWorkoutDuration', () => {
  it('validates positive durations', () => {
    expect(validateWorkoutDuration(30).isValid).toBe(true);
    expect(validateWorkoutDuration(60).isValid).toBe(true);
  });

  it('rejects zero or negative durations', () => {
    expect(validateWorkoutDuration(0).isValid).toBe(false);
    expect(validateWorkoutDuration(-1).isValid).toBe(false);
  });

  it('rejects durations above maximum', () => {
    expect(validateWorkoutDuration(500).isValid).toBe(false);
  });
});

describe('validateExerciseName', () => {
  it('validates non-empty exercise names', () => {
    expect(validateExerciseName('Bench Press').isValid).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateExerciseName('').isValid).toBe(false);
  });
});

describe('validateExerciseSets', () => {
  it('validates positive sets', () => {
    expect(validateExerciseSets(3).isValid).toBe(true);
  });

  it('rejects zero or negative sets', () => {
    expect(validateExerciseSets(0).isValid).toBe(false);
    expect(validateExerciseSets(-1).isValid).toBe(false);
  });
});

describe('validateExerciseReps', () => {
  it('validates positive reps', () => {
    expect(validateExerciseReps(10).isValid).toBe(true);
  });

  it('rejects zero or negative reps', () => {
    expect(validateExerciseReps(0).isValid).toBe(false);
    expect(validateExerciseReps(-1).isValid).toBe(false);
  });
});

describe('validateExerciseWeight', () => {
  it('validates undefined weight (optional)', () => {
    expect(validateExerciseWeight(undefined).isValid).toBe(true);
  });

  it('validates non-negative weight', () => {
    expect(validateExerciseWeight(0).isValid).toBe(true);
    expect(validateExerciseWeight(100).isValid).toBe(true);
  });

  it('rejects negative weight', () => {
    expect(validateExerciseWeight(-1).isValid).toBe(false);
  });
});

describe('validateSleepHours', () => {
  it('validates valid sleep hours', () => {
    expect(validateSleepHours(7.5).isValid).toBe(true);
    expect(validateSleepHours(0).isValid).toBe(true);
  });

  it('rejects negative hours', () => {
    expect(validateSleepHours(-1).isValid).toBe(false);
  });

  it('rejects hours above maximum', () => {
    expect(validateSleepHours(25).isValid).toBe(false);
  });
});

describe('validateScheduleTime', () => {
  it('validates correct time format', () => {
    expect(validateScheduleTime('09:30').isValid).toBe(true);
    expect(validateScheduleTime('23:59').isValid).toBe(true);
  });

  it('rejects invalid time format', () => {
    expect(validateScheduleTime('9:30').isValid).toBe(false);
    expect(validateScheduleTime('25:00').isValid).toBe(false);
    expect(validateScheduleTime('invalid').isValid).toBe(false);
  });
});

describe('validateTimeRange', () => {
  it('validates valid time ranges', () => {
    expect(validateTimeRange('09:00', '17:00').isValid).toBe(true);
  });

  it('validates overnight ranges', () => {
    expect(validateTimeRange('23:00', '07:00').isValid).toBe(true);
  });

  it('rejects invalid ranges', () => {
    expect(validateTimeRange('17:00', '09:00').isValid).toBe(false);
  });
});
