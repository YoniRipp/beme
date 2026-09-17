import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react-native';
import { addDays } from 'date-fns';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { DayPicker, dayLabel, DAY_PICKER_RANGE } from '../DayPicker';

/**
 * Nothing on this client could be backdated. `WorkoutFormScreen` held its date in a `useState`
 * with no setter and rendered the field `editable={false}`; the sleep and food forms built
 * `new Date()` at save time. A workout you forgot to log last night could only be recorded as
 * today's.
 *
 * `today` is injected rather than read inside the component, which is what makes these
 * deterministic — a picker that calls `new Date()` internally is untestable and also shifts
 * under a form left open across midnight.
 */
const TUESDAY = new Date(2026, 8, 15, 14, 0);

describe('dayLabel', () => {
  it('names the two days people actually mean', () => {
    expect(dayLabel(0, TUESDAY)).toBe('Today');
    expect(dayLabel(1, TUESDAY)).toBe('Yesterday');
  });

  it('uses the weekday inside a week, which is how someone remembers a workout', () => {
    expect(dayLabel(2, TUESDAY)).toBe('Sunday');
    expect(dayLabel(6, TUESDAY)).toBe('Wednesday');
  });

  /**
   * Past a week the weekday stops identifying a day — "Tuesday" could be either — so the label
   * has to become a date. `DAY_PICKER_RANGE` keeps the row inside that boundary today; this
   * pins the behaviour for whoever widens it.
   */
  it('falls back to a date beyond a week, where a weekday would be ambiguous', () => {
    expect(dayLabel(7, TUESDAY)).toBe('Sep 8');
  });
});

describe('DayPicker', () => {
  afterEach(cleanup);

  // `await render(...)`: RNTL 14 made render async, so spreading it unawaited yields a promise
  // and every query comes back undefined.
  const renderPicker = async (value: Date, onChange = jest.fn()) => ({
    onChange,
    ...(await render(
      <SettingsProvider>
        <ThemeProvider>
          <DayPicker value={value} onChange={onChange} today={TUESDAY} />
        </ThemeProvider>
      </SettingsProvider>,
    )),
  });

  it('offers today back through the week, and nothing in the future', async () => {
    const { findByText, queryByText } = await renderPicker(TUESDAY);

    await findByText('Today');
    expect(queryByText('Tomorrow')).toBeNull();
    // Every offset is in the past or today; the count is the contract.
    for (let offset = 0; offset < DAY_PICKER_RANGE; offset++) {
      expect(queryByText(dayLabel(offset, TUESDAY))).not.toBeNull();
    }
  });

  it('reports the day that was picked, not an offset', async () => {
    const { findByText, onChange } = await renderPicker(TUESDAY);

    fireEvent.press(await findByText('Yesterday'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const picked: Date = onChange.mock.calls[0][0];
    expect(picked.getDate()).toBe(addDays(TUESDAY, -1).getDate());
    expect(picked.getMonth()).toBe(addDays(TUESDAY, -1).getMonth());
  });

  /**
   * The accessible name carries the real date. "Yesterday" announced on its own is ambiguous
   * three screens into a form, and this row is the only thing on these screens that sets a date.
   */
  it('announces the actual date, not just the relative word', async () => {
    const { findByLabelText } = await renderPicker(TUESDAY);

    expect(await findByLabelText('Yesterday, Monday 14 September')).toBeTruthy();
  });
});
