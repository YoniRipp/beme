# Frontend: multi-stage. Build with VITE_API_URL and VITE_GOOGLE_CLIENT_ID so the SPA works in production.
# Build context: frontend/ (e.g. docker build -t trackvibe-frontend --build-arg VITE_API_URL=... --build-arg VITE_GOOGLE_CLIENT_ID=... ./frontend)

# Stage 1: build
FROM node:20-alpine AS build
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve static files (Express with COOP header for Google OAuth)
FROM node:20-alpine
WORKDIR /app

RUN npm init -y && npm install express

COPY --from=build /app/dist ./dist
COPY server.cjs ./

# PORT is set by Railway at runtime; default for local runs.
ENV PORT=3000
EXPOSE 3000

USER node
CMD ["node", "server.cjs"]
