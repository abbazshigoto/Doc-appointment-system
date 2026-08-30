# Doctor Appointment System

A full-stack appointment booking platform with role-based access for **patients**, **doctors**, and **admins** — built on FastAPI, PostgreSQL, Redis, and Next.js. Booking is race-condition-safe: a Redis-backed hold/confirm flow plus a database-level partial unique constraint guarantee a slot can never be double-booked, even under concurrent requests.

## Features

**Patients**
- Register/login, browse doctors by specialty, view a doctor's availability
- Hold a slot, then confirm the booking (two-phase booking to avoid race conditions)
- View and cancel their own appointments, receive notifications on status changes

**Doctors**
- Manage their profile (specialty, bio, consultation fee, years of experience)
- Define and remove availability windows
- View their booked appointments, get notified of new bookings/cancellations

**Admins**
- List all users
- Deactivate/reactivate accounts (self-deactivation blocked)
- Created out-of-band via a CLI script — never exposed through public registration

## Tech Stack

| Layer    | Technology                                                     |
|----------|-----------------------------------------------------------------|
| Backend  | Python, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2   |
| Database | PostgreSQL, Redis                                              |
| Auth     | JWT (`python-jose`), bcrypt password hashing (`passlib`)        |
| Frontend | Next.js 16 (App Router), React 19, TypeScript                  |
| Infra    | Docker / Docker Compose, nginx, AWS EC2 + Amplify              |

## Architecture

```
Browser
  │
  ▼
Next.js frontend (:3000)
  │  REST (JSON, Bearer JWT)
  ▼
FastAPI backend (:8000)
  │
  ├─▶ PostgreSQL (:5433)   — users, doctors, availability, appointments, notifications
  └─▶ Redis (:6379)        — short-lived slot holds (SETNX + TTL) for booking concurrency
```

Backend code is organized by domain module (`auth`, `users`, `doctors`, `availability`, `appointments`, `notifications`), each with its own router → service → repository layers.

For the production topology (EC2, nginx/TLS, Amplify) and deployment history, see [deployment.md](deployment.md).

## Getting Started

### Prerequisites
- Docker + Docker Compose

### Setup

1. Copy the environment files and fill in real secrets for `JWT_SECRET_KEY` (a `POSTGRES_PASSWORD`/`JWT_SECRET_KEY` of `postgres`/`change-me` is fine for local dev):
   ```
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
2. Build and start the full stack:
   ```
   docker compose up -d --build
   ```
   Database migrations run automatically on backend startup (`docker-entrypoint.sh` runs `alembic upgrade head` before launching uvicorn).
3. (Optional) Seed sample doctors, patients, and appointments:
   ```
   docker compose exec backend python -m scripts.seed_dummy_data
   ```
   All seeded accounts use password `password123`.
4. Open the app:
   - Frontend: http://localhost:3000
   - Backend API docs (Swagger UI): http://localhost:8000/docs
   - Health check: http://localhost:8000/health

### Creating an admin account

Admin accounts aren't available through public registration by design. Create one via:
```
docker compose exec backend python -m scripts.create_admin --email you@example.com --full-name "Your Name"
```

## Environment Variables

| Variable                                                            | Used by            | Description                                        |
|----------------------------------------------------------------------|---------------------|-----------------------------------------------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`               | postgres, backend   | Database credentials                                |
| `DATABASE_URL`                                                      | backend             | Async SQLAlchemy connection string                  |
| `REDIS_URL`                                                         | backend             | Redis connection string                             |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` / `ACCESS_TOKEN_EXPIRE_MINUTES`  | backend             | JWT signing config                                  |
| `CORS_ORIGINS`                                                      | backend             | Comma-separated list of allowed frontend origins    |
| `NEXT_PUBLIC_API_URL`                                               | frontend            | Base URL the browser calls for the API (build-time) |

## Scripts (backend)

| Script                                | Purpose                                                                                                                      |
|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `scripts/create_admin.py`             | One-off CLI to create an admin account                                                                                       |
| `scripts/seed_dummy_data.py`          | Populate the DB with demo doctors/patients/appointments (idempotent)                                                         |
| `scripts/test_concurrent_booking.py`  | Fires simultaneous booking requests at a running dev server to verify the double-booking guard holds under real concurrency  |

## Linting

```
docker compose exec backend ruff check .
```

## Deployment

Frontend is hosted on AWS Amplify (auto-deploys on push to `main`); backend, PostgreSQL, and Redis run in Docker on a single EC2 instance behind nginx with a Let's Encrypt certificate. Full write-up, including the mistakes made along the way, is in [deployment.md](deployment.md).
