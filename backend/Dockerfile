FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate
COPY . .

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache dumb-init openssl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/app.js ./app.js

RUN mkdir -p logs && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "app.js"]