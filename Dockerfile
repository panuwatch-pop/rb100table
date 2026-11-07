# Stage 1: Base
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Stage 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 4: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATA_DIR="/app/data"

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R node:nodejs /app

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:nodejs /app/.next/standalone ./
COPY --from=builder --chown=node:nodejs /app/.next/static ./.next/static

# Persistent data volume for SQLite
VOLUME ["/app/data"]

USER node
EXPOSE 3000

CMD ["node", "server.js"]
