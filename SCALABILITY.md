# Scalability & Production Deployment Guide

This document outlines how to scale this application from a single-server
setup to a production-grade distributed system.

---

## 1. Microservices Architecture

The current monolith is structured for easy extraction into microservices.

**Recommended service split:**

| Service              | Responsibility                          | Port |
|----------------------|-----------------------------------------|------|
| auth-service         | Register, login, token management       | 5001 |
| task-service         | Task CRUD, stats, filtering             | 5002 |
| notification-service | Email alerts, task reminders            | 5003 |
| api-gateway          | Route traffic, rate limit, auth verify  | 5000 |

**Steps to migrate:**
1. Extract `src/services/authService.js` into a standalone Express app
2. Extract `src/services/taskService.js` into a separate Express app
3. Deploy an API Gateway (Kong, AWS API Gateway, or a custom Express proxy)
4. Use message queues (RabbitMQ / AWS SQS) for inter-service communication
5. Each service gets its own PostgreSQL database (database-per-service pattern)

---

## 2. Redis Caching

Add Redis to reduce database load on frequently read endpoints.

**Install:**
```bash
npm install ioredis

Cache strategy for GET /tasks:

javascript
// src/config/redis.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// In taskService.js
const getAllTasks = async (user, params) => {
  const cacheKey = `tasks:${user.id}:${JSON.stringify(params)}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const result = await prisma.task.findMany({ ... });

  // Cache for 60 seconds
  await redis.setex(cacheKey, 60, JSON.stringify(result));
  return result;
};
Cache invalidation — on task create/update/delete:

javascript
const keys = await redis.keys(`tasks:${userId}:*`);
if (keys.length) await redis.del(...keys);
Additional Redis uses:

Store refresh tokens for token rotation and revocation

Rate limiting counters per IP

Session storage for horizontal scaling

3. Load Balancing
Nginx configuration for horizontal scaling:

text
upstream taskmanager_api {
  least_conn;
  server app1:5000;
  server app2:5000;
  server app3:5000;
}

server {
  listen 80;

  location /api {
    proxy_pass http://taskmanager_api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
Key considerations:

JWT is stateless — works natively across multiple instances

Refresh tokens stored in Redis (not memory) to survive instance restarts

Use sticky sessions only if WebSocket support is added

AWS ALB or GCP Load Balancer for cloud deployments

4. Docker Deployment
Build and run with Docker Compose:

bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f backend

# Run migrations inside container
docker-compose exec backend npx prisma migrate deploy

# Scale backend to 3 instances
docker-compose up --scale backend=3 -d
Production Dockerfile optimizations already included:

Multi-stage builds to reduce image size

Non-root user for security

Health check endpoint for container orchestration

Graceful shutdown handling for zero-downtime deploys

Kubernetes (next step after Docker):

Use Deployment with replicas: 3

Use HorizontalPodAutoscaler based on CPU/memory

Use ConfigMap and Secret for environment variables

Use PersistentVolumeClaim for PostgreSQL storage

5. Refresh Token Rotation
The current implementation issues refresh tokens but does not rotate them.
Full rotation prevents token theft.

Step 1 — Create RefreshToken table in Prisma:

text
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@map("refresh_tokens")
}
Step 2 — Store on login/register:

javascript
await prisma.refreshToken.create({
  data: {
    token: hashedRefreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});
Step 3 — Rotate on refresh:

javascript
const stored = await prisma.refreshToken.findUnique({ where: { token } });
if (!stored || stored.expiresAt < new Date()) throw AppError.unauthorized(...);

await prisma.refreshToken.delete({ where: { token } });

const newAccessToken = generateAccessToken(payload);
const newRefreshToken = generateRefreshToken(payload);

await prisma.refreshToken.create({ data: { ... } });
Step 4 — Revoke all tokens on logout or password change:

javascript
await prisma.refreshToken.deleteMany({ where: { userId } });
6. Production Environment Checklist
Item	Status
HTTPS / SSL termination at Nginx	Required
Environment variables via secrets	Required
Database connection pooling	Prisma built-in
Structured JSON logging	Done (Winston)
Health check endpoint	Done (/health)
Rate limiting	Done (express-rate-limit)
Helmet security headers	Done
CORS whitelist	Done
Input validation	Done (Joi)
Error sanitization	Done
Graceful shutdown	Done
Redis caching	Optional
Refresh token rotation	Optional
Horizontal scaling	Docker Compose ready