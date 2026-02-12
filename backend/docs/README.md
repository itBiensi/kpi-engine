# Backend Documentation

This folder contains comprehensive documentation for the KPI Management System backend.

## Available Documentation

### 📊 [DATABASE.md](./DATABASE.md)
Complete database schema documentation including:
- Entity Relationship Diagrams (ERD)
- Detailed table descriptions with all columns
- Relationships and foreign keys
- Indexes and performance considerations
- Enums and their values
- Business rules and constraints
- Migration guidelines
- Backup and maintenance procedures

**Key Topics:**
- 7 core tables (User, Period, KpiHeader, KpiDetail, BulkImportJob, AuditLog, ScoringConfig)
- 7 enums (UserRole, KpiStatus, Polarity, JobStatus, CycleType, PeriodStatus, AuditAction)
- Self-referencing manager-subordinate hierarchy
- Scoring engine configuration
- Comprehensive audit trail system

### 🌐 [API.md](./API.md)
Complete REST API reference documentation including:
- Authentication and authorization
- All API endpoints with request/response examples
- Query parameters and filters
- Error handling and response codes
- Role-based access control (RBAC)
- Pagination and filtering
- File upload specifications
- cURL examples for testing

**API Endpoints Covered:**
- Authentication (`/api/v1/auth`)
- User Management (`/api/v1/users`)
- KPI Management (`/api/v1/kpi`)
- Period Management (`/api/v1/periods`)
- Bulk Upload (`/api/v1/admin`)
- Reports (`/api/v1/admin/reports`)
- Audit Logs (`/api/v1/admin/audit-log`)
- **Scoring Configuration (`/api/v1/scoring-config`)** ✨ NEW

---

## Quick Reference

### Database Access
```bash
# Open Prisma Studio (GUI for database)
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### API Testing
```bash
# Interactive Swagger UI
http://localhost:3001/api/docs

# Command-line testing with cURL
# See API.md for examples
```

### Schema Migrations
```bash
# Create new migration
npx prisma migrate dev --name description_of_change

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

---

## Documentation Updates

When making changes to the system, update the relevant documentation:

| Change Type | Update Required |
|-------------|----------------|
| New database table/field | DATABASE.md - Add table/column documentation |
| New enum value | DATABASE.md - Update enum section |
| New API endpoint | API.md - Add endpoint documentation |
| Changed business rule | Both DATABASE.md and API.md |
| New relationship | DATABASE.md - Update ERD and relationships section |
| Modified scoring logic | DATABASE.md (ScoringConfig section) and API.md |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Frontend (Next.js 16)              │
│                   Port 3000                     │
└────────────────────┬────────────────────────────┘
                     │ HTTP REST API
                     │ JWT Bearer Token
                     ▼
┌─────────────────────────────────────────────────┐
│              Backend (NestJS 11)                │
│                   Port 3001                     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         Controllers (REST API)           │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐  │
│  │         Services (Business Logic)        │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐  │
│  │         Prisma ORM (Data Access)         │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           PostgreSQL Database                   │
│                Port 5433                        │
│                                                 │
│  • users                                        │
│  • periods                                      │
│  • kpi_headers                                  │
│  • kpi_details                                  │
│  • bulk_import_jobs                             │
│  • audit_logs                                   │
│  • scoring_config                               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               Redis (BullMQ)                    │
│                Port 6379                        │
│  • Async job queue for bulk imports             │
│  • Async job queue for report exports           │
└─────────────────────────────────────────────────┘
```

---

## Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, MANAGER, EMPLOYEE)
- Password hashing with bcrypt
- Session management

### 📊 KPI Management
- Three polarity types (MAX, MIN, BINARY)
- Dynamic scoring with configurable thresholds
- Grade calculation (A, B, C, D, E)
- Workflow: DRAFT → SUBMITTED → APPROVED/REJECTED
- Achievement tracking with evidence links

### 👥 User Management
- Manager-subordinate hierarchy
- Bulk user import via Excel
- Department-based organization
- Active/Inactive status

### 📅 Period Management
- Multiple cycle types (Monthly, Quarterly, Semester, Annual)
- Period status workflow (SETUP → ACTIVE → LOCKED → CLOSED)
- Only one active period at a time

### 🔍 Audit Trail
- 31 different action types tracked
- Comprehensive logging of all system activities
- IP address and user agent capture
- Admin-only access with filtering

### ⚙️ Dynamic Scoring Configuration ✨ NEW
- Configurable cap multiplier (1.0 - 2.0)
- Adjustable grade thresholds (A, B, C, D)
- Admin-only updates
- Real-time application to all score calculations
- Audit logging of all configuration changes

### 📈 Reporting
- Async Excel export of KPI data
- Job status tracking
- Error logging for failed operations

---

## Scoring Engine

The KPI scoring system uses three calculation methods based on polarity:

### MAX (Higher is Better)
```
Score = (Actual / Target) × Weight
Example: Sales Revenue - higher actual sales = better score
```

### MIN (Lower is Better)
```
Score = ((2 × Target - Actual) / Target) × Weight
Example: Bug Count - fewer bugs = better score
```

### BINARY (All-or-Nothing)
```
Score = (Actual === Target) ? Weight : 0
Example: Certification (1=yes, 0=no)
```

### Score Constraints
- **Floor:** Minimum score is 0 (cannot go negative)
- **Cap:** Maximum score is `Weight × capMultiplier`
  - Default: 1.2 (120% of weight)
  - Configurable via `/api/v1/scoring-config`

### Grading System
Grades are determined by total score (sum of all KPI item scores):

| Grade | Score Range | Configurable Threshold |
|-------|-------------|------------------------|
| A     | > 90        | gradeAThreshold        |
| B     | > 75        | gradeBThreshold        |
| C     | > 60        | gradeCThreshold        |
| D     | > 50        | gradeDThreshold        |
| E     | ≤ 50        | -                      |

**Note:** All thresholds are configurable by admins and changes apply immediately to all future calculations.

---

## Business Rules

### KPI Plans
1. **Weight Constraint:** Total weight of all KPI items must equal 100%
2. **Uniqueness:** One KPI plan per user per period
3. **Zero Target Rule:** MAX polarity cannot have target value of 0 (use BINARY instead)
4. **Workflow Enforcement:**
   - Can only submit during ACTIVE period
   - Manager must be direct supervisor to approve
   - Rejection requires comment

### Periods
1. **Single Active Period:** Only one period can be active at a time
2. **Status Workflow:** SETUP → ACTIVE → LOCKED → CLOSED
3. **Achievement Lock:** No updates allowed when period is LOCKED

### User Hierarchy
1. **Manager Approval:** Only direct manager can approve subordinate's KPI
2. **Access Control:**
   - Employees see own KPIs only
   - Managers see own + subordinates' KPIs
   - Admins see all KPIs

### Audit Logging
1. **Immutable:** Audit logs cannot be updated or deleted
2. **Admin Only:** Only admins can view audit logs
3. **Comprehensive:** All critical actions are logged automatically

---

## Development Workflow

### Making Database Changes
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update `DATABASE.md` with new schema details
4. Commit both schema and migration files

### Adding New API Endpoints
1. Create/update controller with endpoint
2. Add Swagger decorators (@ApiOperation, @ApiResponse)
3. Update `API.md` with endpoint documentation
4. Test endpoint via Swagger UI
5. Add cURL examples if complex

### Updating Business Rules
1. Implement rule in service layer
2. Update relevant validators/DTOs
3. Document in `DATABASE.md` (if affects data)
4. Document in `API.md` (if affects API)
5. Add tests

---

## Testing

### Manual Testing
1. **Swagger UI:** http://localhost:3001/api/docs
2. **Prisma Studio:** `npx prisma studio`
3. **cURL Commands:** See API.md for examples

### Automated Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## Troubleshooting

### Database Issues
```bash
# Reset database (dev only - deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# View database in GUI
npx prisma studio
```

### API Issues
```bash
# Check Swagger documentation
http://localhost:3001/api/docs

# View backend logs
npm run start:dev

# Test authentication
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}'
```

### Migration Issues
```bash
# Generate Prisma Client
npx prisma generate

# Deploy pending migrations
npx prisma migrate deploy

# Resolve migration conflicts (dev only)
npx prisma migrate resolve --applied "migration_name"
```

---

## Production Deployment

### Pre-Deployment Checklist
- [ ] All migrations tested in staging
- [ ] API documentation updated
- [ ] Database backup taken
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Monitoring set up

### Database Migration in Production
```bash
# Apply migrations (no data loss)
npx prisma migrate deploy

# Verify migration success
npx prisma migrate status
```

### Environment Variables
See `backend/.env.example` for required variables.

---

## Contributing

When contributing to the backend:
1. Read `DATABASE.md` to understand data model
2. Read `API.md` to understand existing endpoints
3. Follow existing patterns and conventions
4. Update documentation with your changes
5. Add Swagger decorators to new endpoints
6. Write tests for new features
7. Run `npm run lint` before committing

---

## Additional Resources

- **NestJS Documentation:** https://docs.nestjs.com
- **Prisma Documentation:** https://www.prisma.io/docs
- **Swagger/OpenAPI Spec:** https://swagger.io/specification
- **PostgreSQL Documentation:** https://www.postgresql.org/docs
- **BullMQ Documentation:** https://docs.bullmq.io

---

*Documentation maintained by development team*
*Last updated: February 12, 2026*
