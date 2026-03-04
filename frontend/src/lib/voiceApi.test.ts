import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseVoiceResult,
  submitVoiceAudio,
  pollForVoiceResult,
  understandTranscript,
  blobToBase64,
} from './voiceApi';

describe('parseVoiceResult', () => {
  it('returns unknown when data is null', () => {
    const result = parseVoiceResult(null);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('unknown');
  });

  it('returns unknown when data is empty object', () => {
    const result = parseVoiceResult({});
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('unknown');
  });

  it('returns unknown when actions is empty array', () => {
    const result = parseVoiceResult({ actions: [] });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('unknown');
  });

  it('returns unknown for add_schedule with empty items', () => {
    const result = parseVoiceResult({
      actions: [{ intent: 'add_schedule', items: [] }],
    });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('unknown');
  });

  it('parses valid actions array', () => {
    const result = parseVoiceResult({
      actions: [
        { intent: 'add_workout', title: 'Workout', date: '2025-01-17', exercises: [] },
      ],
    });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('add_workout');
  });

});

describe('submitVoiceAudio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns jobId when backend returns job', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-123', status: 'pending' }),
    });

    const result = await submitVoiceAudio('base64audio', 'audio/webm');
    expect(result).toEqual({ jobId: 'job-123', status: 'pending' });
  });

  it('throws when response is not ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Voice processing failed' }),
    });

    await expect(submitVoiceAudio('base64audio', 'audio/webm')).rejects.toThrow();
  });
});

describe('pollForVoiceResult', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns actions when job completes', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'completed',
          result: {
            actions: [{ intent: 'add_workout', title: 'Workout', exercises: [] }],
          },
        }),
    });

    const result = await pollForVoiceResult('job-123', { timeout: 1000, interval: 10 });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('add_workout');
  });

  it('throws when job fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed', error: 'Processing failed' }),
    });

    await expect(pollForVoiceResult('job-123', { timeout: 1000, interval: 10 })).rejects.toThrow(
      'Processing failed'
    );
  });

  it('throws when job returns 404', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Job not found or expired' }),
    });

    await expect(pollForVoiceResult('job-123', { timeout: 1000, interval: 10 })).rejects.toThrow(
      'Job not found or expired'
    );
  });
});

describe('understandTranscript', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns actions when backend returns sync response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          actions: [{ intent: 'add_workout', title: 'Workout', exercises: [] }],
        }),
    });

    const result = await understandTranscript('Add a workout');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].intent).toBe('add_workout');
  });
});

describe('blobToBase64', () => {
  it('converts blob to base64 string', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const result = await blobToBase64(blob);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
