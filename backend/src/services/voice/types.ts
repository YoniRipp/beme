export interface ExecuteResult {
  intent: string;
  success: boolean;
  message?: string;
}

export interface VoiceAction {
  intent: string;
  [key: string]: unknown;
}

export function parseDate(v: unknown): string {
  if (v == null || v === '') return new Date().toISOString().slice(0, 10);
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}
