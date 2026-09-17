import React from 'react';
import { Linking } from 'react-native';
import { List } from 'react-native-paper';
import { getPrivacyPolicyUrl, getTermsUrl } from '../../lib/appUrls';

/**
 * Privacy policy and terms, reachable from inside the app.
 *
 * Guideline 5.1.1(i): the policy link must be in App Store Connect **and** "within the app in
 * an easily accessible manner". This client linked to neither from anywhere.
 *
 * Its own component rather than inline JSX in `SettingsScreen`, so the screen gains four lines
 * instead of thirty — that file is edited by three open branches at once and every extra line
 * is a conflict waiting to happen.
 *
 * `Linking` is React Native core, not a new native module: nothing here forces anyone to
 * rebuild their dev client (`mobile/CLAUDE.md`, "Don't").
 */
export function LegalLinks() {
  return (
    <>
      <List.Item
        title="Privacy Policy"
        accessibilityRole="link"
        left={(props) => <List.Icon {...props} icon="shield-account" />}
        right={(props) => <List.Icon {...props} icon="open-in-new" />}
        // `void`, not `await`: a failure here means no browser could be opened, which is not
        // something to interrupt the settings screen over.
        onPress={() => void Linking.openURL(getPrivacyPolicyUrl())}
      />
      <List.Item
        title="Terms of Service"
        accessibilityRole="link"
        left={(props) => <List.Icon {...props} icon="file-document-outline" />}
        right={(props) => <List.Icon {...props} icon="open-in-new" />}
        onPress={() => void Linking.openURL(getTermsUrl())}
      />
    </>
  );
}
