import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The viewport meta is the on switch for the entire safe-area vocabulary in `src/index.css`.
 * Without `viewport-fit=cover` every `env(safe-area-inset-*)` resolves to `0`, `--safe-top`
 * and friends are all zero, and page content renders under the iOS status bar in the
 * installed PWA — with `.pb-safe` still in the markup and its unit test still green.
 *
 * A string assertion on a class name cannot catch that. A string assertion on the meta tag
 * can, which is the whole reason this file exists.
 */
// `fileURLToPath` is handed the string, not a `URL` instance: under the jsdom environment
// the global `URL` is jsdom's and Node rejects it.
const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, 'index.html'), 'utf8');
const viewport = /<meta name="viewport" content="([^"]*)"/.exec(html)?.[1] ?? '';

describe('index.html viewport meta', () => {
  it('opts into the display cutout so the safe-area insets report real numbers', () => {
    expect(viewport).toContain('viewport-fit=cover');
  });

  it('keeps the scaling behaviour the app already shipped', () => {
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1.0');
    expect(viewport).toContain('maximum-scale=1.0');
    expect(viewport).toContain('user-scalable=no');
  });
});
