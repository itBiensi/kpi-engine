#!/bin/bash

# Quick Fix for CORS Error - Run this on your Ubuntu server
# This fixes the "localhost:3001" API call issue

echo "🔧 Quick CORS Fix for KPI Management System"
echo "==========================================="
echo ""

PUBLIC_IP="43.156.137.74"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}This script will:${NC}"
echo "1. Configure frontend to use public IP: $PUBLIC_IP"
echo "2. Configure backend CORS to allow public IP"
echo "3. Restart both services"
echo ""

# Step 1: Create frontend/.env.local
echo "Step 1: Creating frontend/.env.local..."
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://43.156.137.74:3001
EOF
echo -e "${GREEN}✓${NC} Created frontend/.env.local"

# Step 2: Update backend/.env
echo ""
echo "Step 2: Updating backend/.env..."
if ! grep -q "^FRONTEND_URL=" backend/.env; then
    echo "" >> backend/.env
    echo "# Frontend URL for CORS" >> backend/.env
    echo "FRONTEND_URL=http://43.156.137.74:3000" >> backend/.env
    echo -e "${GREEN}✓${NC} Added FRONTEND_URL to backend/.env"
else
    sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=http://43.156.137.74:3000|g" backend/.env
    echo -e "${GREEN}✓${NC} Updated FRONTEND_URL in backend/.env"
fi

# Step 3: Stop all processes
echo ""
echo "Step 3: Stopping existing processes..."
sudo pkill -9 -f 'npm run start:dev' 2>/dev/null || true
sudo pkill -9 -f 'npm run dev' 2>/dev/null || true
sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true
echo -e "${GREEN}✓${NC} Stopped old processes"

# Wait for ports to be released
sleep 3

# Step 4: Start backend
echo ""
echo "Step 4: Starting backend..."
cd backend
npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓${NC} Backend starting (PID: $BACKEND_PID)"

# Wait for backend to start
sleep 10

# Step 5: Start frontend
echo ""
echo "Step 5: Starting frontend..."
cd ../frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓${NC} Frontend starting (PID: $FRONTEND_PID)"

# Wait for frontend to start
sleep 10

# Step 6: Verify services
echo ""
echo "Step 6: Verifying services..."

if curl -s http://localhost:3001/api/docs > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend is running"
else
    echo -e "${YELLOW}⚠${NC} Backend may still be starting... (check: tail -f /tmp/backend.log)"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓${NC} Frontend is running"
else
    echo -e "${YELLOW}⚠${NC} Frontend may still be starting... (check: tail -f /tmp/frontend.log)"
fi

# Summary
echo ""
echo "==========================================="
echo -e "${GREEN}✓ Configuration Complete!${NC}"
echo "==========================================="
echo ""
echo "📋 What was fixed:"
echo "  - Frontend now calls: http://43.156.137.74:3001"
echo "  - Backend CORS allows: http://43.156.137.74:3000"
echo ""
echo "🌐 Access your application:"
echo "  http://43.156.137.74:3000"
echo ""
echo "🔐 Login with:"
echo "  Email: admin@hris.com"
echo "  Password: admin123"
echo ""
echo "⚠️  Important:"
echo "  1. Clear your browser cache or use incognito mode"
echo "  2. Make sure firewall allows ports 3000 and 3001:"
echo "     sudo ufw allow 3000/tcp"
echo "     sudo ufw allow 3001/tcp"
echo "  3. Check cloud security group allows inbound on 3000, 3001"
echo ""
echo "📝 Check logs if needed:"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
