# Task Manager API

A production-grade REST API built with Node.js, Express, PostgreSQL, and Prisma.
Features JWT authentication, Role-Based Access Control (RBAC), and full CRUD
operations for task management.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Runtime    | Node.js 20                        |
| Framework  | Express.js 4                      |
| Database   | PostgreSQL 15                     |
| ORM        | Prisma 5                          |
| Auth       | JWT (jsonwebtoken) + bcrypt       |
| Validation | Joi                               |
| Logging    | Winston                           |
| Security   | Helmet, CORS, express-rate-limit  |
| Dev Server | Nodemon                           |
| Container  | Docker + Docker Compose           |

---

## Project Structure

    backend/
    ├── src/
    │   ├── config/         # Prisma client, Winston logger
    │   ├── controllers/    # HTTP request handlers (thin layer)
    │   ├── services/       # Business logic
    │   ├── routes/         # Route definitions
    │   ├── middleware/     # Auth, RBAC, validation, error handling
    │   ├── validators/     # Joi schemas
    │   └── utils/          # AppError, apiResponse, jwt helpers
    ├── prisma/
    │   ├── schema.prisma   # Database schema
    │   └── migrations/     # Auto-generated SQL migrations
    ├── logs/               # Winston log output
    ├── app.js              # Express app entry point
    ├── Dockerfile          # Multi-stage production Docker image
    └── .env.example        # Environment variable reference

---

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 15 (or Docker)
- npm >= 9.0.0

---

## Local Setup

### 1. Clone the repository

    git clone https://github.com/YOUR_USERNAME/primetrade-assignment.git
    cd primetrade-assignment/backend

### 2. Install dependencies

    npm install

### 3. Configure environment variables

    cp .env.example .env

Edit `.env` and fill in:

    DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/taskmanager_db
    JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
    JWT_REFRESH_SECRET=<generate a second one the same way>
    BCRYPT_SALT_ROUNDS=12

### 4. Start PostgreSQL via Docker

    docker run --name taskmanager-pg \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=yourpassword \
      -e POSTGRES_DB=taskmanager_db \
      -p 5432:5432 \
      -d postgres:15

### 5. Run database migrations

    npx prisma migrate dev --name init

### 6. Start the development server

    npm run dev

Server runs at: http://localhost:5000

---

## Docker Setup (Full Stack)

    # From project root
    docker-compose up --build -d

    # Run migrations inside container
    docker-compose exec backend npx prisma migrate deploy

    # View logs
    docker-compose logs -f backend

    # Stop everything
    docker-compose down

---

## Environment Variables

| Variable                 | Required | Default      | Description                             |
|--------------------------|----------|--------------|-----------------------------------------|
| NODE_ENV                 | No       | development  | Environment mode                        |
| PORT                     | No       | 5000         | Server port                             |
| DATABASE_URL             | Yes      | —            | PostgreSQL connection string            |
| JWT_SECRET               | Yes      | —            | Access token signing secret (64+ chars) |
| JWT_EXPIRES_IN           | No       | 15m          | Access token expiry                     |
| JWT_REFRESH_SECRET       | Yes      | —            | Refresh token signing secret            |
| JWT_REFRESH_EXPIRES_IN   | No       | 7d           | Refresh token expiry                    |
| BCRYPT_SALT_ROUNDS       | No       | 12           | Password hashing rounds                 |
| CORS_ORIGINS             | No       | localhost:3000 | Comma-separated allowed origins       |
| RATE_LIMIT_WINDOW_MS     | No       | 900000       | Rate limit window in ms                 |
| RATE_LIMIT_MAX           | No       | 100          | Max requests per window per IP          |
| LOG_LEVEL                | No       | info         | Winston log level                       |

---

## API Endpoints

### Authentication

| Method | Endpoint                     | Access  | Description             |
|--------|------------------------------|---------|-------------------------|
| POST   | /api/v1/auth/register        | Public  | Register new user       |
| POST   | /api/v1/auth/login           | Public  | Login and get token     |
| POST   | /api/v1/auth/refresh         | Public  | Refresh access token    |
| POST   | /api/v1/auth/logout          | Private | Logout and clear cookie |
| GET    | /api/v1/auth/me              | Private | Get current user profile|
| POST   | /api/v1/auth/change-password | Private | Change password         |

### Tasks

| Method | Endpoint             | Access      | Description            |
|--------|----------------------|-------------|------------------------|
| POST   | /api/v1/tasks        | USER, ADMIN | Create task            |
| GET    | /api/v1/tasks        | USER, ADMIN | List tasks (paginated) |
| GET    | /api/v1/tasks/stats  | ADMIN only  | Task statistics        |
| GET    | /api/v1/tasks/:id    | USER, ADMIN | Get task by ID         |
| PUT    | /api/v1/tasks/:id    | USER, ADMIN | Update task            |
| DELETE | /api/v1/tasks/:id    | USER, ADMIN | Delete task            |

### GET /api/v1/tasks — Query Parameters

| Param     | Type    | Default   | Description                             |
|-----------|---------|-----------|-----------------------------------------|
| page      | integer | 1         | Page number                             |
| limit     | integer | 10        | Results per page (max 100)              |
| status    | string  | —         | PENDING, IN_PROGRESS, or COMPLETED      |
| sortBy    | string  | createdAt | Field to sort by                        |
| sortOrder | string  | desc      | asc or desc                             |
| search    | string  | —         | Search in title and description         |

---

## Security Features

- Passwords hashed with bcrypt (12 salt rounds)
- JWT access tokens expire in 15 minutes
- Refresh tokens stored in httpOnly cookies — not accessible to JavaScript
- Input validation on all endpoints via Joi
- SQL injection prevention via Prisma parameterized queries
- Rate limiting: 100 requests/15min globally, 20 requests/15min on auth routes
- Helmet sets secure HTTP response headers
- Stack traces never exposed in production error responses
- CORS restricted to whitelisted origins only

---

## NPM Scripts

| Script                   | Description                            |
|--------------------------|----------------------------------------|
| npm run dev              | Start development server with nodemon |
| npm start                | Start production server                |
| npm run db:migrate       | Run Prisma migrations (development)    |
| npm run db:migrate:prod  | Run Prisma migrations (production)     |
| npm run db:studio        | Open Prisma Studio database GUI        |
| npm run db:generate      | Regenerate Prisma client               |
| npm run db:reset         | Reset database (destructive)           |

---

## API Documentation

- Swagger: Import swagger/openapi.yaml into https://editor.swagger.io
- Postman: Import postman/collection.json into Postman

---

## Log Files

| File                    | Contents                        |
|-------------------------|---------------------------------|
| logs/app.log            | All logs in JSON format         |
| logs/error.log          | Error logs only                 |
| logs/exceptions.log     | Uncaught exceptions             |
| logs/rejections.log     | Unhandled promise rejections    |

---

## Author

Gurrala Sai Haneesh
Built for PrimeTrade Backend Developer Internship Assignment
