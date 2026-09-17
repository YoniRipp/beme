import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { LegalLinks } from '../LegalLinks';
import { getPrivacyPolicyUrl, getTermsUrl } from '../../../lib/appUrls';

/**
 * App Store Guideline 5.1.1(i): the privacy policy must be linked in App Store Connect **and**
 * reachable "within the app in an easily accessible manner". This client linked to neither a
 * policy nor terms from anywhere, which is a submission blocker rather than a polish item.
 *
 * The assertion is on the URL actually opened, not on the label. A link that renders and goes
 * nowhere -- or goes to the wrong page -- passes a render test and fails review.
 */
describe('LegalLinks', () => {
  const renderLinks = () =>
    render(
      <PaperProvider>
        <LegalLinks />
      </PaperProvider>,
    );

  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the privacy policy', async () => {
    const { getByText } = await renderLinks();

    fireEvent.press(getByText('Privacy Policy'));

    expect(Linking.openURL).toHaveBeenCalledWith(getPrivacyPolicyUrl());
    expect(getPrivacyPolicyUrl()).toMatch(/^https:\/\/.+\/privacy$/);
  });

  it('opens the terms', async () => {
    const { getByText } = await renderLinks();

    fireEvent.press(getByText('Terms of Service'));

    expect(Linking.openURL).toHaveBeenCalledWith(getTermsUrl());
    expect(getTermsUrl()).toMatch(/^https:\/\/.+\/terms$/);
  });
});
