/**
 * Voice context — AsyncLocalStorage to tag events published during voice execution.
 * When voice executor runs actions, events published by services get `source: 'voice'` in payload.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

interface VoiceStore {
  source: 'voice';
}

const storage = new AsyncLocalStorage<VoiceStore>();

export const voiceContext = {
  run: <T>(fn: () => T) => storage.run({ source: 'voice' }, fn),
  getStore: () => storage.getStore(),
};
