import Constants from 'expo-constants';

/**
 * The public web origin, and the legal pages hanging off it.
 *
 * App Store Guideline 5.1.1(i) requires a privacy policy link in App Store Connect **and**
 * "within the app in an easily accessible manner". The pages themselves already exist and are
 * routed publicly on the web client (`frontend/src/routes.tsx`, outside the protected
 * catch-all), so this client links out rather than duplicating the copy — one set of words to
 * keep true, and the same URL a reviewer will click from App Store Connect.
 *
 * **The default origin is the live one, confirmed by the owner.** It used to be inferred from
 * the address the privacy policy gives for contact (`privacy@trackvibe.app`) — a domain we do
 * not own, so both links 404'd. A privacy policy URL that 404s is an App Store rejection, and
 * it is a required App Store Connect field either way. Override with `EXPO_PUBLIC_WEB_URL` if
 * the app moves to its own domain.
 *
 * Read the same way `client.ts` reads `apiUrl`: the resolved config first, the env var second,
 * the default last, per call rather than captured at module load.
 */
export function getWebUrl(): string {
  const extra = Constants.expoConfig?.extra as { webUrl?: string } | undefined;
  const url = extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? 'https://beme.up.railway.app';
  return url.replace(/\/+$/, '');
}

export function getPrivacyPolicyUrl(): string {
  return `${getWebUrl()}/privacy`;
}

export function getTermsUrl(): string {
  return `${getWebUrl()}/terms`;
}
