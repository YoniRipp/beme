# Frontend: multi-stage. Build with VITE_API_URL and VITE_GOOGLE_CLIENT_ID so the SPA works
# in production.
#
# Build context is the REPO ROOT, not frontend/
# (docker build -f frontend/Dockerfile --build-arg VITE_API_URL=... .).
# Two reasons: this repo is an npm workspace with a single root package-lock.json, and the
# frontend imports @trackvibe/shared from packages/, which a frontend-only context cannot see.
FROM node:20-alpine AS build
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
WORKDIR /repo

# Manifests first, so a source-only change reuses the install layer.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/
# Scoped to frontend: the root install would drag in Expo and the whole mobile toolchain.
# @trackvibe/shared comes along because frontend declares it, which is why that dependency
# is declared explicitly rather than relying on the workspace symlink.
RUN npm ci --workspace frontend --include-workspace-root

COPY packages/shared ./packages/shared
COPY frontend ./frontend
RUN npm run build --workspace frontend

# Stage 2: serve static files (Express with COOP header for Google OAuth)
FROM node:20-alpine
WORKDIR /app

RUN npm init -y && npm install express

COPY --from=build /repo/frontend/dist ./dist
COPY frontend/server.cjs ./

# PORT is set by Railway at runtime; default for local runs.
ENV PORT=3000
EXPOSE 3000

USER node
CMD ["node", "server.cjs"]
