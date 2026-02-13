#!/bin/bash

# KPI Management System - Status Check Script
# Run this to diagnose installation issues

echo "🔍 KPI Management System - Status Check"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Check 1: Docker
echo "1. Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"

    if docker ps &> /dev/null; then
        print_success "Docker is running"
    else
        print_error "Docker daemon not running or permission denied"
        print_info "Try: sudo systemctl start docker"
        print_info "Or: sudo usermod -aG docker $USER && newgrp docker"
    fi
else
    print_error "Docker not installed"
fi
echo ""

# Check 2: Docker Compose
echo "2. Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_success "docker-compose (standalone): $COMPOSE_VERSION"
elif docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    print_success "docker compose (plugin): $COMPOSE_VERSION"
else
    print_error "Docker Compose not installed"
fi
echo ""

# Check 3: Docker Containers
echo "3. Checking Docker Containers..."
if docker ps &> /dev/null; then
    POSTGRES_STATUS=$(docker ps --filter "name=hris-postgres" --format "{{.Status}}" 2>/dev/null)
    REDIS_STATUS=$(docker ps --filter "name=hris-redis" --format "{{.Status}}" 2>/dev/null)

    if [ -n "$POSTGRES_STATUS" ]; then
        print_success "PostgreSQL container: $POSTGRES_STATUS"
    else
        print_error "PostgreSQL container not running"
        print_info "Try: docker compose up -d"
    fi

    if [ -n "$REDIS_STATUS" ]; then
        print_success "Redis container: $REDIS_STATUS"
    else
        print_error "Redis container not running"
        print_info "Try: docker compose up -d"
    fi
else
    print_warning "Cannot check containers (Docker not accessible)"
fi
echo ""

# Check 4: Node.js
echo "4. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"

    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    fi
else
    print_error "Node.js not installed"
fi
echo ""

# Check 5: Environment Files
echo "5. Checking Environment Files..."
if [ -f ".env" ]; then
    print_success "Root .env exists"
else
    print_error "Root .env not found"
fi

if [ -f "backend/.env" ]; then
    print_success "backend/.env exists"

    # Check DATABASE_URL
    if grep -q "DATABASE_URL=" backend/.env; then
        DB_URL=$(grep "DATABASE_URL=" backend/.env | cut -d'=' -f2- | tr -d '"')

        if [[ $DB_URL == *"5433"* ]]; then
            print_success "DATABASE_URL port: 5433 (correct)"
        elif [[ $DB_URL == *"5432"* ]]; then
            print_error "DATABASE_URL port: 5432 (should be 5433)"
            print_info "Fix: sed -i 's/localhost:5432/localhost:5433/g' backend/.env"
        else
            print_warning "DATABASE_URL port: unknown"
        fi
    else
        print_error "DATABASE_URL not found in backend/.env"
    fi

    # Check JWT_SECRET
    if grep -q "JWT_SECRET=" backend/.env; then
        print_success "JWT_SECRET exists"
    else
        print_warning "JWT_SECRET not found"
    fi
else
    print_error "backend/.env not found"
    print_info "Fix: cp .env backend/.env"
fi
echo ""

# Check 6: Backend Dependencies
echo "6. Checking Backend Dependencies..."
if [ -d "backend/node_modules" ]; then
    print_success "Backend dependencies installed"
else
    print_error "Backend dependencies not installed"
    print_info "Fix: cd backend && npm install"
fi
echo ""

# Check 7: Frontend Dependencies
echo "7. Checking Frontend Dependencies..."
if [ -d "frontend/node_modules" ]; then
    print_success "Frontend dependencies installed"
else
    print_error "Frontend dependencies not installed"
    print_info "Fix: cd frontend && npm install"
fi
echo ""

# Check 8: Database Connection
echo "8. Checking Database Connection..."
if [ -f "backend/.env" ] && command -v docker &> /dev/null; then
    if docker ps | grep -q "hris-postgres"; then
        # Extract connection details
        DB_USER=$(grep "POSTGRES_USER" docker-compose.yml | awk '{print $2}')
        DB_NAME=$(grep "POSTGRES_DB" docker-compose.yml | awk '{print $2}')

        # Try to connect
        if docker exec hris-postgres psql -U hris_user -d hris_db -c "SELECT 1;" &> /dev/null; then
            print_success "Can connect to PostgreSQL database"
        else
            print_error "Cannot connect to PostgreSQL database"
        fi
    else
        print_warning "PostgreSQL container not running"
    fi
else
    print_warning "Skipping database connection check"
fi
echo ""

# Check 9: Prisma Migration Status
echo "9. Checking Prisma Migrations..."
if [ -d "backend/node_modules" ] && [ -f "backend/.env" ]; then
    cd backend
    MIGRATION_STATUS=$(npx prisma migrate status 2>&1)

    if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
        print_success "Database migrations up to date"
    elif echo "$MIGRATION_STATUS" | grep -q "following migrations have not yet been applied"; then
        print_warning "Pending migrations found"
        print_info "Fix: cd backend && npx prisma migrate deploy"
    else
        print_error "Cannot check migration status"
        echo "$MIGRATION_STATUS"
    fi
    cd ..
else
    print_warning "Skipping migration check"
fi
echo ""

# Check 10: Backend Server
echo "10. Checking Backend Server..."
if curl -s http://localhost:3001/api/docs > /dev/null 2>&1; then
    print_success "Backend server is running (http://localhost:3001)"
else
    print_error "Backend server not accessible"
    print_info "Check: cd backend && npm run start:dev"
fi
echo ""

# Check 11: Frontend Server
echo "11. Checking Frontend Server..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend server is running (http://localhost:3000)"
else
    print_error "Frontend server not accessible"
    print_info "Check: cd frontend && npm run dev"
fi
echo ""

# Check 12: Admin User
echo "12. Checking Admin User..."
if curl -s http://localhost:3001/api/docs > /dev/null 2>&1; then
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@hris.com","password":"admin123"}' 2>/dev/null)

    if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
        print_success "Admin user exists and login works"
    else
        print_error "Admin user not found or login failed"
        print_info "Fix: curl -X POST http://localhost:3001/api/v1/auth/seed"
    fi
else
    print_warning "Cannot check admin user (backend not running)"
fi
echo ""

# Summary
echo "========================================"
echo "Summary"
echo "========================================"
echo ""

ALL_GOOD=true

# Check critical components
if ! docker ps &> /dev/null 2>&1; then
    print_error "Docker is not running"
    ALL_GOOD=false
fi

if ! docker ps | grep -q "hris-postgres"; then
    print_error "PostgreSQL container not running"
    ALL_GOOD=false
fi

if [ ! -f "backend/.env" ]; then
    print_error "backend/.env missing"
    ALL_GOOD=false
fi

if [ ! -d "backend/node_modules" ]; then
    print_error "Backend dependencies not installed"
    ALL_GOOD=false
fi

if $ALL_GOOD; then
    echo -e "${GREEN}✓ System looks good!${NC}"
    echo ""
    echo "Services:"
    echo "  - Backend:  http://localhost:3001"
    echo "  - Frontend: http://localhost:3000"
    echo "  - API Docs: http://localhost:3001/api/docs"
    echo ""
    echo "Admin Login:"
    echo "  - Email:    admin@hris.com"
    echo "  - Password: admin123"
else
    echo -e "${RED}✗ Issues found. Please fix the errors above.${NC}"
    echo ""
    echo "Quick fixes:"
    echo "  1. Start Docker: sudo systemctl start docker"
    echo "  2. Start containers: docker compose up -d"
    echo "  3. Fix .env: cp .env backend/.env"
    echo "  4. Fix port: sed -i 's/localhost:5432/localhost:5433/g' backend/.env"
    echo "  5. Install deps: cd backend && npm install"
    echo "  6. Run migrations: npx prisma migrate deploy"
    echo "  7. Start backend: npm run start:dev"
fi
echo ""
