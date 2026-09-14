import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/**
 * Answers "which checkout are you serving?" on `/__e2e/identity`.
 *
 * The repo is worked in many git worktrees at once and they all used to name port 5173, so a
 * Playwright run happily reused another worktree's dev server and reported its results
 * against your branch. Ports are derived per checkout now, but nothing stops an unrelated
 * process from taking one — so the E2E global setup asks the server who it is and refuses to
 * run on a mismatch. See `e2e/support/servers.ts`.
 *
 * Dev only (`apply: 'serve'`); it is not part of a build. It also answers only a loopback
 * caller asking for a loopback host, because `npm run dev` is `vite --host` — bound to
 * 0.0.0.0 — and the answer is an absolute path on the developer's disk.
 *
 * Both halves are needed. The peer address alone stops a machine on the LAN; the `Host`
 * header stops DNS rebinding, where the request really does come from 127.0.0.1 (the
 * developer's own browser) but carries an attacker's hostname. That is the check Vite's own
 * `allowedHosts` middleware performs, and this middleware is deliberately registered ahead
 * of Vite's internal stack — a post hook would sit behind the SPA fallback and never be
 * reached — so it has to make the check itself.
 */
const LOOPBACK_ADDRS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function e2eIdentity(): Plugin {
  return {
    name: 'trackvibe:e2e-identity',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__e2e/identity', (req, res, next) => {
        const from = req.socket.remoteAddress ?? '';
        // `host` is "<hostname>:<port>"; an IPv6 literal keeps its brackets.
        const host = (req.headers.host ?? '').replace(/:\d+$/, '');
        if (!LOOPBACK_ADDRS.has(from) || !LOOPBACK_HOSTS.has(host)) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ root: __dirname }));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    e2eIdentity(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'TrackVibe - Wellness Tracker',
        short_name: 'TrackVibe',
        description: 'Track your body, energy, and goals in one place',
        theme_color: '#7a9a7e',
        background_color: '#f4f4f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
