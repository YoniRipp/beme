import fs from 'fs';
import path from 'path';
import { DRAWER_ITEMS } from '../drawerItems';

/**
 * The drawer and the tab bar are two views of ONE set of destinations, the way the web's
 * sidebar and its bottom bar are. Nothing structural ties them together though: `MainTabs`
 * registers `<Tab.Screen>`s and `AppDrawer` carries its own list, so adding a seventh tab
 * leaves a drawer that silently omits it — no type error, no failing render, just a
 * destination reachable one way and not the other.
 *
 * `MainTabs` is read as TEXT rather than imported and rendered. Importing it pulls in the
 * whole navigator, Paper, and every screen behind it — a render test that would fail for a
 * dozen reasons having nothing to do with the two lists agreeing, which is the one fact
 * worth pinning here. The drawer's own list is imported, from `drawerItems.ts`, which exists
 * apart from the navigator for exactly this reason.
 *
 * #306 (`docs/HANDOFF.md`) renames every one of these routes. This test is what makes that
 * rename safe to do in one pass: rename the tabs and the drawer goes red until it follows.
 */

function tabRouteNames(): string[] {
  const source = fs.readFileSync(path.resolve(__dirname, '../MainTabs.tsx'), 'utf8');
  return [...source.matchAll(/<Tab\.Screen\s+name="([^"]+)"/g)].map((m) => m[1]);
}

describe('drawer destinations', () => {
  it('covers every tab, in the same order', () => {
    const tabs = tabRouteNames();

    // Guard the guard: a regex that silently matched nothing would make this pass forever.
    expect(tabs.length).toBeGreaterThan(0);
    expect(DRAWER_ITEMS.map((i) => i.route)).toEqual(tabs);
  });

  it('gives every destination a label and an icon', () => {
    for (const item of DRAWER_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
    }
  });
});
