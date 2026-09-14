# Backend: Node 20, TypeScript build.
#
# Build context is the REPO ROOT, not backend/ (docker build -f backend/Dockerfile .).
# This repo is an npm workspace: there is exactly one package-lock.json, at the root, and
# backend/package-lock.json does not exist. `npm ci` needs the lockfile and the manifest it
# describes, so the install has to happen from the root.
#
# The runtime layout is deliberately unchanged from the pre-workspace image — dist/,
# migrations/ and scripts/ still sit at /app, and node_modules is at /app/node_modules — so
# the CMD, and anything deploying this image, behaves exactly as before.
FROM node:20-alpine AS builder

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
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root

COPY --from=builder /repo/backend/dist ./dist
COPY backend/migrations ./migrations
COPY backend/scripts ./scripts

EXPOSE 3000

USER node
CMD ["sh", "-c", "node scripts/migrate-up.cjs && node dist/index.js"]
