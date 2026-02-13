# KPI Management System - Installation Guide

Complete step-by-step guide to install and deploy the KPI Management System on a new server.

---

## Quick Start (Automated Setup)

For first-time installation, we provide an automated setup script:

```bash
# Clone the repository
git clone git@github.com:itBiensi/kpi-engine.git
cd kpi-engine

# Run automated setup script
./setup.sh
```

**What the script does:**
- ✓ Creates .env file from template
- ✓ Starts Docker services (PostgreSQL & Redis)
- ✓ Installs all dependencies
- ✓ Runs database migrations
- ✓ Seeds admin user
- ✓ Starts both backend and frontend servers

**After setup completes:**
- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- API Docs: http://localhost:3001/api/docs
- Admin login: admin@hris.com / admin123

**If you encounter any errors, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

---

## Manual Installation

If you prefer manual setup or the automated script fails, follow the steps below:

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 11+ / Windows Server 2019+
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher

### Recommended Requirements (Production)

- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Node.js**: 20.x LTS
- **PostgreSQL**: 15.x
- **Redis**: 7.x

---

## Prerequisites

Before installation, ensure you have the following installed:

### 1. Node.js and npm

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18+ or v20+
npm --version   # Should be 9+ or 10+
```

### 2. PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version  # Should be 14.x or higher
```

### 3. Redis

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli --version  # Should be 6.x or higher
```

### 4. Git

```bash
# Ubuntu/Debian
sudo apt install git

# Verify installation
git --version
```

---

## Installation Steps

### Step 1: Clone the Repository

```bash
# Navigate to your desired installation directory
cd /opt

# Clone the repository
sudo git clone https://github.com/your-org/kpi-management-system.git
cd kpi-management-system

# Set proper permissions
sudo chown -R $USER:$USER /opt/kpi-management-system
```

**Alternative: Upload via SCP/SFTP**

```bash
# From your local machine
scp -r /path/to/KPI user@server:/opt/kpi-management-system
```

---

### Step 2: Backend Setup

#### 2.1 Install Dependencies

```bash
cd /opt/kpi-management-system/backend
npm install
```

#### 2.2 Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Required Environment Variables:**

```env
# Database Configuration
DATABASE_URL="postgresql://kpi_user:secure_password@localhost:5432/kpi_db?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Configuration
NODE_ENV=production
PORT=3001

# CORS Configuration (Frontend URL)
FRONTEND_URL=http://your-domain.com

# File Upload Configuration
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
```

**Security Notes:**
- Change `JWT_SECRET` to a random 64-character string
- Use strong database passwords
- Never commit `.env` to version control

#### 2.3 Generate Strong JWT Secret

```bash
# Generate random JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output and paste into .env as JWT_SECRET
```

---

### Step 3: Database Setup

#### 3.1 Create Database User

```bash
# Login to PostgreSQL as superuser
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE USER kpi_user WITH PASSWORD 'secure_password';
CREATE DATABASE kpi_db OWNER kpi_user;
GRANT ALL PRIVILEGES ON DATABASE kpi_db TO kpi_user;

# Exit PostgreSQL
\q
```

#### 3.2 Run Database Migrations

```bash
cd /opt/kpi-management-system/backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify migrations
npx prisma migrate status
```

#### 3.3 Seed Initial Data (Optional)

```bash
# This creates the admin user: admin@hris.com / admin123
curl -X POST http://localhost:3001/api/v1/auth/seed
```

**Important:** Change the admin password immediately after first login!

---

### Step 4: Frontend Setup

#### 4.1 Install Dependencies

```bash
cd /opt/kpi-management-system/frontend
npm install
```

#### 4.2 Configure Environment Variables

```bash
# Create environment file
nano .env.local
```

**Required Environment Variables:**

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# For production, use your domain
# NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

#### 4.3 Build Frontend

```bash
# Build for production
npm run build

# Verify build completed successfully
ls -la .next/
```

---

## Configuration

### Backend Configuration

#### Prisma Studio (Optional - Database GUI)

```bash
cd backend
npx prisma studio
```

Access at: `http://localhost:5555`

#### BullMQ Dashboard (Optional - Job Queue Monitoring)

Install and run BullMQ Dashboard:

```bash
npm install -g bull-board

# Run dashboard
bull-board --redis-host localhost --redis-port 6379
```

Access at: `http://localhost:3000`

---

### Frontend Configuration

#### Next.js Configuration

Edit `frontend/next.config.js` if needed:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Production optimizations
  compress: true,

  // Add your domain for production
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
```

---

## Running the Application

### Development Mode

#### Terminal 1 - Backend

```bash
cd /opt/kpi-management-system/backend
npm run start:dev
```

Backend will be available at: `http://localhost:3001`

API Documentation (Swagger): `http://localhost:3001/api/docs`

#### Terminal 2 - Frontend

```bash
cd /opt/kpi-management-system/frontend
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

### Production Mode

#### Option 1: Using PM2 (Recommended)

**Install PM2:**

```bash
sudo npm install -g pm2
```

**Backend:**

```bash
cd /opt/kpi-management-system/backend

# Build backend
npm run build

# Start with PM2
pm2 start dist/main.js --name kpi-backend

# Or use ecosystem file
pm2 start ecosystem.config.js
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [
    {
      name: 'kpi-backend',
      script: 'dist/main.js',
      cwd: '/opt/kpi-management-system/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
```

**Frontend:**

```bash
cd /opt/kpi-management-system/frontend

# Start with PM2
pm2 start npm --name kpi-frontend -- start

# Or for better performance, use standalone mode
npm run build
pm2 start npm --name kpi-frontend -- run start

# Alternative: Use PM2 ecosystem file
pm2 start ecosystem.config.js
```

**PM2 Management Commands:**

```bash
# View status
pm2 status

# View logs
pm2 logs kpi-backend
pm2 logs kpi-frontend

# Restart
pm2 restart kpi-backend
pm2 restart kpi-frontend

# Stop
pm2 stop all

# Start on system boot
pm2 startup
pm2 save
```

---

#### Option 2: Using Systemd Services

**Backend Service:**

```bash
sudo nano /etc/systemd/system/kpi-backend.service
```

```ini
[Unit]
Description=KPI Backend Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/kpi-management-system/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend Service:**

```bash
sudo nano /etc/systemd/system/kpi-frontend.service
```

```ini
[Unit]
Description=KPI Frontend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/kpi-management-system/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and Start Services:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable kpi-backend
sudo systemctl enable kpi-frontend

# Start services
sudo systemctl start kpi-backend
sudo systemctl start kpi-frontend

# Check status
sudo systemctl status kpi-backend
sudo systemctl status kpi-frontend
```

---

## Production Deployment

### 1. Nginx Reverse Proxy Setup

#### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/kpi-management
```

**Nginx Configuration:**

```nginx
# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for file exports
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}

# Frontend
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable Site:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/kpi-management /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

### 2. SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificates
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

### 3. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (be careful!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

### 4. Database Backup Setup

**Automated Daily Backup Script:**

```bash
sudo nano /opt/scripts/backup-kpi-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/kpi"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="kpi_db"
DB_USER="kpi_user"

mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD="secure_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/kpi_db_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "kpi_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: kpi_db_$TIMESTAMP.sql.gz"
```

**Make Executable and Schedule:**

```bash
sudo chmod +x /opt/scripts/backup-kpi-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e

# Add this line:
0 2 * * * /opt/scripts/backup-kpi-db.sh >> /var/log/kpi-backup.log 2>&1
```

---

### 5. Monitoring Setup

#### Install Node Exporter (for Prometheus)

```bash
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

---

### 6. Log Rotation

```bash
sudo nano /etc/logrotate.d/kpi-management
```

```
/opt/kpi-management-system/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
}

/opt/kpi-management-system/frontend/.next/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
}
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `Error: P1001: Can't reach database server`

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL is listening
sudo netstat -tuln | grep 5432

# Verify database exists
sudo -u postgres psql -l | grep kpi_db

# Check DATABASE_URL in .env
cat backend/.env | grep DATABASE_URL
```

---

#### 2. Redis Connection Failed

**Error:** `Error: Redis connection failed`

**Solution:**
```bash
# Check Redis is running
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

---

#### 3. Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Or kill all node processes
pkill -9 node
```

---

#### 4. Permission Denied Errors

**Solution:**
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/kpi-management-system

# Fix upload directory permissions
sudo chmod 755 /opt/kpi-management-system/backend/uploads
sudo chmod 755 /opt/kpi-management-system/backend/exports
```

---

#### 5. Prisma Migration Errors

**Error:** `Migration failed to apply`

**Solution:**
```bash
cd backend

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or manually fix
npx prisma migrate resolve --rolled-back "migration_name"

# Then run migrations again
npx prisma migrate deploy
```

---

#### 6. npm Install Fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

---

### Logs Location

```bash
# Backend logs (if using PM2)
~/.pm2/logs/kpi-backend-error.log
~/.pm2/logs/kpi-backend-out.log

# System logs
/var/log/nginx/error.log
/var/log/nginx/access.log
/var/log/postgresql/postgresql-15-main.log

# Application logs
/opt/kpi-management-system/backend/logs/
/opt/kpi-management-system/frontend/.next/logs/
```

---

## Health Checks

### Verify Installation

```bash
# Backend health
curl http://localhost:3001/api/v1/auth/seed

# Frontend health
curl http://localhost:3000

# Database connection
cd /opt/kpi-management-system/backend
npx prisma db pull

# Redis connection
redis-cli ping
```

---

## Default Credentials

After installation, login with:

**Admin Account:**
- Email: `admin@hris.com`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

---

## Performance Tuning

### PostgreSQL Tuning

Edit `/etc/postgresql/15/main/postgresql.conf`:

```ini
# Memory
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB

# Connections
max_connections = 200

# Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

### Redis Tuning

Edit `/etc/redis/redis.conf`:

```ini
# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Generated strong JWT_SECRET (64+ characters)
- [ ] Configured firewall (UFW)
- [ ] Enabled SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configured log rotation
- [ ] Disabled PostgreSQL remote access (if not needed)
- [ ] Set up monitoring and alerts
- [ ] Reviewed and secured .env files (not accessible via web)
- [ ] Configured CORS properly in backend

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/kpi-management-system/issues
- Documentation: https://docs.your-domain.com
- Email: support@your-domain.com

---

## License

[Your License Here]

---

**Last Updated:** February 2026
**Version:** 1.0.0
