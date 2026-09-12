import { SETTINGS_SECTION_TITLES } from '../SettingsScreen';

describe('SettingsScreen sections', () => {
  it('does not offer a Data section for the Clear All Data control that deleted nothing', () => {
    expect(SETTINGS_SECTION_TITLES).not.toContain('Data');
  });

  it('still offers the sections that are real, working settings', () => {
    expect(SETTINGS_SECTION_TITLES).toEqual(['Account', 'Units', 'Notifications']);
  });
});
