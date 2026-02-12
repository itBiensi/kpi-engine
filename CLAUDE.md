# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KPI Management System - An HRIS Performance Management application for tracking Key Performance Indicators with role-based access control, bulk imports, and automated scoring.

**Tech Stack:**
- **Backend**: NestJS 11 + Prisma ORM + PostgreSQL + BullMQ/Redis
- **Frontend**: Next.js 16 + React 19 + Zustand + TailwindCSS
- **Auth**: JWT with role-based authorization (ADMIN, MANAGER, EMPLOYEE)

## Development Commands

### Backend (NestJS)
```bash
cd backend
npm install                 # Install dependencies
npm run start:dev          # Start dev server (watch mode) on port 3001
npm run build              # Build for production
npm run start:prod         # Run production build
npm run test               # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run test:cov           # Run tests with coverage
npm run lint               # Lint and fix TypeScript files
npm run format             # Format code with Prettier
```

### Frontend (Next.js)
```bash
cd frontend
npm install                 # Install dependencies
npm run dev                # Start dev server on port 3000
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
```

### Database (Prisma)
```bash
cd backend
npx prisma migrate dev     # Create and apply migration
npx prisma migrate deploy  # Apply migrations in production
npx prisma generate        # Generate Prisma Client
npx prisma studio          # Open Prisma Studio GUI
npx prisma db seed         # Seed database (if configured)
```

### Docker Services
```bash
docker-compose up -d       # Start PostgreSQL and Redis
docker-compose down        # Stop services
docker-compose logs -f     # View logs
```

## Architecture

### Backend Structure

**Modular Architecture** - Each feature is a self-contained NestJS module:

- **`auth/`** - JWT authentication, login, roles decorator and guard
- **`users/`** - User CRUD operations, subordinate relationships
- **`kpi/`** - KPI plan creation, achievements tracking, scoring engine
- **`bulk-upload/`** - Async Excel import using BullMQ
- **`prisma/`** - Database service wrapper

**Key Backend Concepts:**

1. **Role-Based Access Control** - Uses `@Roles()` decorator + `RolesGuard`:
   - ADMIN: Full access (create users, bulk upload, delete all KPIs)
   - MANAGER: Manage subordinates' KPIs
   - EMPLOYEE: Manage own KPIs only

2. **KPI Scoring Engine** (`kpi/scoring.engine.ts`):
   - **MAX polarity**: Higher is better → `(Actual/Target) × Weight`
   - **MIN polarity**: Lower is better → `((2×Target - Actual)/Target) × Weight`
   - **BINARY polarity**: All-or-nothing → `Actual === Target ? Weight : 0`
   - **Business Rules**: Score floor at 0, cap at 120% of weight
   - **Grading**: A (>90), B (>75), C (>60), D (>50), E (≤50)

3. **Bulk Upload Flow** - BullMQ async job processing:
   - Upload Excel → Create job record → Queue to BullMQ → Process rows → Return status
   - Job statuses: QUEUED → PROCESSING → COMPLETED/FAILED

4. **Database Schema** (Prisma):
   - `User` - Employee info, manager hierarchy, role
   - `KpiHeader` - Plan per user+period, status workflow, total score
   - `KpiDetail` - Individual KPI items with target/actual/score/unit
   - `BulkImportJob` - Async job tracking

### Frontend Structure

**Next.js App Router** - Feature-based routing:

- **`app/login/`** - Authentication page
- **`app/dashboard/`** - Main layout with navigation
  - **`kpi/`** - KPI planning interface
  - **`achievements/`** - Achievement tracking and scoring
  - **`users/`** - User management (ADMIN only)
  - **`bulk-upload/`** - Excel import interface (ADMIN only)

**State Management:**
- **Zustand stores** in `stores/`:
  - `auth.store.ts` - JWT token, user info, login state
  - `bulk-upload.store.ts` - Job status tracking
  - `theme.store.ts` - UI theme preferences

**API Client** (`lib/api.ts`):
- Axios instance with automatic JWT token injection
- Organized by feature: `authApi`, `usersApi`, `kpiApi`, `bulkApi`

## Important Patterns

### Backend

1. **Guards and Decorators**:
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('ADMIN')
   async adminOnlyEndpoint() { }
   ```

2. **Prisma Service Injection**:
   ```typescript
   constructor(private prisma: PrismaService) { }
   ```

3. **Validation with class-validator**:
   - DTOs in `dto/` folders validate request bodies
   - Global validation pipe enabled in `main.ts`

4. **Swagger Documentation**:
   - Available at `http://localhost:3001/api/docs`
   - Use `@ApiTags()`, `@ApiBearerAuth()`, `@ApiOperation()` decorators

### Frontend

1. **API Calls with Auth**:
   ```typescript
   import { kpiApi } from '@/lib/api';
   const response = await kpiApi.createPlan(data);
   ```

2. **Protected Routes** - Check auth state in Zustand store

3. **Role-Based UI** - Hide admin buttons for non-admin users

## Database Migrations

When modifying the database schema:

1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description_of_change`
3. Prisma Client auto-regenerates with new types
4. Commit both schema.prisma and migration files

## Environment Setup

1. Copy `.env.example` to `.env` in project root
2. Start Docker services: `docker-compose up -d`
3. Backend uses port **5433** (not 5432) to avoid conflicts
4. Redis uses standard port **6379**
5. Update `DATABASE_URL` in backend if needed

## Testing

- Unit tests use **Jest** with `ts-jest`
- Tests are colocated: `*.spec.ts` files alongside source files
- E2E tests in `backend/test/` using Supertest
- Scoring engine has comprehensive test coverage in `scoring.engine.spec.ts`

## API Authentication

All protected endpoints require JWT Bearer token:
```
Authorization: Bearer <token>
```

Frontend automatically adds token from localStorage via Axios interceptor.

## Common Workflows

### Adding a New Feature Module

1. Generate module: `nest g module feature-name`
2. Generate service: `nest g service feature-name`
3. Generate controller: `nest g controller feature-name`
4. Import module in `app.module.ts`
5. Add Prisma models if needed, then migrate

### Adding a Protected Admin Endpoint

1. Add `@UseGuards(JwtAuthGuard, RolesGuard)` to controller
2. Add `@Roles('ADMIN')` decorator
3. Document with `@ApiOperation()` and `@ApiBearerAuth('JWT-auth')`

### Working with KPI Scoring

- See `kpi/scoring.engine.ts` for calculation logic
- MAX polarity with target=0 throws validation error (use BINARY instead)
- Achievement percentage and final score are automatically calculated
- Total score determines letter grade (A-E scale)
