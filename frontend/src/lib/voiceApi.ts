import { request } from '@/core/api/client';
import { toLocalDateString } from './dateRanges';
import { parseVoiceAction, type VoiceAction } from '@/schemas/voice';

export type { VoiceAction };

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

export interface VoiceExecuteResult {
  intent: string;
  success: boolean;
  message?: string;
}

export interface VoiceUnderstandResult {
  actions: VoiceAction[];
  results?: VoiceExecuteResult[];
}

export function parseVoiceResult(data: { actions?: unknown[]; results?: unknown[] } | null): VoiceUnderstandResult {
  if (!data) return { actions: [{ intent: 'unknown' }] };
  const rawActions = Array.isArray(data.actions) ? data.actions : [];
  const actions: VoiceAction[] = [];
  for (const raw of rawActions) {
    if (raw && typeof raw === 'object') {
      const action = parseVoiceAction(raw);
      actions.push(action);
    }
  }
  if (actions.length === 0) {
    actions.push({ intent: 'unknown' });
  }
  const results = Array.isArray(data.results) ? (data.results as VoiceExecuteResult[]) : undefined;
  return { actions, results };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timeoutId = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** Submit audio for voice processing. Returns jobId for polling. */
export async function submitVoiceAudio(
  audio: string,
  mimeType: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ jobId: string; status: string }> {
  const today = toLocalDateString(new Date());
  const timezone = getUserTimezone();

  try {
    return await request<{ jobId: string; status: string }>('/api/voice/understand', {
      method: 'POST',
      body: { audio, mimeType, today, timezone },
      timeoutMs: options?.timeoutMs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION_REFUSED') || msg.includes('NetworkError')) {
      throw new Error('Backend not reachable. Start the backend (e.g. npm run dev in backend/) and try again.');
    }
    throw e;
  }
}

/** Poll for voice job completion. */
export async function pollForVoiceResult(
  jobId: string,
  options?: { timeout?: number; interval?: number; signal?: AbortSignal }
): Promise<VoiceUnderstandResult> {
  const timeout = options?.timeout ?? 30000;
  const interval = options?.interval ?? 500;
  const start = Date.now();
  const signal = options?.signal;

  while (Date.now() - start < timeout) {
    if (signal?.aborted) {
      throw new DOMException('Polling cancelled', 'AbortError');
    }

    const data = await request<{ status: string; result?: { actions?: unknown[]; results?: unknown[] }; error?: string }>(
      `/api/jobs/${jobId}`,
    );

    if (data.status === 'completed') {
      return parseVoiceResult(data.result ?? null);
    }
    if (data.status === 'failed') {
      throw new Error(data.error ?? 'Voice processing failed. Please try again.');
    }

    await sleep(interval, signal);
  }

  throw new Error('Voice processing timed out');
}

/** Convert Blob to base64 string (without data URL prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 ?? '');
    };
    reader.onerror = () => {
      reject(new Error('Could not read audio data. Please try recording again.'));
    };
    reader.readAsDataURL(blob);
  });
}

/** Legacy: Submit transcript for sync processing. Used by VoiceAgentButton when backend supports it. */
export async function understandTranscript(
  transcript: string,
  _lang?: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<VoiceUnderstandResult> {
  const today = toLocalDateString(new Date());
  const timezone = getUserTimezone();

  const data = await request<{ actions?: unknown[]; results?: unknown[]; jobId?: string }>('/api/voice/understand', {
    method: 'POST',
    body: { transcript: transcript.trim(), today, timezone },
    timeoutMs: options?.timeoutMs,
  });

  if (data.jobId) {
    return pollForVoiceResult(data.jobId, { signal: options?.signal });
  }
  return parseVoiceResult(data);
}
