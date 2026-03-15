// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Estimate storage size in bytes
function getStorageSize(): number {
  if (!isLocalStorageAvailable()) return 0;
  let total = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

// Check if storage quota might be exceeded (5MB limit, warn at 4.5MB)
function checkStorageQuota(_key: string, valueSize: number): { canStore: boolean; error?: string } {
  if (!isLocalStorageAvailable()) {
    return { canStore: false, error: 'LocalStorage is not available in this browser.' };
  }
  
  const currentSize = getStorageSize();
  const maxSize = 5 * 1024 * 1024; // 5MB
  const warningSize = 4.5 * 1024 * 1024; // 4.5MB
  const estimatedSize = currentSize + valueSize;
  
  if (estimatedSize > maxSize) {
    return {
      canStore: false,
      error: `Cannot save data: storage quota exceeded (${Math.round(estimatedSize / 1024 / 1024 * 100) / 100}MB / ${maxSize / 1024 / 1024}MB). Please delete some data.`
    };
  }
  
  if (estimatedSize > warningSize) {
    console.warn(`Storage is nearly full: ${Math.round(estimatedSize / 1024 / 1024 * 100) / 100}MB / ${maxSize / 1024 / 1024}MB`);
  }
  
  return { canStore: true };
}

export const storage = {
  get: <T>(key: string): T | null => {
    if (!isLocalStorageAvailable()) {
      console.warn('LocalStorage is not available. Data cannot be persisted.');
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      // Recursively convert date strings back to Date objects
      return reviveDates(parsed) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      console.error(`Error reading from localStorage (${key}):`, errorMessage);
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (!isLocalStorageAvailable()) {
      const error = 'LocalStorage is not available. Data cannot be saved.';
      console.error(error);
      throw new Error(error);
    }

    try {
      const serialized = JSON.stringify(value);
      const valueSize = new Blob([serialized]).size;
      
      const quotaCheck = checkStorageQuota(key, valueSize);
      if (!quotaCheck.canStore) {
        throw new Error(quotaCheck.error || 'Storage quota exceeded');
      }

      localStorage.setItem(key, serialized);
    } catch (error) {
      let errorMessage = 'Unknown error occurred while saving data.';
      
      if (error instanceof DOMException) {
        if (error.name === 'QuotaExceededError') {
          errorMessage = 'Storage quota exceeded. Please delete some data to free up space.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Storage access denied. Please check your browser settings.';
        } else {
          errorMessage = `Storage error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`Error saving to localStorage (${key}):`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  remove: (key: string): void => {
    if (!isLocalStorageAvailable()) {
      throw new Error('LocalStorage is not available.');
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      console.error(`Error removing from localStorage (${key}):`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  clear: (): void => {
    if (!isLocalStorageAvailable()) {
      throw new Error('LocalStorage is not available.');
    }

    try {
      localStorage.clear();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      console.error('Error clearing localStorage:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Utility methods
  isAvailable: isLocalStorageAvailable,
  getSize: getStorageSize,
};

// Helper function to convert date strings to Date objects
// Uses recursive type preservation to maintain type safety
type Revivable<T> = T extends string
  ? T | Date
  : T extends Array<infer U>
  ? Array<Revivable<U>>
  : T extends object
  ? { [K in keyof T]: Revivable<T[K]> }
  : T;

function reviveDates<T>(obj: T): Revivable<T> {
  if (obj === null || obj === undefined) return obj as Revivable<T>;
  
  if (typeof obj === 'string') {
    // Check if string matches ISO date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (dateRegex.test(obj)) {
      return new Date(obj) as Revivable<T>;
    }
    return obj as Revivable<T>;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => reviveDates(item)) as Revivable<T>;
  }
  
  if (typeof obj === 'object') {
    const result = {} as { [K in keyof T]: Revivable<T[K]> };
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = reviveDates(obj[key]);
      }
    }
    return result as Revivable<T>;
  }
  
  return obj as Revivable<T>;
}

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'trackvibe_token',
  TRANSACTIONS: 'trackvibe_transactions',
  WORKOUTS: 'trackvibe_workouts',
  WORKOUT_TEMPLATES: 'trackvibe_workout_templates',
  ENERGY: 'trackvibe_energy',
  FOOD_ENTRIES: 'trackvibe_food_entries',
  SETTINGS: 'trackvibe_settings',
  GOALS: 'trackvibe_goals',
  NOTIFICATION_PREFERENCES: 'trackvibe_notification_preferences',
} as const;
