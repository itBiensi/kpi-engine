#!/bin/bash

# KPI Management System - Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🚀 KPI Management System - Initial Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if .env file exists in root
if [ ! -f ".env" ]; then
    print_warning ".env file not found in root. Copying from .env.example..."
    cp .env.example .env
    print_success ".env file created in root"
else
    print_success ".env file exists in root"
fi

# Check if backend/.env exists
if [ ! -f "backend/.env" ]; then
    print_warning "backend/.env not found. Copying from root .env..."
    cp .env backend/.env
    print_success "backend/.env file created"
else
    print_success "backend/.env file exists"
fi

# Verify critical environment variables in backend/.env
print_info "Verifying environment variables..."
if ! grep -q "DATABASE_URL=" backend/.env; then
    print_error "DATABASE_URL not found in backend/.env"
    print_info "Adding DATABASE_URL to backend/.env..."
    echo 'DATABASE_URL="postgresql://hris_user:hris_password@localhost:5433/hris_db"' >> backend/.env
else
    # Check if DATABASE_URL has the correct port (5433, not 5432)
    if grep -q "localhost:5432" backend/.env; then
        print_warning "DATABASE_URL using wrong port (5432). Fixing to 5433..."
        sed -i.bak 's/localhost:5432/localhost:5433/g' backend/.env
        print_success "DATABASE_URL port corrected"
    fi
fi

if ! grep -q "JWT_SECRET=" backend/.env; then
    print_warning "JWT_SECRET not found in backend/.env"
    print_info "Adding JWT_SECRET to backend/.env..."
    echo "JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-$(date +%s)" >> backend/.env
fi

if ! grep -q "REDIS_HOST=" backend/.env; then
    print_info "Adding Redis configuration to backend/.env..."
    echo "REDIS_HOST=localhost" >> backend/.env
    echo "REDIS_PORT=6379" >> backend/.env
fi

print_success "Environment variables verified"

echo ""
print_info "Step 1: Checking Docker installation..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    print_info "Please install Docker first:"
    print_info "  Ubuntu: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    print_info "  Or visit: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check for docker-compose (standalone) or docker compose (plugin)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    print_success "Found docker-compose (standalone)"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    print_success "Found docker compose (plugin)"
else
    print_error "Docker Compose is not installed"
    print_info "Please install Docker Compose:"
    print_info "  Option 1 (Recommended): sudo apt-get update && sudo apt-get install docker-compose-plugin"
    print_info "  Option 2: sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
    print_info "  Or visit: https://docs.docker.com/compose/install/"
    exit 1
fi

print_info "Starting Docker services (PostgreSQL & Redis)..."
$DOCKER_COMPOSE_CMD up -d
if [ $? -eq 0 ]; then
    print_success "Docker services started"
else
    print_error "Failed to start Docker services"
    print_info "This might be a permissions issue. Try running with sudo or add your user to docker group:"
    print_info "  sudo usermod -aG docker \$USER"
    print_info "  Then logout and login again"
    exit 1
fi

echo ""
print_info "Step 2: Waiting for PostgreSQL to be ready..."
sleep 5
print_success "PostgreSQL should be ready"

echo ""
print_info "Step 3: Installing backend dependencies..."
cd backend
npm install
if [ $? -eq 0 ]; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

echo ""
print_info "Step 4: Running database migrations..."
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    print_success "Database migrations completed"
else
    print_error "Failed to run database migrations"
    print_info "Trying to reset and migrate..."
    npx prisma migrate reset --force
    npx prisma migrate deploy
fi

echo ""
print_info "Step 5: Generating Prisma Client..."
npx prisma generate
if [ $? -eq 0 ]; then
    print_success "Prisma Client generated"
else
    print_error "Failed to generate Prisma Client"
    exit 1
fi

echo ""
print_info "Step 6: Starting backend server..."
npm run start:dev &
BACKEND_PID=$!
print_success "Backend server starting (PID: $BACKEND_PID)"

echo ""
print_info "Waiting for backend to be ready..."
sleep 10

echo ""
print_info "Step 7: Seeding admin user..."
SEED_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/seed)
if [[ $SEED_RESPONSE == *"Seed completed"* ]]; then
    print_success "Admin user seeded successfully"
else
    print_error "Failed to seed admin user"
    print_info "Response: $SEED_RESPONSE"
    print_warning "You can manually seed later with: curl -X POST http://localhost:3001/api/v1/auth/seed"
fi

cd ..

echo ""
print_info "Step 8: Installing frontend dependencies..."
cd frontend
npm install
if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

echo ""
print_info "Step 9: Starting frontend server..."
npm run dev &
FRONTEND_PID=$!
print_success "Frontend server starting (PID: $FRONTEND_PID)"

cd ..

echo ""
echo "========================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "========================================"
echo ""
echo "📊 Services:"
echo "  - Backend:  http://localhost:3001"
echo "  - Frontend: http://localhost:3000"
echo "  - API Docs: http://localhost:3001/api/docs"
echo "  - Prisma:   npx prisma studio (in backend folder)"
echo ""
echo "🔐 Default Admin Login:"
echo "  - Email:    admin@hris.com"
echo "  - Password: admin123"
echo ""
echo "📚 Documentation:"
echo "  - Database: backend/docs/DATABASE.md"
echo "  - API:      backend/docs/API.md"
echo "  - README:   README.md"
echo ""
echo "🛑 To stop services:"
echo "  - Backend:  kill $BACKEND_PID"
echo "  - Frontend: kill $FRONTEND_PID"
echo "  - Docker:   docker-compose down"
echo ""
print_warning "Note: Backend and Frontend are running in background"
print_info "Check logs with: tail -f backend/logs/* (if logging is configured)"
echo ""
