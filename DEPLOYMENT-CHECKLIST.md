# KPI Management System - Deployment Checklist

Quick reference checklist for deploying to a new server.

---

## Pre-Deployment

### Server Setup
- [ ] Server provisioned (Ubuntu 22.04 LTS recommended)
- [ ] SSH access configured
- [ ] Domain name configured and pointing to server IP
- [ ] Firewall rules reviewed

### Software Installation
- [ ] Node.js 20.x installed
- [ ] PostgreSQL 15.x installed and running
- [ ] Redis 7.x installed and running
- [ ] Git installed
- [ ] Nginx installed
- [ ] PM2 installed globally (`npm install -g pm2`)

---

## Database Setup

- [ ] PostgreSQL user created (`kpi_user`)
- [ ] Database created (`kpi_db`)
- [ ] Database permissions granted
- [ ] Database accessible from backend

---

## Backend Deployment

### Files & Configuration
- [ ] Code cloned/uploaded to `/opt/kpi-management-system/backend`
- [ ] `.env` file created and configured
- [ ] `JWT_SECRET` generated (64+ characters)
- [ ] `DATABASE_URL` configured correctly
- [ ] Redis connection settings configured
- [ ] File upload directories created (`uploads/`, `exports/`)

### Installation
- [ ] `npm install` completed successfully
- [ ] Prisma Client generated (`npx prisma generate`)
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Backend builds successfully (`npm run build`)

### Testing
- [ ] Backend starts without errors
- [ ] Seed endpoint accessible (`/api/v1/auth/seed`)
- [ ] Swagger documentation accessible (`/api/docs`)
- [ ] Admin login works

---

## Frontend Deployment

### Files & Configuration
- [ ] Code cloned/uploaded to `/opt/kpi-management-system/frontend`
- [ ] `.env.local` file created
- [ ] `NEXT_PUBLIC_API_URL` configured correctly

### Installation
- [ ] `npm install` completed successfully
- [ ] Frontend builds successfully (`npm run build`)
- [ ] `.next` directory generated

### Testing
- [ ] Frontend starts without errors
- [ ] Homepage loads correctly
- [ ] API connection works
- [ ] Login page accessible

---

## Process Management

### PM2 Setup
- [ ] Backend PM2 process configured
- [ ] Frontend PM2 process configured
- [ ] PM2 startup script configured (`pm2 startup`)
- [ ] PM2 processes saved (`pm2 save`)
- [ ] All processes running (`pm2 status`)

### Alternative: Systemd
- [ ] Backend systemd service created
- [ ] Frontend systemd service created
- [ ] Services enabled
- [ ] Services running

---

## Reverse Proxy (Nginx)

- [ ] Nginx configuration file created
- [ ] Backend proxy configured (api.domain.com)
- [ ] Frontend proxy configured (domain.com)
- [ ] Configuration syntax validated (`nginx -t`)
- [ ] Nginx reloaded/restarted
- [ ] Site accessible via domain name

---

## SSL/TLS Certificate

- [ ] Certbot installed
- [ ] SSL certificate obtained for main domain
- [ ] SSL certificate obtained for API subdomain
- [ ] HTTPS working correctly
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal configured

---

## Security

### Firewall
- [ ] UFW enabled
- [ ] SSH port allowed (22)
- [ ] HTTP port allowed (80)
- [ ] HTTPS port allowed (443)
- [ ] Unnecessary ports blocked

### Application Security
- [ ] Admin password changed from default
- [ ] Strong JWT_SECRET configured
- [ ] Database password is strong
- [ ] `.env` files have restricted permissions (600)
- [ ] CORS configured properly
- [ ] File upload size limits configured

---

## Backup & Monitoring

### Backups
- [ ] Database backup script created
- [ ] Backup cron job configured
- [ ] Backup directory exists and writable
- [ ] Backup restoration tested

### Monitoring
- [ ] Application logs configured
- [ ] Log rotation configured (`logrotate`)
- [ ] PM2 monitoring enabled
- [ ] Error alerting configured (optional)
- [ ] Uptime monitoring configured (optional)

---

## Performance

- [ ] PostgreSQL performance tuning applied
- [ ] Redis performance tuning applied
- [ ] Nginx gzip compression enabled
- [ ] Static asset caching configured
- [ ] PM2 cluster mode enabled (if applicable)

---

## Testing & Validation

### Functional Testing
- [ ] Admin can login
- [ ] Users can be created
- [ ] KPI plans can be created
- [ ] Achievements can be updated
- [ ] Workflow (Submit/Approve/Reject) works
- [ ] Period management works
- [ ] Bulk upload works
- [ ] KPI export works
- [ ] Comments feature works

### Performance Testing
- [ ] Page load times acceptable (< 2 seconds)
- [ ] API response times acceptable (< 500ms)
- [ ] Large exports complete successfully
- [ ] Concurrent users supported

### Security Testing
- [ ] Unauthorized access blocked
- [ ] Role-based access control works
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection enabled

---

## Documentation

- [ ] `.env.example` file updated
- [ ] README.md updated with deployment info
- [ ] API documentation reviewed
- [ ] User guide created/updated
- [ ] Admin credentials documented (securely)

---

## Post-Deployment

### Handover
- [ ] Server credentials shared (securely)
- [ ] Admin credentials shared (securely)
- [ ] Database credentials documented
- [ ] Domain/DNS information documented
- [ ] Monitoring access configured

### Training
- [ ] Admin user trained
- [ ] User documentation provided
- [ ] Support contact established

---

## Rollback Plan

- [ ] Backup of previous version exists
- [ ] Database rollback script prepared
- [ ] Rollback steps documented
- [ ] Emergency contacts listed

---

## Sign-Off

| Checkpoint | Date | Verified By | Notes |
|------------|------|-------------|-------|
| Pre-Deployment | | | |
| Database Setup | | | |
| Backend Deployment | | | |
| Frontend Deployment | | | |
| Security | | | |
| Testing | | | |
| Go-Live | | | |

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| System Admin | | |
| Database Admin | | |
| Developer | | |
| Business Owner | | |

---

## Important URLs

| Service | URL |
|---------|-----|
| Application | https://your-domain.com |
| API | https://api.your-domain.com |
| API Docs | https://api.your-domain.com/api/docs |
| Database | postgresql://server:5432 |

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Verified By:** _______________
