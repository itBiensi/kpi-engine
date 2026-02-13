#!/bin/bash

# KPI Management System - Deployment Configuration
# This script configures the application for deployment with a public IP

set -e

echo "🌐 KPI Management System - Deployment Configuration"
echo "===================================================="
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

# Get public IP address
if [ -z "$1" ]; then
    print_error "Public IP address required"
    echo ""
    echo "Usage: ./configure-deployment.sh <PUBLIC_IP>"
    echo "Example: ./configure-deployment.sh 43.156.137.74"
    echo ""
    exit 1
fi

PUBLIC_IP="$1"

print_info "Configuring for public IP: $PUBLIC_IP"
echo ""

# Step 1: Update root .env
print_info "Step 1: Updating root .env..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        print_error ".env.example not found"
        exit 1
    fi
fi

# Add or update FRONTEND_URL in root .env
if grep -q "^FRONTEND_URL=" .env; then
    sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=http://${PUBLIC_IP}:3000|g" .env
    print_success "Updated FRONTEND_URL in root .env"
else
    echo "" >> .env
    echo "# Frontend URL for CORS" >> .env
    echo "FRONTEND_URL=http://${PUBLIC_IP}:3000" >> .env
    print_success "Added FRONTEND_URL to root .env"
fi

# Step 2: Update backend/.env
print_info "Step 2: Updating backend/.env..."
if [ ! -f "backend/.env" ]; then
    cp .env backend/.env
    print_success "Created backend/.env"
else
    # Update FRONTEND_URL in backend/.env
    if grep -q "^FRONTEND_URL=" backend/.env; then
        sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=http://${PUBLIC_IP}:3000|g" backend/.env
        print_success "Updated FRONTEND_URL in backend/.env"
    else
        echo "" >> backend/.env
        echo "# Frontend URL for CORS" >> backend/.env
        echo "FRONTEND_URL=http://${PUBLIC_IP}:3000" >> backend/.env
        print_success "Added FRONTEND_URL to backend/.env"
    fi
fi

# Verify DATABASE_URL port
if grep -q "localhost:5432" backend/.env; then
    print_warning "DATABASE_URL using wrong port (5432). Fixing to 5433..."
    sed -i.bak 's/localhost:5432/localhost:5433/g' backend/.env
    print_success "DATABASE_URL port corrected"
fi

# Step 3: Create/Update frontend/.env.local
print_info "Step 3: Configuring frontend/.env.local..."
cat > frontend/.env.local << EOF
# API URL for frontend (browser-side)
NEXT_PUBLIC_API_URL=http://${PUBLIC_IP}:3001
EOF

print_success "Created frontend/.env.local with public IP"

# Step 4: Verify configuration
echo ""
print_info "Step 4: Verifying configuration..."

echo ""
echo "Root .env FRONTEND_URL:"
grep "FRONTEND_URL=" .env || echo "Not found"

echo ""
echo "Backend .env FRONTEND_URL:"
grep "FRONTEND_URL=" backend/.env || echo "Not found"

echo ""
echo "Backend .env DATABASE_URL:"
grep "DATABASE_URL=" backend/.env || echo "Not found"

echo ""
echo "Frontend .env.local:"
cat frontend/.env.local

echo ""
echo "===================================================="
print_success "Deployment configuration complete!"
echo "===================================================="
echo ""
echo "📋 Configuration Summary:"
echo "  - Backend CORS will allow: http://${PUBLIC_IP}:3000"
echo "  - Frontend will call API at: http://${PUBLIC_IP}:3001"
echo "  - Database URL: localhost:5433"
echo ""
echo "🔄 Next Steps:"
echo ""
echo "1. Restart backend to apply CORS changes:"
echo "   cd backend"
echo "   sudo pkill -9 -f 'npm run start:dev'"
echo "   npm run start:dev > /tmp/backend.log 2>&1 &"
echo ""
echo "2. Restart frontend to load environment variables:"
echo "   cd ../frontend"
echo "   sudo pkill -9 -f 'npm run dev'"
echo "   npm run dev > /tmp/frontend.log 2>&1 &"
echo ""
echo "3. Wait 15 seconds for services to start"
echo ""
echo "4. Verify services are running:"
echo "   curl http://localhost:3001/api/docs | head -20"
echo "   curl http://localhost:3000 | head -20"
echo ""
echo "5. Check firewall allows ports 3000 and 3001:"
echo "   sudo ufw status"
echo "   # If needed:"
echo "   sudo ufw allow 3000/tcp"
echo "   sudo ufw allow 3001/tcp"
echo ""
echo "6. Open browser and access:"
echo "   http://${PUBLIC_IP}:3000"
echo ""
echo "7. Login with:"
echo "   Email: admin@hris.com"
echo "   Password: admin123"
echo ""
print_warning "Note: Clear browser cache or use incognito mode if you still see errors"
print_info "Note: Check cloud provider security groups allow inbound traffic on ports 3000 and 3001"
echo ""
