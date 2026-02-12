# KPI Management System

## Overview

A comprehensive HRIS Performance Management application for tracking Key Performance Indicators with role-based access control, workflow management, bulk import/export, and automated scoring.

**Tech Stack:** NestJS + Prisma + PostgreSQL + Redis + BullMQ | Next.js 16 + React 19 + Zustand

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Installation Guide](INSTALLATION.md)** | Complete step-by-step installation instructions |
| **[Quick Start](QUICK-START.md)** | Fast deployment guide (10 minutes) |
| **[Deployment Checklist](DEPLOYMENT-CHECKLIST.md)** | Deployment verification checklist |
| **[CLAUDE.md](CLAUDE.md)** | Development guide and architecture |

---

## ✨ Key Features

### Performance Management
- ✅ **KPI Planning** - Create and manage performance targets with measurement units
- ✅ **Achievement Tracking** - Real-time score calculations with evidence uploads
- ✅ **Workflow Management** - Submit → Approve/Reject workflow with comments
- ✅ **Period Management** - Assessment cycles (Monthly/Quarterly/Semester/Annual)
- ✅ **Grading System** - Automated letter grades (A-E) based on total scores

### Role-Based Access Control
- ✅ **Admin** - Full system access, user management, bulk operations, exports
- ✅ **Manager** - Approve/reject subordinate KPIs, add comments
- ✅ **Employee** - Create and track own KPIs

### Advanced Features
- ✅ **Bulk User Import** - Excel-based user upload with async processing
- ✅ **Bulk KPI Export** - Export all KPI data to Excel (chunked, background processing)
- ✅ **Manager Comments** - Comment on individual KPI items
- ✅ **Password Management** - Self-service password update + admin reset
- ✅ **Measurement Units** - Flexible unit support (%, hours, units, etc.)

---

## 🚀 Quick Deployment

### Express Setup (10 minutes)

```bash
# 1. Install dependencies
sudo apt install -y nodejs postgresql redis-server nginx
sudo npm install -g pm2

# 2. Setup database
sudo -u postgres psql -c "CREATE USER kpi_user WITH PASSWORD 'password';"
sudo -u postgres psql -c "CREATE DATABASE kpi_db OWNER kpi_user;"

# 3. Clone and configure
git clone <repo-url> /opt/kpi-management-system
cd /opt/kpi-management-system/backend
npm install
# Configure .env (see INSTALLATION.md)
npx prisma migrate deploy
npm run build

# 4. Start services
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

**Default Login:**
- Email: `admin@hris.com`
- Password: `admin123`

**⚠️ Change password immediately after first login!**

For detailed instructions, see **[INSTALLATION.md](INSTALLATION.md)** or **[QUICK-START.md](QUICK-START.md)**

---

## 📦 Feature Highlights

### Measurement Units

This KPI Management System supports measurement units for KPI items, allowing users to specify units (e.g., %, hours, units, count, days) to provide better context for target and actual values.

## Feature Highlights

### Measurement Units

Users can now specify measurement units for each KPI item:
- **Flexible Input**: Support any unit text up to 20 characters
- **Optional Field**: KPIs work with or without units
- **Consistent Display**: Units shown throughout the system
- **Better Context**: Clear understanding of measurements

### How to Use

1. Go to **KPI Planning** page
2. Click **"New KPI Plan"**
3. For each KPI item, specify:
   - Title
   - Definition (optional)
   - Polarity (MAX, MIN, or BINARY)
   - Weight
   - Target value
   - **Unit** (e.g., %, hours, units)
4. Save plan

### Display Examples

**With Units:**
- System Uptime: 99.9%
- Response Time: 2 hours
- Sales Target: 1000 units

**Achievements Page:**
- Target: 100 units
- Actual: [85] units ← Unit appears next to input field

## Common Unit Examples

| Unit | Use Case |
|------|----------|
| `%` | Percentage targets (uptime, accuracy, completion rate) |
| `hours` | Time-based goals (response time, processing time) |
| `units` | Production or sales targets |
| `count` | Number of items (tickets, customers, transactions) |
| `days` | Duration targets (cycle time, resolution time) |
| `₱` / `USD` | Financial targets |
| `calls` | Call center metrics |
| `km` | Distance metrics |

## Implementation Details

### Database
- Added `unit` field to `KpiDetail` table (VARCHAR(20), nullable)
- Migration: `20260211041529_add_unit_to_kpi_details`

### Backend
- Updated `KpiDetailInput` interface to include optional `unit` field
- Unit field saved when creating KPI plans
- Unit returned in all API responses

### Frontend
- **KPI Planning Page**: Unit input field in creation form
- **Achievements Page**: Unit displayed with target and actual values

## API Example

**Request:**
```json
{
  "userId": 1,
  "periodId": 202602,
  "details": [
    {
      "title": "System Uptime",
      "polarity": "MAX",
      "weight": 30,
      "targetValue": 99.9,
      "unit": "%"
    }
  ]
}
```

**Response:**
```json
{
  "id": 15,
  "title": "System Uptime",
  "targetValue": 99.9,
  "actualValue": 98.5,
  "unit": "%"
}
```

## Security Features

### Role-Based Access Control (RBAC)

The system implements strict role-based authorization:

**ADMIN-Only Operations:**
- ✅ Create users
- ✅ Edit users
- ✅ Delete all KPI data

**All Users:**
- ✅ View user list (read-only)
- ✅ Create and manage their own KPIs
- ✅ Update achievements

### Implementation
- `RolesGuard` checks user permissions
- `@Roles('ADMIN')` decorator restricts endpoints
- Frontend hides admin-only buttons for non-admin users
- API returns 403 Forbidden for unauthorized access

## Summary

✅ **Measurement units** for better KPI context  
✅ **Role-based access control** for secure operations  
✅ **Flexible and optional** unit field  
✅ **Consistent display** across all pages  
✅ **User-friendly interface** with clear visual indicators
