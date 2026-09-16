import {
  assertServersAreOurs,
  backendBaseURL,
  frontendBaseURL,
  skipBackend,
  UNMANAGED_API_BASE_URL,
} from './servers';

/**
 * Playwright starts `webServer` before `globalSetup`, so this is the first place that can
 * see what is actually answering on our ports. See `servers.ts` for why that matters.
 */
export default async function globalSetup(): Promise<void> {
  console.log(`[e2e] app ${frontendBaseURL} · api ${skipBackend ? '(SKIP_BACKEND)' : backendBaseURL}`);

  // SKIP_BACKEND is the one hole left in the guarantee, so say so rather than let it pass for
  // a verified run. The app falls back to its default API base, which is the shared :3000 —
  // and nothing checks whose backend is on it, including another worktree's.
  if (skipBackend) {
    console.warn(
      `[e2e] SKIP_BACKEND: the API at ${UNMANAGED_API_BASE_URL} is not started or identity-checked ` +
        'by this run. Whoever owns that port answers the app, including another checkout.\n' +
        `[e2e] It is also being called from ${frontendBaseURL}, not :5173. A backend whose ` +
        'CORS_ORIGIN is pinned to the old port will reject every request the app makes.'
    );
  }

  await assertServersAreOurs();
}
