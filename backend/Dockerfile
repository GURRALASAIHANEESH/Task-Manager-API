# ===== backend/Dockerfile =====

# ─────────────────────────────────────────────
# Stage 1: Builder
# Installs all dependencies including devDependencies
# and generates Prisma client
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
# Docker will only re-run npm install if these change
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci

# Generate Prisma client for the container's OS
RUN npx prisma generate

# Copy rest of source code
COPY . .

# ─────────────────────────────────────────────
# Stage 2: Production
# Copies only what is needed to run the app
# Results in a significantly smaller final image
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
# This ensures SIGTERM is passed to Node process
# enabling graceful shutdown inside Docker
RUN apk add --no-cache dumb-init

# Create non-root user for security
# Running as root inside a container is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma files and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy application source
COPY --from=builder /app/src ./src
COPY --from=builder /app/app.js ./app.js

# Create logs directory and set ownership
RUN mkdir -p logs && chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose application port
EXPOSE 5000

# Health check for Docker/K8s orchestration
# Checks the /health endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

# Use dumb-init as PID 1 to handle signals correctly
# node app.js is the actual process
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "app.js"]
