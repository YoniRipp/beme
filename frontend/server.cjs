/**
 * Static file server for production. Sets Cross-Origin-Opener-Policy so Google OAuth popup flow works.
 * Uses .cjs so it runs as CommonJS in both local (type:module) and Docker (no type) contexts.
 */
const express = require('express');
const path = require('path');
const dist = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' " + (process.env.VITE_API_URL || 'http://localhost:3000')
  );
  next();
});
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(port, () => {
  console.log(`BMe frontend: listening on port ${port}`);
});
