import { describe, it, expect } from 'vitest';
import { FALLBACK_FIRST_NAME, firstNameOf, homeProgressMessage } from '../greeting';

describe('firstNameOf', () => {
  it('takes the first word, not the whole name', () => {
    expect(firstNameOf('Yoni Ripp')).toBe('Yoni');
    expect(firstNameOf('Ana Maria de Souza')).toBe('Ana');
  });

  it('passes a single-word name through', () => {
    expect(firstNameOf('Yoni')).toBe('Yoni');
  });

  it('falls back when the account has no usable name', () => {
    expect(firstNameOf(undefined)).toBe(FALLBACK_FIRST_NAME);
    expect(firstNameOf(null)).toBe(FALLBACK_FIRST_NAME);
    expect(firstNameOf('')).toBe(FALLBACK_FIRST_NAME);
  });

  /** `''.split(' ')[0]` is `''`, so a padded name used to greet "Hey " with nothing after it. */
  it('falls back on a name that is only whitespace', () => {
    expect(firstNameOf('   ')).toBe(FALLBACK_FIRST_NAME);
  });

  it('does not emit an empty first word for a leading-space name', () => {
    expect(firstNameOf('  Yoni Ripp')).toBe('Yoni');
  });
});

describe('homeProgressMessage', () => {
  it('invites tracking before anything is logged', () => {
    expect(homeProgressMessage(0)).toBe('Start tracking your progress');
  });

  it('escalates with the meal count', () => {
    expect(homeProgressMessage(1)).toBe('Keep going!');
    expect(homeProgressMessage(2)).toBe('Great progress!');
    expect(homeProgressMessage(3)).toBe('Crushing it!');
    expect(homeProgressMessage(9)).toBe('Crushing it!');
  });

  it('treats a nonsensical negative count as nothing logged', () => {
    expect(homeProgressMessage(-1)).toBe('Start tracking your progress');
  });
});
