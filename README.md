# Task Manager — Full Stack Application

A production-grade full stack application built for the PrimeTrade Backend Developer Internship Assignment.

---

## Overview

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Node.js, Express.js, PostgreSQL, Prisma |
| Frontend | React.js, Vite, React Router v6         |
| Auth     | JWT + bcrypt + httpOnly cookies         |
| Docs     | Swagger (OpenAPI 3.0) + Postman         |
| Deploy   | Docker + Docker Compose                 |

---

## Repository Structure

    Task-Manager-API/
    ├── backend/          # Express REST API
    ├── frontend/         # React SPA
    ├── swagger/          # OpenAPI 3.0 specification
    ├── postman/          # Postman collection
    ├── SCALABILITY.md    # Scalability & deployment guide
    └── docker-compose.yml

---

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker Desktop

### 1. Clone the repository

    git clone https://github.com/GURRALASAIHANEESH/Task-Manager-API.git
    cd Task-Manager-API

### 2. Start PostgreSQL

    docker run --name taskmanager-pg \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres123 \
      -e POSTGRES_DB=taskmanager_db \
      -p 5432:5432 \
      -d postgres:15

### 3. Setup Backend

    cd backend
    npm install
    cp .env.example .env
    # Edit .env with your DATABASE_URL and JWT secrets
    npx prisma migrate dev --name init
    npm run dev

Backend runs at: http://localhost:5000

### 4. Setup Frontend

    cd frontend
    npm install
    npm run dev

Frontend runs at: http://localhost:5173

---

## Features

**Backend**
- User registration and login with bcrypt password hashing
- JWT access tokens (15min) + httpOnly refresh token cookies (7 days)
- Role-based access control — USER and ADMIN roles
- Full CRUD API for Tasks with pagination, filtering, and search
- API versioning at /api/v1/
- Input validation via Joi on all endpoints
- Structured JSON logging via Winston
- Rate limiting and Helmet security headers
- Docker and Docker Compose support

**Frontend**
- Register and login pages with form validation
- Protected dashboard — redirects to login if unauthenticated
- Create, edit, and delete tasks via modal forms
- Filter tasks by status — PENDING, IN_PROGRESS, COMPLETED
- Search tasks by title and description
- Paginated task grid with responsive layout
- Auto-dismissing toast notifications for all actions
- Silent token refresh on page reload

---

## API Documentation

- **Swagger**: Import `swagger/openapi.yaml` into https://editor.swagger.io
- **Postman**: Import `postman/collection.json` into Postman

---

## Scalability

See [SCALABILITY.md](./SCALABILITY.md) for detailed notes on:
- Microservices architecture
- Redis caching strategy
- Nginx load balancing
- Docker and Kubernetes deployment
- Refresh token rotation

---

## Author

Gurrala Sai Haneesh

