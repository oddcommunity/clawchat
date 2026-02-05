# Clawdbot Docker Image for ClawChat
# Build with: docker build -t clawdbot:latest ./clawdbot

FROM node:22-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Install openclaw CLI globally
RUN npm install -g @anthropic-ai/claude-cli

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build if TypeScript
RUN npm run build --if-present

# Production image
FROM node:22-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package*.json ./
COPY --from=base /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=base /usr/local/bin/claude /usr/local/bin/claude

# Create data directories (including crypto store for E2EE)
RUN mkdir -p /data /data/crypto /app/config

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S clawdbot && \
    adduser -S clawdbot -u 1001 -G clawdbot && \
    chown -R clawdbot:clawdbot /app /data

USER clawdbot

EXPOSE 3000

CMD ["node", "dist/index.js"]
