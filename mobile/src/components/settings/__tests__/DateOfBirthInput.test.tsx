import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import type { DateFormat } from '@trackvibe/shared/settings';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { DateOfBirthInput } from '../DateOfBirthInput';

/**
 * The three-field birthday control, mirroring `frontend/src/components/settings/
 * DateOfBirthInput.tsx`.
 *
 * `await render(...)`: RNTL 14 made render async, so an unawaited render yields a promise and
 * every query on it comes back undefined. `findBy*` throughout for the same reason —
 * `ThemeProvider` renders nothing until the fonts resolve.
 */

const renderInput = async (
  props: Partial<React.ComponentProps<typeof DateOfBirthInput>> = {}
) => {
  const onChange = jest.fn();
  const result = await render(
    <SettingsProvider>
      <ThemeProvider>
        <DateOfBirthInput
          value=""
          onChange={onChange}
          dateFormat="DD/MM/YYYY"
          {...props}
        />
      </ThemeProvider>
    </SettingsProvider>
  );
  return { onChange, ...result };
};

/**
 * The three fields in the order they are actually laid out.
 *
 * Read off the rendered tree rather than by querying each label, because the thing under
 * test IS the order — a component that hardcoded day-first would pass every per-field query
 * and still be wrong for an American user.
 */
function fieldOrder(json: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const element = node as { props?: Record<string, unknown>; children?: unknown[] };
    const label = element.props?.accessibilityLabel;
    if (typeof label === 'string' && ['Day', 'Month', 'Year'].includes(label)) {
      found.push(label);
    }
    (element.children ?? []).forEach(walk);
  };
  walk(json);
  return found;
}

describe('DateOfBirthInput', () => {
  afterEach(cleanup);

  it('seeds the three fields from the day string the profile holds', async () => {
    const r = await renderInput({ value: '1990-04-17' });

    expect((await r.findByLabelText('Year')).props.value).toBe('1990');
    expect((await r.findByLabelText('Month')).props.value).toBe('04');
    expect((await r.findByLabelText('Day')).props.value).toBe('17');
  });

  it('reports the day string once all three fields describe a date', async () => {
    const r = await renderInput();

    fireEvent.changeText(await r.findByLabelText('Day'), '17');
    fireEvent.changeText(await r.findByLabelText('Month'), '4');
    fireEvent.changeText(await r.findByLabelText('Year'), '1990');

    expect(r.onChange).toHaveBeenLastCalledWith('1990-04-17');
  });

  /**
   * Halfway through typing a year, the date is not yet a date. Reporting it would write a
   * profile row for the year 199.
   */
  it('reports nothing while the date is still half-typed', async () => {
    const r = await renderInput();

    fireEvent.changeText(await r.findByLabelText('Day'), '17');
    fireEvent.changeText(await r.findByLabelText('Month'), '4');

    expect(r.onChange).not.toHaveBeenCalled();
  });

  it('clears the stored value when the user empties the fields', async () => {
    const r = await renderInput({ value: '1990-04-17' });

    fireEvent.changeText(await r.findByLabelText('Year'), '');
    fireEvent.changeText(await r.findByLabelText('Month'), '');
    fireEvent.changeText(await r.findByLabelText('Day'), '');

    expect(r.onChange).toHaveBeenLastCalledWith('');
  });

  it('will not report a birthday in the future', async () => {
    const r = await renderInput({ maxYear: 2026 });

    fireEvent.changeText(await r.findByLabelText('Day'), '17');
    fireEvent.changeText(await r.findByLabelText('Month'), '4');
    fireEvent.changeText(await r.findByLabelText('Year'), '2090');

    expect(r.onChange).not.toHaveBeenCalled();
  });

  it('lays the fields out day-first for a day-first reader', async () => {
    const r = await renderInput({ dateFormat: 'DD/MM/YYYY' });

    expect(fieldOrder(r.toJSON())).toEqual(['Day', 'Month', 'Year']);
  });

  it('lays the fields out month-first for an American reader', async () => {
    const r = await renderInput({ dateFormat: 'MM/DD/YYYY' });

    expect(fieldOrder(r.toJSON())).toEqual(['Month', 'Day', 'Year']);
  });

  it('lays the fields out year-first for an ISO reader', async () => {
    const r = await renderInput({ dateFormat: 'YYYY-MM-DD' });

    expect(fieldOrder(r.toJSON())).toEqual(['Year', 'Month', 'Day']);
  });

  it('separates the fields the way the chosen format does', async () => {
    const r = await renderInput({ dateFormat: 'YYYY-MM-DD' });

    expect(await r.findAllByText('-')).toHaveLength(2);
  });

  // A stored blob from another build reaches here unvalidated — `loadStoredSettings` merges
  // raw JSON over the defaults — so an unknown format must still render three usable fields.
  it('still renders a usable control for a date format it does not recognise', async () => {
    const r = await renderInput({ dateFormat: 'nonsense' as DateFormat });

    expect(fieldOrder(r.toJSON())).toEqual(['Day', 'Month', 'Year']);
  });
});
