# KPI Engine - Deployment Guide

## 📋 Overview

Complete guide for deploying the KPI Management System on Ubuntu server.

**Tech Stack:**
- Backend: NestJS + Prisma + PostgreSQL + Redis + BullMQ
- Frontend: Next.js 16 + React 19 + Zustand
- Database: PostgreSQL 16 (Docker)
- Cache: Redis 7 (Docker)
- Web Server: Nginx (reverse proxy)
- Process Manager: PM2

---

## 🚀 Quick Setup (5 Minutes)

### Prerequisites

**Server Requirements:**
- Ubuntu 20.04+ / Debian 10+
- 2GB+ RAM
- 2 vCPUs recommended
- Root/sudo access

**Software Required:**
```bash
sudo apt update && sudo apt install -y \
  nodejs \
  npm \
  postgresql-client \
  nginx \
  curl \
  git
```

### Clone & Setup

```bash
# Clone repository
cd /opt
git clone git@github.com:itBiensi/kpi-engine.git
cd kpi-engine

# Setup SSH key (for GitHub deploy key)
ssh-keygen -t ed25519 -C "kpi-engine-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
# Add the public key to GitHub repository deploy keys
```

---

## 🐳 Docker Setup (PostgreSQL & Redis)

### Start Database & Redis

```bash
cd /opt/kpi-engine

# Start services
docker compose up -d

# Verify containers
docker ps
```

**Expected Output:**
```
CONTAINER ID   IMAGE                STATUS
942368dacb31   postgres:16-alpine   Up (healthy)
89b93f998028   redis:7-alpine       Up (healthy)
```

### Services

- **PostgreSQL**: `localhost:5433`
  - User: `hris_user`
  - Password: `hris_password`
  - Database: `hris_db`

- **Redis**: `localhost:6379`

---

## 🔧 Backend Setup

### Install Dependencies

```bash
cd /opt/kpi-engine/backend
npm install
```

### Configure Environment Variables

**Create `.env` file:**
```bash
cat > /opt/kpi-engine/backend/.env << 'EOF'
# Database
DATABASE_URL="postgresql://hris_user:hris_password@localhost:5433/hris_db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=super-secret-key-change-in-production-kpi-engine
JWT_EXPIRATION=24h

# App
BACKEND_PORT=3001
FRONTEND_PORT=3000
FRONTEND_URL=http://43.156.137.74
EOF
```

⚠️ **IMPORTANT:** Change `JWT_SECRET` to a strong random string in production!

### Database Migrations

```bash
cd /opt/kpi-engine/backend

# Run migrations
npx prisma migrate deploy

# Verify database
npx prisma studio  # Optional - opens Prisma Studio
```

### Seed Initial Data

```bash
# Seed admin user and initial data
curl -X POST http://localhost:3001/api/v1/auth/seed
```

**Default Credentials:**
- Email: `admin@hris.com`
- Password: `admin123`
⚠️ Change password immediately after first login!

### Build & Start Backend

```bash
cd /opt/kpi-engine/backend

# Build application
npm run build

# Start with PM2
pm2 start dist/src/main.js --name kpi-backend

# Save PM2 configuration
pm2 save

# Verify status
pm2 list
pm2 logs kpi-backend --lines 20
```

---

## 🌐 Frontend Setup

### Install Dependencies

```bash
cd /opt/kpi-engine/frontend
npm install
```

### Configure Environment Variables

**⚠️ CRITICAL:** Do NOT include `/api` in `NEXT_PUBLIC_API_URL`!

**Create `.env.local` file:**
```bash
cat > /opt/kpi-engine/frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://43.156.137.74
NEXT_PUBLIC_APP_URL=http://43.156.137.74
EOF
```

**Wrong Configuration (CAUSES DOUBLE /api ERROR):**
```bash
# ❌ DON'T DO THIS:
NEXT_PUBLIC_API_URL=http://43.156.137.74/api
# This results in: http://43.156.137.74/api/api/v1/...
```

**Correct Configuration:**
```bash
# ✅ DO THIS:
NEXT_PUBLIC_API_URL=http://43.156.137.74
# Results in: http://43.156.137.74/api/v1/...
```

### Build Frontend

```bash
cd /opt/kpi-engine/frontend

# Clean previous build
rm -rf .next

# Build with environment variables
NEXT_PUBLIC_API_URL=http://43.156.137.74 \
NEXT_PUBLIC_APP_URL=http://43.156.137.74 \
npm run build
```

### Start Frontend with PM2

```bash
cd /opt/kpi-engine/frontend

# Start with correct working directory
pm2 start npm --name kpi-frontend -- start --chdir /opt/kpi-engine/frontend

# Save PM2 configuration
pm2 save

# Verify status
pm2 list
pm2 logs kpi-frontend --lines 20
```

---

## 🌍 Nginx Configuration

### Create Configuration File

```bash
sudo tee /etc/nginx/sites-available/kpi-engine > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### Enable Configuration

```bash
# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Create symbolic link
sudo ln -sf /etc/nginx/sites-available/kpi-engine /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ Verification

### Check All Services

```bash
# Check Docker containers
docker ps

# Check PM2 processes
pm2 list

# Check Nginx status
sudo systemctl status nginx

# Check firewall
sudo ufw status
```

### Test Backend API

```bash
# Test login endpoint
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}'

# Expected response: {"access_token":"...", "user":{...}}
```

### Test Frontend

```bash
# Test frontend is running
curl -I http://localhost:3000

# Expected response: HTTP/1.1 200 OK
```

### Test Nginx Proxy

```bash
# Test frontend through Nginx
curl -I http://localhost/

# Test backend through Nginx
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}'
```

---

## 🌐 Access from Browser

### URLs

- **Frontend:** `http://43.156.137.74`
- **Backend API:** `http://43.156.137.74/api`
- **API Documentation:** `http://43.156.137.74/api/docs`

### Default Login

- **Email:** `admin@hris.com`
- **Password:** `admin123`
- ⚠️ **Change password immediately!**

---

## 🔧 Troubleshooting

### Problem: Cannot POST /api/api/v1/auth/login (Double /api)

**Cause:** Frontend environment variable includes `/api`:
```bash
# ❌ Wrong
NEXT_PUBLIC_API_URL=http://43.156.137.74/api
```

**Solution:** Remove `/api` from `NEXT_PUBLIC_API_URL`:
```bash
# ✅ Correct
NEXT_PUBLIC_API_URL=http://43.156.137.74
```

**Steps to fix:**
1. Update `.env.local`:
```bash
cd /opt/kpi-engine/frontend
echo 'NEXT_PUBLIC_API_URL=http://43.156.137.74' > .env.local
echo 'NEXT_PUBLIC_APP_URL=http://43.156.137.74' >> .env.local
```

2. Rebuild frontend:
```bash
rm -rf .next
NEXT_PUBLIC_API_URL=http://43.156.137.74 npm run build
```

3. Restart frontend:
```bash
pm2 restart kpi-frontend
```

4. Clear browser cache (Ctrl+Shift+R)

---

### Problem: Backend shows "Environment variable not found: DATABASE_URL"

**Cause:** PM2 not reading `.env` file from correct directory

**Solution:**
```bash
cd /opt/kpi-engine/backend
pm2 delete kpi-backend
pm2 start npm --name kpi-backend -- start --chdir /opt/kpi-engine/backend
```

---

### Problem: PM2 shows "npm error enoent"

**Cause:** PM2 running from wrong directory (workspace instead of project)

**Solution:**
```bash
cd /opt/kpi-engine/frontend
pm2 delete kpi-frontend
pm2 start npm --name kpi-frontend -- start --chdir /opt/kpi-engine/frontend
```

---

### Problem: Database connection failed

**Cause:** PostgreSQL container not running

**Solution:**
```bash
# Check Docker status
docker ps

# Start services if not running
cd /opt/kpi-engine && docker compose up -d

# Check PostgreSQL logs
docker logs hris-postgres
```

---

### Problem: Frontend shows "Network Error"

**Cause:** Backend not accessible through Nginx proxy

**Solution:**
1. Check Nginx configuration:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

2. Check backend is running:
```bash
pm2 status kpi-backend
```

3. Test backend directly:
```bash
curl http://localhost:3001/api/v1/periods/active
```

---

## 📊 PM2 Commands

### Process Management

```bash
# List all processes
pm2 list

# Show logs
pm2 logs kpi-backend
pm2 logs kpi-frontend

# Restart processes
pm2 restart all

# Stop processes
pm2 stop all

# Start processes
pm2 start all

# Delete process
pm2 delete kpi-backend

# Save configuration
pm2 save
pm2 startup
```

### Monitoring

```bash
# Monitor resources
pm2 monit

# Show detailed info
pm2 show kpi-backend

# Restart on crash
pm2 startup
```

---

## 🐳 Docker Commands

### Container Management

```bash
# View running containers
docker ps

# View logs
docker logs hris-postgres
docker logs hris-redis

# Stop containers
docker compose down

# Start containers
docker compose up -d

# Restart containers
docker compose restart

# Rebuild and restart
docker compose up -d --build
```

### Database Access

```bash
# Access PostgreSQL directly
docker exec -it hris-postgres psql -U hris_user -d hris_db

# Backup database
docker exec hris-postgres pg_dump -U hris_user hris_db > backup.sql

# Restore database
docker exec -i hris-postgres psql -U hris_user -d hris_db < backup.sql
```

### Redis Access

```bash
# Access Redis CLI
docker exec -it hris-redis redis-cli

# Clear all keys
docker exec hris-redis redis-cli FLUSHALL

# Check Redis info
docker exec hris-redis redis-cli INFO
```

---

## 🔄 Application Updates

### Update Backend

```bash
cd /opt/kpi-engine

# Pull latest changes
git pull origin main

# Update backend dependencies
cd backend
npm install

# Run migrations
npx prisma migrate deploy

# Rebuild backend
npm run build

# Restart PM2
pm2 restart kpi-backend
```

### Update Frontend

```bash
cd /opt/kpi-engine

# Pull latest changes
git pull origin main

# Update frontend dependencies
cd frontend
npm install

# Rebuild frontend
rm -rf .next
NEXT_PUBLIC_API_URL=http://43.156.137.74 \
NEXT_PUBLIC_APP_URL=http://43.156.137.74 \
npm run build

# Restart PM2
pm2 restart kpi-frontend
```

---

## 🔒 Security Checklist

### Production Deployment

- [ ] Change default admin password immediately
- [ ] Change `JWT_SECRET` to strong random string
- [ ] Change database credentials (`hris_user:hris_password`)
- [ ] Configure HTTPS/SSL (Let's Encrypt)
- [ ] Configure firewall rules (only allow necessary ports)
- [ ] Set up regular database backups
- [ ] Monitor logs for suspicious activity
- [ ] Enable fail2ban for SSH brute-force protection
- [ ] Keep system packages updated (`apt update && apt upgrade`)

### Environment Variables

- [ ] Set strong `JWT_SECRET` (minimum 32 characters)
- [ ] Set strong database password
- [ ] Configure `FRONTEND_URL` correctly
- [ ] Never commit `.env` or `.env.local` files
- [ ] Use `.gitignore` to exclude sensitive files

---

## 📝 Maintenance

### Log Rotation

```bash
# Nginx logs are automatically rotated
sudo logrotate /etc/logrotate.d/nginx

# PM2 logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Database Backups

```bash
# Create backup directory
mkdir -p /opt/backups/kpi-engine

# Daily backup cron job
crontab -e "0 2 * * * root docker exec hris-postgres pg_dump -U hris_user hris_db > /opt/backups/kpi-engine/hris_$(date +\%Y\%m\%d).sql"
```

### System Updates

```bash
# Check for updates weekly
sudo apt update
sudo apt upgrade

# Schedule automatic updates
sudo apt install -y unattended-upgrades
```

---

## 🆘 Disaster Recovery

### Restore from Backup

```bash
# Stop application
pm2 stop all

# Restore database
docker exec -i hris-postgres psql -U hris_user -d hris_db < /opt/backups/kpi-engine/hris_2026-02-16.sql

# Start application
pm2 start all
```

### Restart Services

```bash
# Restart all services
pm2 restart all
docker compose restart
sudo systemctl restart nginx

# Check status
pm2 list
docker ps
sudo systemctl status nginx
```

---

## 📚 Additional Resources

### Documentation

- [API Documentation](http://43.156.137.74/api/docs)
- [Project README](https://github.com/itBiensi/kpi-engine#readme)
- [Installation Guide](./INSTALLATION.md)
- [Quick Start Guide](./QUICK-START.md)

### Support

- Report issues: https://github.com/itBiensi/kpi-engine/issues
- Check logs: `pm2 logs kpi-backend` and `pm2 logs kpi-frontend`

---

## 📞 Contact & Support

For deployment issues, check:
1. PM2 logs: `pm2 logs <process-name>`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Docker logs: `docker logs <container-name>`
4. Application logs: Check API documentation endpoint

---

**Last Updated:** 2026-02-16
**Version:** 1.0
