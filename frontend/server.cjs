/**
 * Static file server for production. Sets Cross-Origin-Opener-Policy so Google OAuth popup flow works.
 * Uses .cjs so it runs as CommonJS in both local (type:module) and Docker (no type) contexts.
 */
const express = require('express');
const path = require('path');
const dist = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

// Sanitize VITE_API_URL to extract origin only, preventing CSP injection
let apiOrigin = 'http://localhost:3000';
try {
  apiOrigin = new URL(process.env.VITE_API_URL || apiOrigin).origin;
} catch { /* keep default */ }

const app = express();
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com " + apiOrigin + ' ' + apiOrigin.replace(/^https:/, 'wss:')
  );
  next();
});
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(port, () => {
  console.log(`TrackVibe frontend: listening on port ${port}`);
});
