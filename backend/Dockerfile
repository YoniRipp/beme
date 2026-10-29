# Backend: Node 20, TypeScript build.
#
# Build context is the REPO ROOT, not backend/ (docker build -f backend/Dockerfile .).
# This repo is an npm workspace: there is exactly one package-lock.json, at the root, and
# backend/package-lock.json does not exist. `npm ci` needs the lockfile and the manifest it
# describes, so the install has to happen from the root.
#
# Railway must therefore have this service's Root Directory set to `/`, not `/backend` —
# Root Directory is the build context, and a backend/ context cannot see the root lockfile.
# See docs/RUNNING-RAILWAY.md.
# Node 22, not 20. Node 20 reached end-of-life in April 2026 (last release v20.20.2,
# 2026-03-24) and did NOT receive the October 2026 security release, which fixes
# CVE-2026-111497 - an out-of-bounds write in the bundled Brotli decoder that Node rates
# high and that can reach remote code execution. There is no patched 20.x and there never
# will be, so this is a line move, not a patch bump. Minimum safe: 22.23.4 / 24.22.1 / 26.12.1.
#
# The tag floats within the major on purpose: Dependabot covers npm here, not Docker base
# images, so a pinned patch would silently rot exactly the way 20 did. Rebuilds pick up
# 22.x security patches on their own; revisit before 22 goes EOL (April 2027).
#
FROM node:25-alpine AS builder

WORKDIR /repo

# Ensure devDependencies (tsup, typescript) are installed even if
# the host / CI sets NODE_ENV=production at build time.
ENV NODE_ENV=development

# Manifests first, so a source-only change reuses the install layer.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
# Scoped to backend: the root install would drag in Expo and the whole mobile toolchain,
# which this image has no use for and which does not build cleanly on alpine.
RUN npm ci --workspace backend --include-workspace-root

COPY backend ./backend
RUN npm run build --workspace backend \
    && test -f backend/dist/index.js || (echo "ERROR: dist/index.js was not created by the build" && exit 1)

# Production stage
#
# The image keeps the workspace shape: the root manifest and lockfile at /repo, the backend
# workspace at /repo/backend, and that is the WORKDIR. This matters beyond tidiness — Railway
# runs `npm run migrate:up` as its preDeployCommand and `npm start` as its startCommand, and
# npm resolves both against the package.json in the working directory. Putting the ROOT
# manifest there instead would resolve them against the monorepo root, which declares neither
# script, and every deploy would fail with `Missing script: "start"`.
#
# Relative to the WORKDIR the layout is exactly the pre-workspace image: package.json is the
# backend's, with dist/, migrations/ and scripts/ beside it, and node_modules resolves upward
# to the hoisted workspace install at /repo/node_modules.
FROM node:25-alpine

WORKDIR /repo

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root

COPY --from=builder /repo/backend/dist ./backend/dist
COPY backend/migrations ./backend/migrations
COPY backend/scripts ./backend/scripts

WORKDIR /repo/backend

EXPOSE 3000

USER node
CMD ["sh", "-c", "node scripts/migrate-up.cjs && node dist/index.js"]
