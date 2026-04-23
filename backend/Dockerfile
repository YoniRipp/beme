# Backend: Node 20, TypeScript build. Build context: backend/ (e.g. docker build -t trackvibe-backend ./backend)
FROM node:20-alpine AS builder

WORKDIR /app

# Ensure devDependencies (tsup, typescript) are installed even if
# the host / CI sets NODE_ENV=production at build time.
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
    && test -f dist/index.js || (echo "ERROR: dist/index.js was not created by the build" && exit 1)

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node
CMD ["node", "dist/index.js"]
