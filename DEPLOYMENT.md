# Deployment Guide

This guide explains how to deploy the KPI Management System to a production server with a public IP address.

## Prerequisites

- Ubuntu 20.04+ server with public IP
- Node.js 20.x LTS installed
- Docker and Docker Compose installed
- SSH access to the server
- Firewall/Security Group configured

## Quick Deployment (Ubuntu Server)

### 1. Install Prerequisites

On your Ubuntu server, run:

```bash
# Clone the repository
git clone git@github.com:itBiensi/kpi-engine.git
cd kpi-engine

# Make scripts executable
chmod +x *.sh

# Install Node.js, Docker, Docker Compose
./install-prerequisites-ubuntu.sh

# If this is your first Docker installation, logout and login again:
logout
# Or activate docker group:
newgrp docker
```

### 2. Initial Setup

Run the automated setup script:

```bash
./setup.sh
```

This will:
- Create environment files
- Start Docker services (PostgreSQL, Redis)
- Install dependencies
- Run database migrations
- Seed admin user
- Start backend and frontend servers

### 3. Configure for Public IP

**IMPORTANT**: After initial setup, configure the application for your public IP:

```bash
# Replace with your actual public IP
./configure-deployment.sh <YOUR_PUBLIC_IP>

# Example:
./configure-deployment.sh 43.156.137.74
```

This script will:
- Update backend CORS to allow your public IP
- Configure frontend to make API calls to your public IP
- Verify all environment variables

### 4. Restart Services

After configuration, restart both services:

```bash
# Stop existing processes
cd backend
sudo pkill -9 -f 'npm run start:dev'
cd ../frontend
sudo pkill -9 -f 'npm run dev'

# Wait for ports to be released
sleep 3

# Start backend
cd ../backend
npm run start:dev > /tmp/backend.log 2>&1 &

# Start frontend
cd ../frontend
npm run dev > /tmp/frontend.log 2>&1 &

# Wait for services to start
sleep 15
```

### 5. Configure Firewall

#### Ubuntu UFW

```bash
# Check firewall status
sudo ufw status

# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # Backend

# Enable firewall (if not already enabled)
sudo ufw enable
```

#### Cloud Provider Security Groups

If using cloud providers (AWS, Azure, GCP, Alibaba Cloud, etc.), configure security groups to allow:

- **Port 22** (TCP) - SSH access
- **Port 3000** (TCP) - Frontend (from 0.0.0.0/0 or your IP range)
- **Port 3001** (TCP) - Backend API (from 0.0.0.0/0 or your IP range)

**Example (Alibaba Cloud ECS):**
1. Go to ECS Console → Security Groups
2. Select your security group
3. Add Inbound Rules:
   - Port 3000, Protocol: TCP, Source: 0.0.0.0/0
   - Port 3001, Protocol: TCP, Source: 0.0.0.0/0

### 6. Verify Deployment

Check that services are running:

```bash
# Check backend
curl http://localhost:3001/api/docs | head -20

# Check frontend
curl http://localhost:3000 | head -20

# View logs
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

### 7. Access the Application

Open your browser and navigate to:

```
http://<YOUR_PUBLIC_IP>:3000
```

**Default Admin Credentials:**
- Email: `admin@hris.com`
- Password: `admin123`

**IMPORTANT**: Change the admin password immediately after first login!

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. **Verify frontend/.env.local exists:**
   ```bash
   cat frontend/.env.local
   # Should show: NEXT_PUBLIC_API_URL=http://<YOUR_IP>:3001
   ```

2. **Verify backend/.env has FRONTEND_URL:**
   ```bash
   grep FRONTEND_URL backend/.env
   # Should show: FRONTEND_URL=http://<YOUR_IP>:3000
   ```

3. **Clear browser cache or use incognito mode**

4. **Restart both services** (see Step 4 above)

### "Cannot connect to API"

1. **Check if backend is running:**
   ```bash
   curl http://localhost:3001/api/docs
   ```

2. **Check if port 3001 is open:**
   ```bash
   sudo netstat -tulpn | grep 3001
   ```

3. **Check backend logs:**
   ```bash
   tail -f /tmp/backend.log
   ```

4. **Verify firewall/security group allows port 3001**

### "Page not loading"

1. **Check if frontend is running:**
   ```bash
   curl http://localhost:3000
   ```

2. **Check if port 3000 is open:**
   ```bash
   sudo netstat -tulpn | grep 3000
   ```

3. **Check frontend logs:**
   ```bash
   tail -f /tmp/frontend.log
   ```

4. **Verify firewall/security group allows port 3000**

### Port Already in Use

If you get "EADDRINUSE" errors:

```bash
# Find and kill processes on port 3001 (backend)
sudo lsof -ti:3001 | xargs sudo kill -9

# Find and kill processes on port 3000 (frontend)
sudo lsof -ti:3000 | xargs sudo kill -9

# Or kill all Node.js processes (use with caution)
sudo pkill -9 node
```

### Database Connection Issues

1. **Check PostgreSQL container:**
   ```bash
   docker ps | grep postgres
   ```

2. **Check DATABASE_URL port (should be 5433):**
   ```bash
   grep DATABASE_URL backend/.env
   ```

3. **Test database connection:**
   ```bash
   cd backend
   npx prisma migrate status
   ```

### Run Status Check

For comprehensive diagnostics:

```bash
./check-status.sh
```

This will check all components and provide actionable fix suggestions.

## Production Considerations

### Security

1. **Change default admin password immediately**

2. **Use strong JWT secret:**
   ```bash
   # Generate a strong JWT secret
   openssl rand -base64 32
   # Update JWT_SECRET in backend/.env
   ```

3. **Use environment-specific secrets:**
   - Never commit `.env` files to Git
   - Use different credentials for production

4. **Enable HTTPS** (recommended for production):
   - Use a reverse proxy (Nginx, Caddy)
   - Obtain SSL certificate (Let's Encrypt)
   - Update CORS and API URLs to use `https://`

### Process Management

For production, use a process manager instead of running in background:

**Option 1: PM2**

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start npm --name "kpi-backend" -- run start:prod

# Start frontend
cd ../frontend
pm2 start npm --name "kpi-frontend" -- run start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Option 2: systemd**

Create systemd service files for backend and frontend.

### Database Backups

Set up automated PostgreSQL backups:

```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec hris-postgres pg_dump -U hris_user hris_db > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh") | crontab -
```

### Monitoring

Monitor application health:

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check Docker container status
docker ps

# View backend logs
tail -f /tmp/backend.log

# View frontend logs
tail -f /tmp/frontend.log
```

### Updates and Maintenance

When updating the application:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd backend && npm install
cd ../frontend && npm install

# Run new migrations
cd backend
npx prisma migrate deploy
npx prisma generate

# Restart services
pm2 restart kpi-backend
pm2 restart kpi-frontend
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Internet                           │
└──────────────────┬──────────────────────────────────┘
                   │
           ┌───────┴────────┐
           │   Firewall/    │
           │ Security Group │
           │ (3000, 3001)   │
           └───────┬────────┘
                   │
      ┌────────────┴──────────────┐
      │                           │
┌─────▼─────┐              ┌─────▼─────┐
│ Frontend  │              │  Backend  │
│ Next.js   │─────────────▶│  NestJS   │
│ Port 3000 │   API Calls  │ Port 3001 │
└───────────┘              └─────┬─────┘
                                 │
                      ┌──────────┴──────────┐
                      │                     │
                ┌─────▼─────┐        ┌─────▼─────┐
                │PostgreSQL │        │   Redis   │
                │ Port 5433 │        │ Port 6379 │
                │  (Docker) │        │  (Docker) │
                └───────────┘        └───────────┘
```

## Support

For issues or questions:
- Check `TROUBLESHOOTING.md`
- Run `./check-status.sh` for diagnostics
- Review logs in `/tmp/backend.log` and `/tmp/frontend.log`
- Check GitHub issues: https://github.com/itBiensi/kpi-engine/issues
