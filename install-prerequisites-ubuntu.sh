#!/bin/bash

# Install Prerequisites for KPI Management System on Ubuntu
# Run this script before running setup.sh

set -e

echo "🔧 Installing Prerequisites for KPI Management System"
echo "====================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "ℹ $1"; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Please do not run this script as root"
    print_info "Run as regular user: ./install-prerequisites-ubuntu.sh"
    exit 1
fi

echo "Step 1: Updating package list..."
sudo apt-get update -qq
print_success "Package list updated"

echo ""
echo "Step 2: Installing Node.js 20.x LTS..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_warning "Node.js already installed: $NODE_VERSION"
    print_info "If you need to upgrade, visit: https://nodejs.org/"
else
    # Install Node.js 20.x LTS
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed: $(node --version)"
fi

echo ""
echo "Step 3: Installing Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker already installed: $DOCKER_VERSION"
else
    # Install Docker using convenience script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh

    # Add current user to docker group
    sudo usermod -aG docker $USER

    print_success "Docker installed"
    print_warning "You need to logout and login again for docker group to take effect"
    print_info "Or run: newgrp docker"
fi

echo ""
echo "Step 4: Installing Docker Compose..."
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
    else
        COMPOSE_VERSION=$(docker compose version)
    fi
    print_success "Docker Compose already installed: $COMPOSE_VERSION"
else
    # Try installing docker-compose-plugin first (recommended)
    sudo apt-get install -y docker-compose-plugin 2>/dev/null || {
        # If plugin installation fails, install standalone version
        print_info "Installing standalone docker-compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    }
    print_success "Docker Compose installed"
fi

echo ""
echo "Step 5: Installing additional tools..."
sudo apt-get install -y curl wget git jq
print_success "Additional tools installed"

echo ""
echo "====================================================="
echo -e "${GREEN}✓ All prerequisites installed!${NC}"
echo "====================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. If this is your first time installing Docker, logout and login again:"
echo "   logout"
echo ""
echo "2. Or activate docker group without logout:"
echo "   newgrp docker"
echo ""
echo "3. Verify installations:"
echo "   node --version"
echo "   npm --version"
echo "   docker --version"
echo "   docker compose version"
echo ""
echo "4. Run the setup script:"
echo "   ./setup.sh"
echo ""
print_warning "Note: If you see 'permission denied' when running docker commands,"
print_info "logout and login again, or run: newgrp docker"
echo ""
