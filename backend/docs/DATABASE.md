# Database Schema Documentation

## Overview

This document describes the database schema for the KPI Management System. The system uses **PostgreSQL** as the database engine and **Prisma ORM** for database access and migrations.

**Database Connection:** Port 5433 (configured to avoid conflicts with default PostgreSQL port)

---

## Entity Relationship Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ 1:N (manager-subordinates)
       │ 1:N (user-kpiHeaders)
       │ 1:N (user-bulkJobs)
       │ 1:N (user-auditLogs)
       │ 1:N (user-scoringConfigs)
       │
       ├─────────────┐
       │             │
┌──────▼───────┐ ┌──▼─────────────┐
│  KpiHeader   │ │     Period     │
└──────┬───────┘ └────────────────┘
       │ 1:N (header-details)
       │
┌──────▼───────┐
│  KpiDetail   │
└──────────────┘

┌──────────────────┐
│ BulkImportJob    │ ──► User (admin)
└──────────────────┘

┌──────────────────┐
│   AuditLog       │ ──► User
└──────────────────┘

┌──────────────────┐
│ ScoringConfig    │ ──► User (updater)
└──────────────────┘
```

---

## Tables

### 1. users

**Purpose:** Stores employee information, authentication, and organizational hierarchy.

| Column       | Type        | Constraints              | Description                                    |
|--------------|-------------|--------------------------|------------------------------------------------|
| id           | INTEGER     | PRIMARY KEY, AUTO_INC    | Unique user identifier                         |
| employee_id  | VARCHAR     | UNIQUE, NOT NULL         | Company employee ID (e.g., "EMP001")           |
| full_name    | VARCHAR     | NOT NULL                 | Employee full name                             |
| email        | VARCHAR     | UNIQUE, NOT NULL         | Email address (login credential)               |
| password     | VARCHAR     | NOT NULL, DEFAULT ""     | Hashed password                                |
| dept_code    | VARCHAR     | NULLABLE                 | Department code                                |
| role         | UserRole    | NOT NULL, DEFAULT EMPLOYEE | User role (ADMIN/MANAGER/EMPLOYEE)           |
| manager_id   | INTEGER     | NULLABLE, FK → users(id) | Manager's user ID (self-referencing FK)        |
| is_active    | BOOLEAN     | NOT NULL, DEFAULT true   | Account status                                 |
| created_at   | TIMESTAMP   | NOT NULL, DEFAULT now()  | Account creation timestamp                     |

**Relationships:**
- **Self-referencing:** `manager_id` → `users.id` (Manager-Subordinate hierarchy)
- **One-to-Many:** User → KpiHeader (user's KPI plans)
- **One-to-Many:** User → KpiHeader (as approver)
- **One-to-Many:** User → BulkImportJob (admin's bulk imports)
- **One-to-Many:** User → AuditLog (user's actions)
- **One-to-Many:** User → ScoringConfig (config updates)

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `employee_id`
- UNIQUE on `email`
- IMPLICIT INDEX on `manager_id` (foreign key)

**Business Rules:**
- Managers can approve KPIs for their direct subordinates only
- Admins have full system access
- Employees can only manage their own KPIs

---

### 2. periods

**Purpose:** Defines evaluation periods (monthly, quarterly, etc.) for KPI tracking.

| Column      | Type         | Constraints              | Description                                    |
|-------------|--------------|--------------------------|------------------------------------------------|
| id          | INTEGER      | PRIMARY KEY, AUTO_INC    | Unique period identifier                       |
| name        | VARCHAR(100) | NOT NULL                 | Period name (e.g., "Q1 2026")                  |
| start_date  | DATE         | NOT NULL                 | Period start date                              |
| end_date    | DATE         | NOT NULL                 | Period end date                                |
| cycle_type  | CycleType    | NOT NULL                 | MONTHLY, QUARTERLY, SEMESTER, ANNUAL           |
| status      | PeriodStatus | NOT NULL, DEFAULT SETUP  | SETUP, ACTIVE, LOCKED, CLOSED                  |
| is_active   | BOOLEAN      | NOT NULL, DEFAULT false  | Only one period can be active at a time        |
| created_at  | TIMESTAMP    | NOT NULL, DEFAULT now()  | Creation timestamp                             |
| updated_at  | TIMESTAMP    | NOT NULL, AUTO_UPDATE    | Last update timestamp                          |

**Relationships:**
- **One-to-Many:** Period → KpiHeader (KPI plans in this period)

**Indexes:**
- PRIMARY KEY on `id`

**Business Rules:**
- Only one period can have `is_active = true` at a time
- Period status workflow: SETUP → ACTIVE → LOCKED → CLOSED
- Cannot submit KPIs during SETUP, LOCKED, or CLOSED periods
- Achievement updates disabled when period is LOCKED

---

### 3. kpi_headers

**Purpose:** Represents a single KPI plan for one employee in one period.

| Column          | Type       | Constraints                  | Description                                    |
|-----------------|------------|------------------------------|------------------------------------------------|
| id              | INTEGER    | PRIMARY KEY, AUTO_INC        | Unique KPI plan identifier                     |
| user_id         | INTEGER    | NOT NULL, FK → users(id)     | Employee who owns this KPI plan                |
| period_id       | INTEGER    | NOT NULL, FK → periods(id)   | Period this KPI plan belongs to                |
| status          | KpiStatus  | NOT NULL, DEFAULT DRAFT      | DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED   |
| total_score     | DECIMAL(5,2) | NOT NULL, DEFAULT 0        | Calculated total score (0-120)                 |
| final_grade     | VARCHAR(2) | NULLABLE                     | Letter grade (A, B, C, D, E)                   |
| created_at      | TIMESTAMP  | NOT NULL, DEFAULT now()      | Creation timestamp                             |
| manager_comment | TEXT       | NULLABLE                     | Manager's comment (used in rejection)          |
| submitted_at    | TIMESTAMP  | NULLABLE                     | When employee submitted the plan               |
| approved_at     | TIMESTAMP  | NULLABLE                     | When manager approved the plan                 |
| approver_id     | INTEGER    | NULLABLE, FK → users(id)     | Manager who approved/rejected                  |

**Relationships:**
- **Many-to-One:** KpiHeader → User (plan owner)
- **Many-to-One:** KpiHeader → Period
- **Many-to-One:** KpiHeader → User (approver)
- **One-to-Many:** KpiHeader → KpiDetail (individual KPI items)

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `(user_id, period_id)` - One plan per user per period
- IMPLICIT INDEX on `user_id` (foreign key)
- IMPLICIT INDEX on `period_id` (foreign key)
- IMPLICIT INDEX on `approver_id` (foreign key)

**Business Rules:**
- Each user can have only ONE KPI plan per period (enforced by unique constraint)
- Status workflow: DRAFT → SUBMITTED → APPROVED/REJECTED → DRAFT (if rejected)
- Total weight of all KpiDetail items must equal 100%
- Total score is sum of all KpiDetail.final_score values
- Final grade determined by total_score and ScoringConfig thresholds

---

### 4. kpi_details

**Purpose:** Individual KPI items within a KPI plan.

| Column          | Type          | Constraints                  | Description                                    |
|-----------------|---------------|------------------------------|------------------------------------------------|
| id              | INTEGER       | PRIMARY KEY, AUTO_INC        | Unique KPI item identifier                     |
| header_id       | INTEGER       | NOT NULL, FK → kpi_headers(id) | Parent KPI plan                              |
| title           | VARCHAR(200)  | NOT NULL                     | KPI name (e.g., "Sales Revenue")               |
| definition      | TEXT          | NULLABLE                     | Detailed definition and calculation method     |
| polarity        | Polarity      | NOT NULL                     | MAX, MIN, or BINARY                            |
| weight          | DECIMAL(5,2)  | NOT NULL                     | Weight percentage (e.g., 20.00 = 20%)          |
| target_value    | DECIMAL(15,2) | NOT NULL                     | Target value to achieve                        |
| actual_value    | DECIMAL(15,2) | NOT NULL, DEFAULT 0          | Actual achievement value                       |
| achievement_pct | DECIMAL(5,2)  | NULLABLE                     | Achievement percentage                         |
| final_score     | DECIMAL(5,2)  | NULLABLE                     | Calculated score (0 to weight * capMultiplier) |
| evidence_url    | VARCHAR(255)  | NULLABLE                     | Link to evidence/documentation                 |
| unit            | VARCHAR(20)   | NULLABLE                     | Unit of measurement (e.g., "USD", "hours")     |
| manager_comment | TEXT          | NULLABLE                     | Manager's feedback on this specific KPI        |

**Relationships:**
- **Many-to-One:** KpiDetail → KpiHeader (CASCADE DELETE)

**Indexes:**
- PRIMARY KEY on `id`
- IMPLICIT INDEX on `header_id` (foreign key)

**Business Rules:**
- **Polarity Types:**
  - **MAX:** Higher is better → Score = (Actual / Target) × Weight
  - **MIN:** Lower is better → Score = ((2 × Target - Actual) / Target) × Weight
  - **BINARY:** All-or-nothing → Score = (Actual === Target) ? Weight : 0
- **Scoring Rules:**
  - Floor: Score cannot go below 0
  - Cap: Score capped at Weight × capMultiplier (default 120% of weight)
  - Zero Target: MAX polarity with target=0 is rejected (use BINARY instead)
- Sum of all weights in a header must equal 100%

---

### 5. bulk_import_jobs

**Purpose:** Tracks async bulk user import operations.

| Column        | Type        | Constraints                  | Description                                    |
|---------------|-------------|------------------------------|------------------------------------------------|
| job_id        | UUID        | PRIMARY KEY, DEFAULT uuid()  | Unique job identifier                          |
| admin_id      | INTEGER     | NULLABLE, FK → users(id)     | Admin who triggered the import                 |
| filename      | VARCHAR(255)| NULLABLE                     | Original uploaded filename                     |
| total_rows    | INTEGER     | NOT NULL, DEFAULT 0          | Total rows in Excel file                       |
| success_rows  | INTEGER     | NOT NULL, DEFAULT 0          | Successfully imported rows                     |
| failed_rows   | INTEGER     | NOT NULL, DEFAULT 0          | Failed rows                                    |
| status        | JobStatus   | NOT NULL, DEFAULT QUEUED     | QUEUED, PROCESSING, COMPLETED, FAILED          |
| error_log_url | VARCHAR(255)| NULLABLE                     | Path to error log CSV file                     |
| created_at    | TIMESTAMP   | NOT NULL, DEFAULT now()      | Job creation timestamp                         |

**Relationships:**
- **Many-to-One:** BulkImportJob → User (admin)

**Indexes:**
- PRIMARY KEY on `job_id`
- IMPLICIT INDEX on `admin_id` (foreign key)

**Business Rules:**
- Processed asynchronously using BullMQ queue
- Error log CSV generated for failed rows with reasons
- Status transitions: QUEUED → PROCESSING → COMPLETED/FAILED

---

### 6. audit_logs

**Purpose:** Comprehensive audit trail for all system activities.

| Column        | Type         | Constraints              | Description                                    |
|---------------|--------------|--------------------------|------------------------------------------------|
| id            | INTEGER      | PRIMARY KEY, AUTO_INC    | Unique log entry identifier                    |
| action        | AuditAction  | NOT NULL                 | Type of action performed (31 types)            |
| user_id       | INTEGER      | NULLABLE, FK → users(id) | User who performed the action                  |
| resource_type | VARCHAR(50)  | NULLABLE                 | Type of resource (User, KpiHeader, Period)     |
| resource_id   | INTEGER      | NULLABLE                 | ID of affected resource                        |
| details       | JSON         | NULLABLE                 | Additional context and metadata                |
| ip_address    | VARCHAR(45)  | NULLABLE                 | IPv4 or IPv6 address                           |
| user_agent    | TEXT         | NULLABLE                 | Browser/client user agent string               |
| timestamp     | TIMESTAMP    | NOT NULL, DEFAULT now()  | When the action occurred                       |

**Relationships:**
- **Many-to-One:** AuditLog → User

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `user_id` (for user activity queries)
- INDEX on `action` (for action-based filtering)
- INDEX on `timestamp` (for time-range queries)
- COMPOSITE INDEX on `(resource_type, resource_id)` (for resource history)

**Business Rules:**
- Immutable logs (no update/delete operations)
- Admin-only read access
- Logs 31 different action types across 6 categories:
  1. Authentication (5 types)
  2. User Management (5 types)
  3. KPI Operations (7 types)
  4. Period Management (4 types)
  5. Reports (2 types)
  6. System (1 type)

---

### 7. scoring_config

**Purpose:** Dynamic configuration for KPI scoring calculations and grading.

| Column             | Type         | Constraints              | Description                                    |
|--------------------|--------------|--------------------------|------------------------------------------------|
| id                 | INTEGER      | PRIMARY KEY, AUTO_INC    | Unique config identifier                       |
| cap_multiplier     | DECIMAL(3,2) | NOT NULL, DEFAULT 1.2    | Score cap as multiplier (1.0 - 2.0)            |
| grade_a_threshold  | DECIMAL(5,2) | NOT NULL, DEFAULT 90     | Minimum score for Grade A                      |
| grade_b_threshold  | DECIMAL(5,2) | NOT NULL, DEFAULT 75     | Minimum score for Grade B                      |
| grade_c_threshold  | DECIMAL(5,2) | NOT NULL, DEFAULT 60     | Minimum score for Grade C                      |
| grade_d_threshold  | DECIMAL(5,2) | NOT NULL, DEFAULT 50     | Minimum score for Grade D                      |
| updated_at         | TIMESTAMP    | NOT NULL, AUTO_UPDATE    | Last configuration update                      |
| updated_by         | INTEGER      | NULLABLE, FK → users(id) | Admin who last updated config                  |

**Relationships:**
- **Many-to-One:** ScoringConfig → User (updater)

**Indexes:**
- PRIMARY KEY on `id`
- IMPLICIT INDEX on `updated_by` (foreign key)

**Business Rules:**
- Only one active configuration (system uses latest by ID)
- Admin-only updates
- Validation: A > B > C > D thresholds (strictly descending)
- Cap multiplier must be between 1.0 and 2.0
- All configuration changes logged to audit_logs
- Grade E assigned to scores ≤ grade_d_threshold

**Grading Formula:**
```
if (score > grade_a_threshold) → Grade A
if (score > grade_b_threshold) → Grade B
if (score > grade_c_threshold) → Grade C
if (score > grade_d_threshold) → Grade D
else → Grade E
```

---

## Enums

### UserRole
```
ADMIN     - Full system access, can manage all users and periods
MANAGER   - Can approve subordinates' KPIs
EMPLOYEE  - Can manage own KPIs only
```

### KpiStatus
```
DRAFT     - Initial state, editable by employee
SUBMITTED - Awaiting manager approval
APPROVED  - Approved by manager, achievements can be tracked
REJECTED  - Rejected by manager, returns to DRAFT with comment
LOCKED    - Period closed, no further changes allowed
```

### Polarity
```
MAX    - Higher is better (e.g., Sales Revenue)
MIN    - Lower is better (e.g., Bug Count)
BINARY - All-or-nothing (e.g., Certificate Obtained: Yes/No)
```

### JobStatus
```
QUEUED     - Job created, waiting in queue
PROCESSING - Job is being processed
COMPLETED  - Job finished successfully
FAILED     - Job failed with errors
```

### CycleType
```
MONTHLY    - Monthly evaluation cycle
QUARTERLY  - Quarterly evaluation cycle (3 months)
SEMESTER   - Semester evaluation cycle (6 months)
ANNUAL     - Annual evaluation cycle (12 months)
```

### PeriodStatus
```
SETUP  - Period configuration in progress
ACTIVE - Period is active, KPIs can be submitted
LOCKED - Period locked, achievements frozen
CLOSED - Period archived, read-only
```

### AuditAction
31 action types across 6 categories:
- **Authentication:** LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, PASSWORD_UPDATED, PASSWORD_RESET
- **User Management:** USER_CREATED, USER_UPDATED, USER_DELETED, BULK_IMPORT_STARTED, BULK_IMPORT_COMPLETED
- **KPI Operations:** KPI_CREATED, KPI_SUBMITTED, KPI_APPROVED, KPI_REJECTED, KPI_ACHIEVEMENT_UPDATED, KPI_COMMENT_ADDED, KPI_ALL_DELETED
- **Period Management:** PERIOD_CREATED, PERIOD_UPDATED, PERIOD_DELETED, PERIOD_STATUS_CHANGED
- **Reports:** EXPORT_TRIGGERED, EXPORT_COMPLETED
- **System:** SYSTEM_SEEDED

---

## Key Relationships

### 1. Manager-Subordinate Hierarchy
```
User.manager_id → User.id (self-referencing)
```
- Supports multi-level organizational hierarchy
- Manager can approve KPIs for direct subordinates only
- Cascading queries to get all subordinates under a manager

### 2. KPI Plan Structure
```
User (1) ─── (N) KpiHeader (1) ─── (N) KpiDetail
                  └─── (1) Period
```
- One user can have multiple KPI plans (one per period)
- Each KPI plan contains multiple KPI items
- Constraint: One plan per user per period

### 3. Approval Workflow
```
Employee (user_id) ─── Creates ───> KpiHeader
                                       │
                                       │ submits
                                       ▼
Manager (approver_id) ─── Approves ──> KpiHeader
```
- Employee creates and submits KPI plan
- Manager (direct supervisor) approves or rejects
- Approval requires manager_id = employee's managerId

### 4. Audit Trail
```
Any Action ─── Triggers ───> AuditLog
                                │
                                └─── Links to User, Resource
```
- All critical actions logged automatically
- Links to actor (user) and affected resource
- Immutable logs for compliance

---

## Database Migrations

**Migration Tool:** Prisma Migrate

**Migration Commands:**
```bash
# Create new migration
npx prisma migrate dev --name description_of_change

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

**Migration History:** All migrations stored in `backend/prisma/migrations/`

**Current Schema Version:** See latest migration folder for current version

---

## Performance Considerations

### Indexes
- All foreign keys automatically indexed by PostgreSQL
- Additional indexes on frequently queried columns:
  - `audit_logs.user_id`
  - `audit_logs.action`
  - `audit_logs.timestamp`
  - `audit_logs.(resource_type, resource_id)` - Composite index

### Query Optimization
- Use `include` for related data instead of separate queries
- Use `select` to fetch only needed fields
- Leverage unique constraints for fast lookups
- Pagination on large result sets (audit logs, user lists)

### Data Types
- DECIMAL used for precise monetary/scoring calculations (no floating-point errors)
- VARCHAR lengths optimized based on expected data
- JSON for flexible audit log details
- UUID for bulk import job IDs (collision-resistant)

---

## Backup and Maintenance

**Recommended Backup Strategy:**
1. Daily automated backups using `pg_dump`
2. Transaction log archiving for point-in-time recovery
3. Test restore procedures monthly
4. Retain backups for 30 days minimum

**Maintenance Tasks:**
1. Monitor audit_logs table growth
2. Archive old audit logs (e.g., > 1 year) to separate table
3. Vacuum and analyze tables periodically
4. Monitor index usage and add/remove as needed

---

## Security Considerations

1. **Password Storage:** Bcrypt hashing with salt (handled by NestJS)
2. **SQL Injection:** Protected by Prisma parameterized queries
3. **Access Control:** Role-based (ADMIN/MANAGER/EMPLOYEE)
4. **Audit Trail:** All sensitive actions logged with IP and user agent
5. **Soft Deletes:** Users have `is_active` flag instead of hard deletes
6. **Foreign Key Constraints:** Maintain referential integrity

---

## Schema Maintenance

**Schema File Location:** `backend/prisma/schema.prisma`

**When to Update:**
1. Adding new features requiring data persistence
2. Modifying existing data structures
3. Adding indexes for performance
4. Changing validation rules (enums, constraints)

**Update Process:**
1. Modify `schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Test migration on local database
4. Commit both schema and migration files
5. Deploy to production using `npx prisma migrate deploy`

---

## Technical Stack

- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5.x
- **Backend Framework:** NestJS 11
- **Connection Port:** 5433 (non-standard to avoid conflicts)
- **Connection Pooling:** Default Prisma connection pool
- **Character Encoding:** UTF-8

---

## Additional Resources

- **Prisma Documentation:** https://www.prisma.io/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs
- **ER Diagram Tool:** dbdiagram.io or https://prisma.io/docs/concepts/components/prisma-studio
- **Schema Visualization:** `npx prisma studio` - Opens GUI at http://localhost:5555

---

*Last Updated: February 12, 2026*
*Schema Version: See latest migration folder*
