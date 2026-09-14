import { assertServersAreOurs, backendBaseURL, frontendBaseURL, skipBackend } from './servers';

/**
 * Playwright starts `webServer` before `globalSetup`, so this is the first place that can
 * see what is actually answering on our ports. See `servers.ts` for why that matters.
 */
export default async function globalSetup(): Promise<void> {
  console.log(
    `[e2e] app ${frontendBaseURL} · api ${skipBackend ? '(SKIP_BACKEND)' : backendBaseURL}`
  );
  await assertServersAreOurs();
}
