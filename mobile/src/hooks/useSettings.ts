import { useContext } from 'react';
import { SettingsContext, SettingsContextType } from '../context/SettingsContext';

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
