import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider, useThemeContext } from '../ThemeContext';

// Note `await render(...)`: RNTL 14 made render async — without the await, every query
// on the result comes back undefined (see SettingsContext.test.tsx for the same note).

beforeEach(async () => {
  await AsyncStorage.clear();
});

function Probe() {
  const { scheme, colors } = useThemeContext();
  return <Text>{`scheme:${scheme};primary:${colors.primary}`}</Text>;
}

describe('ThemeProvider + useThemeContext', () => {
  it('resolves the default (dark, green-accent) theme and provides it to descendants', async () => {
    const r = await render(
      <SettingsProvider>
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      </SettingsProvider>
    );

    // Same defaults DEFAULT_SETTINGS ships with, and the same accent trap
    // useAppTheme.test.tsx pins directly: dark scheme, lime primary (#b5ef57), not the
    // dark palette's own sage.
    expect(await r.findByText('scheme:dark;primary:#b5ef57')).toBeTruthy();
  });
});
