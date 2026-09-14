import { buildQuickLogPills } from '../HomeScreen';

/**
 * The quick-log grid's logged-today pills, pinned without rendering the screen (a
 * QueryClient left alive in a jest run hangs it — see HomeScreen.targets.test.ts).
 *
 * The pills are load-bearing, not decoration: sleep used to be a stat tile as well and is
 * now stated only here, and weight had no Expo affordance at all before this change.
 */
const TODAY = '2026-09-14';

describe('buildQuickLogPills — sleep', () => {
  it("shows last night's hours once there are any", () => {
    expect(buildQuickLogPills(7.5, [], TODAY).sleep).toBe('7.5h');
  });

  it('shows nothing when today has no check-in', () => {
    expect(buildQuickLogPills(null, [], TODAY).sleep).toBeUndefined();
  });

  /** A check-in recording zero hours is not a night's sleep worth reporting back. */
  it('shows nothing for a zero-hour check-in', () => {
    expect(buildQuickLogPills(0, [], TODAY).sleep).toBeUndefined();
  });
});

describe('buildQuickLogPills — weight', () => {
  const entry = (date: string, weight: number) => ({ date, weight });

  it("shows today's weight once it is logged", () => {
    expect(buildQuickLogPills(null, [entry(TODAY, 82)], TODAY).weight).toBe('82kg');
  });

  it('shows nothing when the newest reading is from another day', () => {
    expect(buildQuickLogPills(null, [entry('2026-09-13', 82)], TODAY).weight).toBeUndefined();
  });

  it('shows nothing when nothing has ever been logged', () => {
    expect(buildQuickLogPills(null, [], TODAY).weight).toBeUndefined();
  });

  /**
   * THE BUG THIS GUARDS. The web finds today's entry with
   * `isSameDay(new Date(entry.date), new Date())`. `new Date('2026-09-14')` is parsed as UTC
   * midnight, which is 2026-09-13 anywhere west of UTC — so a user in New York who weighed
   * in this morning gets no pill, and the tile says the action is still outstanding. Matching
   * the local calendar STRING has no such edge, whatever the device's zone.
   */
  it('matches the local calendar day, not a UTC-parsed one', () => {
    const entries = [entry(TODAY, 82)];
    // The comparison must be string equality: no Date is constructed from the API value at
    // all, so there is no zone for it to shift across.
    expect(buildQuickLogPills(null, entries, TODAY).weight).toBe('82kg');
    expect(buildQuickLogPills(null, entries, '2026-09-15').weight).toBeUndefined();
  });

  it('reports the reading for today even when a newer-looking row precedes it', () => {
    const entries = [entry('2026-09-20', 80), entry(TODAY, 82)];
    expect(buildQuickLogPills(null, entries, TODAY).weight).toBe('82kg');
  });
});
