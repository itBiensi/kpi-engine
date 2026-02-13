# Troubleshooting Guide

Common issues and their solutions for the KPI Management System.

---

## Installation Issues

### 1. "Failed to seed admin user" Error

**Symptoms:**
- Running `curl -X POST http://localhost:3001/api/v1/auth/seed` returns an error
- Cannot create admin user on first install

**Causes & Solutions:**

#### A. Docker Services Not Running
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start Docker services
docker-compose up -d

# Wait a few seconds for PostgreSQL to initialize
sleep 5
```

#### B. Database Migrations Not Run
```bash
# Navigate to backend folder
cd backend

# Check migration status
npx prisma migrate status

# If migrations are pending, run them
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

#### C. Database Connection Issues
```bash
# Test database connection
cd backend
npx prisma db push --force-reset

# If that doesn't work, check your .env file
cat .env | grep DATABASE_URL

# Should be: DATABASE_URL="postgresql://hris_user:hris_password@localhost:5433/hris_db"
```

#### D. Backend Server Not Running
```bash
# Start backend server
cd backend
npm run start:dev

# Wait for server to start (look for "HRIS Backend running on http://localhost:3001")

# Then try seeding again
curl -X POST http://localhost:3001/api/v1/auth/seed
```

#### E. Port 5433 Already in Use
```bash
# Check what's using port 5433
lsof -i :5433

# If PostgreSQL is already running on default port 5432, update .env:
# DATABASE_URL="postgresql://hris_user:hris_password@localhost:5432/hris_db"

# Or stop the conflicting service and use the Docker container
```

**Quick Fix (Reset Everything):**
```bash
# 1. Stop all services
docker-compose down
pkill -f "npm run start:dev"

# 2. Start fresh
docker-compose up -d
sleep 5

# 3. Reset database
cd backend
npx prisma migrate reset --force

# 4. Start backend
npm run start:dev &

# 5. Wait for server
sleep 10

# 6. Seed admin
curl -X POST http://localhost:3001/api/v1/auth/seed
```

---

### 2. "EADDRINUSE: address already in use" Error

**Symptoms:**
- Backend fails to start with "Error: listen EADDRINUSE: address already in use :::3001"

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use killall
pkill -f "npm run start:dev"

# Restart backend
cd backend
npm run start:dev
```

---

### 3. "Cannot find module '@prisma/client'" Error

**Symptoms:**
- Backend throws error about missing Prisma Client

**Solution:**
```bash
cd backend
npx prisma generate
npm run start:dev
```

---

### 4. Docker Services Won't Start

**Symptoms:**
- `docker-compose up -d` fails
- Services not accessible

**Solutions:**

#### A. Docker Not Running
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker daemon (Linux)
sudo systemctl start docker
```

#### B. Port Conflicts
```bash
# Check what's using ports 5433 and 6379
lsof -i :5433
lsof -i :6379

# Stop conflicting services or change ports in docker-compose.yml
```

#### C. Docker Compose Not Installed
```bash
# Install Docker Compose
# macOS: brew install docker-compose
# Linux: sudo apt-get install docker-compose
```

---

## Runtime Issues

### 1. "Unauthorized" or 401 Error

**Symptoms:**
- API calls return 401 Unauthorized
- Login works but other endpoints fail

**Solutions:**

#### A. JWT Token Expired
```bash
# Login again to get a new token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}'
```

#### B. Missing Authorization Header
```bash
# Include Bearer token in requests
curl -X GET http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer <your_token>"
```

#### C. Invalid JWT Secret
```bash
# Check JWT_SECRET in .env
cd backend
cat .env | grep JWT_SECRET

# If missing, add one:
echo "JWT_SECRET=your-super-secret-jwt-key-change-this-in-production" >> .env

# Restart backend
npm run start:dev
```

---

### 2. "Forbidden" or 403 Error

**Symptoms:**
- Logged in but cannot access certain endpoints
- Admin-only endpoints return 403

**Cause:**
- User doesn't have required role (ADMIN, MANAGER, EMPLOYEE)

**Solution:**
```bash
# Check your user role
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}' | jq '.user.role'

# If not ADMIN, use admin credentials for admin endpoints
```

---

### 3. Frontend Shows "Network Error" or Cannot Connect

**Symptoms:**
- Frontend cannot reach backend
- CORS errors in browser console

**Solutions:**

#### A. Backend Not Running
```bash
# Check if backend is running
curl http://localhost:3001/api/docs

# If not, start it
cd backend
npm run start:dev
```

#### B. Wrong API URL
```bash
# Check frontend environment variable
cd frontend
cat .env.local | grep NEXT_PUBLIC_API_URL

# Should be: NEXT_PUBLIC_API_URL=http://localhost:3001

# If missing, create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

#### C. CORS Issues
- Backend already allows CORS from http://localhost:3000
- If using different port, update `main.ts` in backend

---

### 4. Database Connection Errors

**Symptoms:**
- "Cannot connect to database" errors
- Prisma queries failing

**Solutions:**

#### A. PostgreSQL Not Running
```bash
# Check Docker container
docker ps | grep postgres

# If not running
docker-compose up -d
```

#### B. Wrong Connection String
```bash
# Verify DATABASE_URL
cd backend
cat .env | grep DATABASE_URL

# Test connection
npx prisma db push
```

#### C. Database Doesn't Exist
```bash
# Create database manually
docker exec -it <postgres_container_id> psql -U hris_user -c "CREATE DATABASE hris_db;"

# Or reset everything
npx prisma migrate reset --force
```

---

### 5. Migrations Failed or Out of Sync

**Symptoms:**
- "Migration failed" errors
- Schema doesn't match database

**Solutions:**

#### A. Reset Migrations (DEV ONLY - Deletes Data)
```bash
cd backend
npx prisma migrate reset --force
npx prisma migrate deploy
npx prisma generate
```

#### B. Resolve Migration Conflicts
```bash
# Mark migration as applied
npx prisma migrate resolve --applied "20260210040028_init"

# Or rollback
npx prisma migrate resolve --rolled-back "migration_name"
```

---

## Performance Issues

### 1. Slow API Responses

**Symptoms:**
- API calls take a long time
- Timeouts

**Solutions:**

#### A. Check Database Indexes
```bash
# Open Prisma Studio
cd backend
npx prisma studio

# Verify indexes exist on foreign keys and frequently queried columns
```

#### B. Enable Query Logging
```typescript
// In backend/src/prisma/prisma.service.ts
// Uncomment log options:
log: ['query', 'error', 'warn'],
```

#### C. Check System Resources
```bash
# Check Docker container resources
docker stats

# If containers are using too much CPU/memory, increase Docker limits
```

---

### 2. Frontend Slow or Hanging

**Symptoms:**
- Pages take long to load
- UI feels sluggish

**Solutions:**

#### A. Clear Browser Cache
- Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

#### B. Check Network Tab
- Open browser DevTools → Network
- Check which API calls are slow
- Optimize those endpoints

#### C. Production Build Issues
```bash
# Development mode is slower, try production build
cd frontend
npm run build
npm run start
```

---

## Data Issues

### 1. Admin User Cannot Login

**Symptoms:**
- "Invalid credentials" error with admin@hris.com

**Solution:**
```bash
# Reset admin password manually
cd backend

# Create a script reset-admin.js:
cat > reset-admin.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  const prisma = new PrismaClient();
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.update({
    where: { email: 'admin@hris.com' },
    data: { password: hashedPassword }
  });

  console.log('Admin password reset to: admin123');
  await prisma.$disconnect();
}

resetAdmin();
EOF

# Run it
node reset-admin.js
```

---

### 2. Lost All Data

**Symptoms:**
- Database is empty
- All users/KPIs gone

**Prevention:**
- Always backup before running `prisma migrate reset`

**Recovery:**
```bash
# If you have a backup, restore it
# PostgreSQL backup restore:
docker exec -i <postgres_container_id> psql -U hris_user hris_db < backup.sql

# If no backup, reseed admin user
curl -X POST http://localhost:3001/api/v1/auth/seed
```

---

## Development Issues

### 1. Hot Reload Not Working

**Symptoms:**
- Changes to code don't reflect immediately
- Have to restart server manually

**Solutions:**

#### Backend (NestJS)
```bash
# Make sure you're using start:dev, not start
cd backend
npm run start:dev
```

#### Frontend (Next.js)
```bash
# Make sure you're using dev, not start
cd frontend
npm run dev
```

---

### 2. TypeScript Errors

**Symptoms:**
- "Cannot find module" errors
- Type errors

**Solutions:**

#### A. Regenerate Prisma Client
```bash
cd backend
npx prisma generate
```

#### B. Clear TypeScript Cache
```bash
# Backend
cd backend
rm -rf dist node_modules
npm install

# Frontend
cd frontend
rm -rf .next node_modules
npm install
```

---

## Testing Checklist

When troubleshooting, run through this checklist:

```bash
# 1. Docker services running?
docker ps

# 2. Database accessible?
cd backend && npx prisma studio

# 3. Backend running?
curl http://localhost:3001/api/docs

# 4. Admin user exists?
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}'

# 5. Frontend running?
curl http://localhost:3000

# 6. Environment variables set?
cat .env
cat frontend/.env.local

# 7. Migrations applied?
cd backend && npx prisma migrate status

# 8. Node modules installed?
ls backend/node_modules frontend/node_modules
```

---

## Getting Help

If none of these solutions work:

1. **Check Logs:**
   ```bash
   # Backend logs (if running in terminal)
   cd backend && npm run start:dev

   # Frontend logs
   cd frontend && npm run dev

   # Docker logs
   docker-compose logs -f
   ```

2. **Check GitHub Issues:**
   - Visit: https://github.com/itBiensi/kpi-engine/issues
   - Search for similar problems
   - Create new issue if needed

3. **Provide Information:**
   - Operating System
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - Docker version: `docker --version`
   - Error message (full stack trace)
   - Steps to reproduce

4. **Check Documentation:**
   - README.md
   - backend/docs/DATABASE.md
   - backend/docs/API.md
   - INSTALLATION.md

---

## Emergency Reset

If everything is broken and you want to start fresh:

```bash
#!/bin/bash
# WARNING: This deletes ALL data!

# Stop everything
docker-compose down -v
pkill -f "npm run start:dev"
pkill -f "npm run dev"

# Delete node_modules
rm -rf backend/node_modules frontend/node_modules

# Delete build artifacts
rm -rf backend/dist frontend/.next

# Delete uploads
rm -rf backend/uploads/*
rm -rf backend/exports/*

# Reinstall
cd backend && npm install
cd ../frontend && npm install

# Reset database
cd ../backend
npx prisma migrate reset --force

# Start fresh
cd ..
./setup.sh
```

---

*For more help, consult the documentation or create a GitHub issue.*
