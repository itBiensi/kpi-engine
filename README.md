# KPI Management System

A comprehensive HRIS Performance Management application for tracking Key Performance Indicators with role-based access control, workflow management, bulk import/export, automated scoring, and talent analytics.

**Tech Stack:**  NestJS + Prisma + PostgreSQL + Redis + BullMQ  |  Next.js + React + Zustand

---

## Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start (Development)](#-quick-start-development)
- [Production Deployment with Caddy](#-production-deployment-with-caddy)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Configure Environment](#2-configure-environment)
  - [3. Build and Start](#3-build-and-start)
  - [4. Verify Deployment](#4-verify-deployment)
  - [5. Seed Initial Data](#5-seed-initial-data)
  - [6. Access the Application](#6-access-the-application)
- [Environment Variables](#-environment-variables)
- [Docker Files Reference](#-docker-files-reference)
- [Docker Management](#-docker-management)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### Performance Management
- **KPI Planning** — Create and manage performance targets with measurement units
- **Achievement Tracking** — Real-time score calculations with evidence uploads
- **Workflow Management** — Submit → Approve/Reject workflow with comments
- **Period Management** — Assessment cycles (Monthly / Quarterly / Semester / Annual)
- **Grading System** — Automated letter grades (A–E) based on total scores
- **Scoring Config** — Configurable grade boundaries with interactive preview

### Talent Analytics
- **Nine-Box Grid** — Interactive Performance vs Potential talent matrix
- **Department Filtering** — Slice data by department and period
- **CSV Export** — Download employee data per grid cell

### Role-Based Access Control
| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access, user management, bulk operations, audit log, scoring config, nine-box grid |
| **Manager** | Approve/reject subordinate KPIs, add comments |
| **Employee** | Create and track own KPIs, update achievements |

### Advanced Features
- **Bulk User Import** — Excel-based user upload with async processing (BullMQ + Redis)
- **Bulk KPI Export** — Export all KPI data to Excel (chunked, background processing)
- **Audit Log** — Full admin action logging with date range, action type, and user agent filters
- **Manager Comments** — Comment on individual KPI items
- **Password Management** — Self-service password update + admin reset

---

## 🏗 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│  PostgreSQL  │     │    Redis    │
│  Next.js    │     │  NestJS     │────▶│  (Database)  │     │  (Queue +   │
│  Port 3000  │     │  Port 3001  │     │  Port 5432   │     │   Cache)    │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

| Service | Image | Purpose |
|---------|-------|---------|
| `frontend` | Custom (Node 20 Alpine) | Next.js standalone server |
| `backend` | Custom (Node 20 Alpine) | NestJS API + Prisma ORM |
| `postgres` | `postgres:16-alpine` | Primary database |
| `redis` | `redis:7-alpine` | BullMQ job queue + caching |

Both application images use **multi-stage Docker builds** for minimal production image size. The backend container automatically runs database migrations on startup.

### Docker Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | **Development** — exposes all ports to host, for local development |
| `docker-compose.prod.yml` | **Production** — Caddy reverse proxy, auto-HTTPS, no exposed internal ports |
| `Caddyfile` | Caddy routing rules — proxies `/api/*` to backend, everything else to frontend |
| `.env.example` | Environment template for development |
| `.env.production` | Environment template for production with strong password placeholders |
| `backend/Dockerfile` | Multi-stage build: deps → build → production (Node 20 Alpine) |
| `frontend/Dockerfile` | Multi-stage build: deps → build → standalone Next.js (Node 20 Alpine) |

---

## 📋 Prerequisites

| Requirement | Minimum Version |
|-------------|----------------|
| **Docker Engine** | 20.10+ |
| **Docker Compose** | v2.0+ (included with Docker Desktop) |
| **Git** | 2.0+ |
| **Disk Space** | ~2 GB (images + volumes) |
| **RAM** | 2 GB minimum, 4 GB recommended |

Verify your setup:

```bash
docker --version       # Docker version 20.10+
docker compose version # Docker Compose v2+
```

---

## 🚀 Quick Start (Development)

For local development with all ports exposed:

```bash
git clone <your-repo-url> kpi-management-system
cd kpi-management-system

# Start all services (dev mode — ports exposed to host)
docker compose up -d --build

# Seed the database
docker compose exec backend npx prisma db seed

# Open http://localhost:3000
# Login: admin@hris.com / admin123
```

---

## 🌐 Production Deployment with Caddy

The production stack uses **Caddy** as a reverse proxy with **automatic HTTPS** (Let's Encrypt). Internal services (database, Redis, backend, frontend) are not exposed to the host — only Caddy listens on ports 80/443.

### 1. Clone the Repository

```bash
git clone <your-repo-url> kpi-management-system
cd kpi-management-system
```

### 2. Configure Environment

Copy the production environment template and edit it:

```bash
cp .env.production .env
nano .env
```

**Required changes in `.env`:**

```env
# Your domain (Caddy uses this for automatic HTTPS)
DOMAIN=kpi.yourcompany.com

# Strong database password
POSTGRES_PASSWORD=your_strong_password_here
DATABASE_URL=postgresql://hris_user:your_strong_password_here@postgres:5432/hris_db

# Generate a JWT secret: openssl rand -base64 48
JWT_SECRET=paste_generated_secret_here

# Must match your domain
FRONTEND_URL=https://kpi.yourcompany.com
NEXT_PUBLIC_API_URL=https://kpi.yourcompany.com
```

> ⚠️ **Important:** `NEXT_PUBLIC_API_URL` is baked into the JavaScript bundle at **build time**. If you change it later, you must rebuild the frontend container.

### 3. Build and Start

```bash
# Build and start the production stack
docker compose -f docker-compose.prod.yml up -d --build
```

This will:
1. Pull `postgres:16-alpine`, `redis:7-alpine`, and `caddy:2-alpine` base images
2. Build the backend image (install deps → generate Prisma → compile TypeScript)
3. Build the frontend image (install deps → build Next.js → standalone output)
4. Start all 5 containers (Caddy, backend, frontend, PostgreSQL, Redis)
5. **Automatically run database migrations** on first backend startup
6. **Automatically provision HTTPS** via Let's Encrypt (if the domain's DNS points to this server)

First build takes **2–5 minutes** depending on your machine. Subsequent builds use Docker layer cache and are much faster.

### 4. Verify Deployment

Check that all containers are running and healthy:

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME            SERVICE     STATUS
# kpi-caddy       caddy       Up
# kpi-postgres    postgres    Up (healthy)
# kpi-redis       redis       Up (healthy)
# kpi-backend     backend     Up
# kpi-frontend    frontend    Up
```

Verify each service is responding:

```bash
# Via Caddy (HTTPS if domain is configured, HTTP otherwise)
curl -s -o /dev/null -w "%{http_code}" https://kpi.yourcompany.com

# Backend API via Caddy
curl -s -o /dev/null -w "%{http_code}" https://kpi.yourcompany.com/api/v1/auth/login
```

Check the backend logs to confirm migrations ran successfully:

```bash
docker compose -f docker-compose.prod.yml logs backend --tail 20
```

### 5. Seed Initial Data

The database is created with schema but **no data** on first run. Seed the admin user and sample data:

```bash
# Run Prisma seed inside the backend container
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

This creates:
- **Admin account:** `admin@hris.com` / `admin123`
- **Sample employee:** `john doe` / `password123`
- **Sample KPI period** and plans

### 6. Access the Application

| Service | URL |
|---------|-----|
| **Frontend (Web UI)** | `https://kpi.yourcompany.com` |
| **Backend API** | `https://kpi.yourcompany.com/api/v1/...` |
| **Swagger API Docs** | `https://kpi.yourcompany.com/swagger` |

**Default Admin Login:**

| Field | Value |
|-------|-------|
| Email | `admin@hris.com` |
| Password | `admin123` |

> ⚠️ **Change the admin password immediately after first login!**  
> Go to Dashboard → click the key icon next to your username.

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOMAIN` | ✅ Prod | `localhost` | Your domain for Caddy auto-HTTPS |
| `POSTGRES_USER` | ✅ | `hris_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | ✅ | — | PostgreSQL password |
| `POSTGRES_DB` | ✅ | `hris_db` | PostgreSQL database name |
| `DATABASE_URL` | ✅ | — | Full PostgreSQL connection string |
| `REDIS_HOST` | ✅ | `redis` | Redis hostname (Docker service name) |
| `REDIS_PORT` | ✅ | `6379` | Redis port |
| `JWT_SECRET` | ✅ | — | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRATION` | ❌ | `24h` | JWT token TTL |
| `PORT` | ❌ | `3001` | Backend API port (internal) |
| `FRONTEND_URL` | ✅ | — | Frontend URL for CORS allowlist |
| `NEXT_PUBLIC_API_URL` | ✅ | — | Backend API URL (build-time, baked into JS) |

---

## 📁 Docker Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yml` | **Development** — exposes all ports to host |
| `docker-compose.prod.yml` | **Production** — Caddy auto-HTTPS, no exposed internal ports |
| `Caddyfile` | Reverse proxy config — routes `/api/*` to backend, everything else to frontend |
| `.env.example` | Dev environment template |
| `.env.production` | Production environment template with strong password placeholders |
| `backend/Dockerfile` | 3-stage build: deps → build → production (Node 20 Alpine) |
| `frontend/Dockerfile` | 3-stage build: deps → build → standalone Next.js (Node 20 Alpine) |

### How Caddy Routing Works

```
                    ┌──────────────────────────┐
 Internet ──▶ :443  │  Caddy (auto-HTTPS)     │
                    │                          │
                    │  /api/*  → backend:3001  │
                    │  /*      → frontend:3000 │
                    └──────────────────────────┘
```

Caddy automatically:
- Obtains and renews Let's Encrypt TLS certificates
- Redirects HTTP → HTTPS
- Supports HTTP/3 (QUIC)

---

## 🐳 Docker Management

> **Note:** For production, always add `-f docker-compose.prod.yml` to commands.  
> Below examples use the production file. For development, use `docker compose` (without `-f`).

### Common Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart a specific service
docker compose -f docker-compose.prod.yml up -d --build frontend
docker compose -f docker-compose.prod.yml up -d --build backend

# View real-time logs
docker compose -f docker-compose.prod.yml logs -f              # All services
docker compose -f docker-compose.prod.yml logs -f backend      # Backend only
docker compose -f docker-compose.prod.yml logs -f caddy        # Caddy only

# Check container status
docker compose -f docker-compose.prod.yml ps

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend
```

### Database Management

```bash
# Access PostgreSQL shell
docker compose -f docker-compose.prod.yml exec postgres psql -U hris_user -d hris_db

# Run database migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Reset database (WARNING: destroys all data)
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate reset --force

# Create a database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U hris_user hris_db > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20260226.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U hris_user -d hris_db
```

### Volume Management

```bash
# List volumes
docker volume ls | grep kpi

# Full cleanup (WARNING: destroys ALL data including database)
docker compose -f docker-compose.prod.yml down -v
```

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime for frontend)
docker compose up -d --build

# Check migration status
docker compose logs backend --tail 10
```

---

## 📖 API Documentation

Swagger UI is available at: **http://localhost:3001/api**

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/login` | ❌ | User login |
| `GET` | `/api/v1/users` | ✅ | List users |
| `POST` | `/api/v1/users` | Admin | Create user |
| `GET` | `/api/v1/kpi/plans` | ✅ | List KPI plans |
| `POST` | `/api/v1/kpi/plans` | ✅ | Create KPI plan |
| `GET` | `/api/v1/kpi/nine-box` | Admin | Nine-Box Grid data |
| `GET` | `/api/v1/periods` | ✅ | List periods |
| `GET` | `/api/v1/audit-logs` | Admin | Audit logs |
| `POST` | `/api/v1/bulk/import-users` | Admin | Bulk user import (Excel) |
| `GET` | `/api/v1/bulk/export-kpi` | Admin | Bulk KPI export (Excel) |

---

## 🔒 Security

### Pre-Deployment Checklist

- [ ] Change `JWT_SECRET` to a strong, unique 32+ character key
- [ ] Change the PostgreSQL password in both `docker-compose.yml` and `.env`
- [ ] Change the default admin password after first login
- [ ] Set up HTTPS with Nginx + Certbot
- [ ] Restrict Docker ports (`5433`, `6379`) from public access via firewall
- [ ] Set `FRONTEND_URL` to your actual domain (CORS protection)
- [ ] Enable a firewall (e.g., `ufw`) and only allow ports 80/443

### Role-Based Access Control

- `RolesGuard` checks user permissions on every protected endpoint
- `@Roles('ADMIN')` decorator restricts endpoints to admin users
- Frontend conditionally renders admin-only UI elements
- API returns `403 Forbidden` for unauthorized access

### Audit Logging

All admin actions are logged with:
- Action type, timestamp, and user ID
- IP address and User-Agent
- Full request details for traceability

---

## 🔧 Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose logs backend --tail 50
docker compose logs frontend --tail 50

# Common fix: ensure Postgres is healthy before backend starts
docker compose down && docker compose up -d
```

### Database connection refused

```bash
# Verify Postgres is running and healthy
docker compose ps postgres

# Check if the database exists
docker compose exec postgres psql -U hris_user -d hris_db -c "SELECT 1;"
```

### Frontend shows blank page or API errors

1. Verify `NEXT_PUBLIC_API_URL` matches your backend URL
2. Remember this value is baked at **build time** — if you changed it, rebuild:
   ```bash
   docker compose up -d --build frontend
   ```
3. Check the browser console for CORS errors

### Port already in use

```bash
# Find what's using the port
lsof -i :3000   # or :3001, :5433, :6379

# Kill the process
kill -9 <PID>
```

### Reset everything (fresh start)

```bash
# Stop all containers and delete all data volumes
docker compose -f docker-compose.prod.yml down -v

# Rebuild everything from scratch
docker compose -f docker-compose.prod.yml up -d --build

# Re-seed the database
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

---

## 📝 License

MIT
