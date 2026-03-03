export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'ILS'
  | 'CHF'
  | 'CNY'
  | 'INR'
  | 'MXN'
  | 'BRL'
  | 'KRW'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'PLN'
  | 'TRY'
  | 'ZAR'
  | 'SGD'
  | 'HKD';

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type Units = 'metric' | 'imperial';
export type Theme = 'light' | 'dark' | 'system';
export type BalanceDisplayColor = 'green' | 'blue' | 'neutral' | 'primary';
export type BalanceDisplayLayout = 'compact' | 'with_income_expenses';

export interface AppSettings {
  currency: Currency;
  dateFormat: DateFormat;
  units: Units;
  theme: Theme;
  balanceDisplayColor: BalanceDisplayColor;
  balanceDisplayLayout: BalanceDisplayLayout;
  /** Category name → schedule color preset id (e.g. Work → 'blue'). Optional; defaults use built-in category colors. */
  scheduleCategoryColors?: Record<string, string>;
}

export const CURRENCIES: Currency[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'ILS',
  'CHF',
  'CNY',
  'INR',
  'MXN',
  'BRL',
  'KRW',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'TRY',
  'ZAR',
  'SGD',
  'HKD',
];

/** Labels for Settings dropdown (code – name). */
export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD – US Dollar',
  EUR: 'EUR – Euro',
  GBP: 'GBP – British Pound',
  JPY: 'JPY – Japanese Yen',
  CAD: 'CAD – Canadian Dollar',
  AUD: 'AUD – Australian Dollar',
  ILS: 'ILS – Israeli Shekel',
  CHF: 'CHF – Swiss Franc',
  CNY: 'CNY – Chinese Yuan',
  INR: 'INR – Indian Rupee',
  MXN: 'MXN – Mexican Peso',
  BRL: 'BRL – Brazilian Real',
  KRW: 'KRW – South Korean Won',
  SEK: 'SEK – Swedish Krona',
  NOK: 'NOK – Norwegian Krone',
  DKK: 'DKK – Danish Krone',
  PLN: 'PLN – Polish Złoty',
  TRY: 'TRY – Turkish Lira',
  ZAR: 'ZAR – South African Rand',
  SGD: 'SGD – Singapore Dollar',
  HKD: 'HKD – Hong Kong Dollar',
};
export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
];
export const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const BALANCE_DISPLAY_COLORS: { value: BalanceDisplayColor; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'primary', label: 'Primary' },
];

export const BALANCE_DISPLAY_LAYOUTS: { value: BalanceDisplayLayout; label: string }[] = [
  { value: 'compact', label: 'Balance only' },
  { value: 'with_income_expenses', label: 'Balance with income & expenses' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  dateFormat: 'DD/MM/YYYY',
  units: 'metric',
  theme: 'light',
  balanceDisplayColor: 'green',
  balanceDisplayLayout: 'with_income_expenses',
};
