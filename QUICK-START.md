# KPI Management System - Quick Start Guide

Fast deployment guide for experienced developers.

---

## Prerequisites

- Ubuntu 22.04 server with sudo access
- Domain name configured
- Basic knowledge of Linux, Node.js, PostgreSQL

---

## 🚀 Express Installation (10 minutes)

### 1. Install Dependencies (3 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version && psql --version && redis-cli --version
```

---

### 2. Setup Database (2 minutes)

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER kpi_user WITH PASSWORD 'ChangeThisPassword123';
CREATE DATABASE kpi_db OWNER kpi_user;
GRANT ALL PRIVILEGES ON DATABASE kpi_db TO kpi_user;
\q
EOF

# Test connection
PGPASSWORD='ChangeThisPassword123' psql -U kpi_user -h localhost -d kpi_db -c "SELECT version();"
```

---

### 3. Clone & Setup Backend (2 minutes)

```bash
# Clone repository
cd /opt
sudo git clone <your-repo-url> kpi-management-system
sudo chown -R $USER:$USER kpi-management-system

# Backend setup
cd kpi-management-system/backend
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://kpi_user:ChangeThisPassword123@localhost:5432/kpi_db?schema=public"
JWT_SECRET="$(openssl rand -hex 64)"
NODE_ENV=production
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3000
EOF

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Build backend
npm run build
```

---

### 4. Setup Frontend (1 minute)

```bash
cd /opt/kpi-management-system/frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Build frontend
npm run build
```

---

### 5. Start with PM2 (1 minute)

```bash
# Start backend
cd /opt/kpi-management-system/backend
pm2 start npm --name kpi-backend -- run start:prod

# Start frontend
cd /opt/kpi-management-system/frontend
pm2 start npm --name kpi-frontend -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

---

### 6. Configure Nginx (1 minute)

```bash
sudo tee /etc/nginx/sites-available/kpi << 'EOF'
server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/kpi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

---

## ✅ Verify Installation

```bash
# Check services
pm2 status
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx

# Test endpoints
curl http://localhost:3001/api/v1/auth/seed  # Should return: {"message":"Seed completed"}
curl http://localhost:3000                    # Should return HTML

# View logs
pm2 logs
```

---

## 🔑 Default Login

Open browser: `http://your-server-ip`

**Credentials:**
- Email: `admin@hris.com`
- Password: `admin123`

**⚠️ Change password immediately!**

---

## 🔒 Quick Security Setup (5 minutes)

```bash
# Generate strong JWT secret
JWT_SECRET=$(openssl rand -hex 64)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" /opt/kpi-management-system/backend/.env

# Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Setup SSL (if domain is configured)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📦 Quick Backup Setup

```bash
# Create backup script
sudo mkdir -p /opt/scripts
sudo tee /opt/scripts/backup-kpi.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/kpi"
mkdir -p $BACKUP_DIR
PGPASSWORD="ChangeThisPassword123" pg_dump -U kpi_user -h localhost kpi_db | gzip > $BACKUP_DIR/kpi_$(date +%Y%m%d_%H%M%S).sql.gz
find $BACKUP_DIR -mtime +7 -delete
EOF

sudo chmod +x /opt/scripts/backup-kpi.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scripts/backup-kpi.sh") | crontab -
```

---

## 🛠️ Troubleshooting Quick Commands

```bash
# Backend not starting
cd /opt/kpi-management-system/backend
pm2 logs kpi-backend --lines 50

# Frontend not starting
cd /opt/kpi-management-system/frontend
pm2 logs kpi-frontend --lines 50

# Database connection issues
PGPASSWORD='ChangeThisPassword123' psql -U kpi_user -h localhost -d kpi_db

# Redis connection issues
redis-cli ping  # Should return PONG

# Restart everything
pm2 restart all
sudo systemctl restart postgresql redis-server nginx
```

---

## 📚 Next Steps

1. ✅ Change admin password
2. ✅ Create users and departments
3. ✅ Create assessment periods
4. ✅ Configure email notifications (if needed)
5. ✅ Setup monitoring
6. ✅ Configure backups
7. ✅ Review security settings

---

## 📖 Full Documentation

For detailed instructions, see:
- `INSTALLATION.md` - Complete installation guide
- `DEPLOYMENT-CHECKLIST.md` - Deployment checklist
- `README.md` - Project overview
- `API_DOCUMENTATION.md` - API reference

---

## 🆘 Need Help?

**Common Issues:**

1. **Port 3001 already in use**
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Database migration failed**
   ```bash
   cd backend
   npx prisma migrate reset  # WARNING: Deletes all data
   npx prisma migrate deploy
   ```

3. **Permission denied**
   ```bash
   sudo chown -R $USER:$USER /opt/kpi-management-system
   ```

---

**🎉 You're all set! Happy KPI tracking!**
