# API Documentation

## Overview

This document provides comprehensive documentation for the KPI Management System REST API.

**Base URL:** `http://localhost:3001` (development)
**API Version:** v1
**Authentication:** JWT Bearer Token
**Swagger UI:** http://localhost:3001/api/docs

---

## Authentication

All endpoints except `/api/v1/auth/login` and `/api/v1/auth/seed` require authentication.

### Authorization Header
```
Authorization: Bearer <jwt_token>
```

### Obtaining a Token
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "employeeId": "EMP001",
    "fullName": "John Doe",
    "email": "user@example.com",
    "role": "EMPLOYEE"
  }
}
```

---

## API Endpoints

### Authentication (`/api/v1/auth`)

#### 1. Login
```http
POST /api/v1/auth/login
```
**Description:** Authenticate user and receive JWT token
**Access:** Public
**Body:**
```json
{
  "email": "admin@hris.com",
  "password": "admin123"
}
```

#### 2. Seed Database
```http
POST /api/v1/auth/seed
```
**Description:** Initialize database with sample data (dev only)
**Access:** Public

#### 3. Update Own Password
```http
PUT /api/v1/auth/password
```
**Description:** Change authenticated user's password
**Access:** Authenticated
**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

#### 4. Reset User Password (Admin)
```http
POST /api/v1/auth/password/reset
```
**Description:** Admin resets another user's password
**Access:** Admin only
**Body:**
```json
{
  "userId": 5,
  "newPassword": "new_password"
}
```

---

### Users (`/api/v1/users`)

#### 1. List Users
```http
GET /api/v1/users?page=1&limit=20&search=john&deptCode=IT
```
**Description:** Get paginated list of users with filtering
**Access:** Authenticated
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or employee ID
- `deptCode` (optional): Filter by department code

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "employeeId": "EMP001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "deptCode": "IT",
      "role": "EMPLOYEE",
      "isActive": true,
      "manager": {
        "id": 2,
        "fullName": "Manager Name"
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### 2. Create User
```http
POST /api/v1/users
```
**Description:** Create a new user
**Access:** Admin only
**Body:**
```json
{
  "employeeId": "EMP123",
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "deptCode": "HR",
  "role": "EMPLOYEE",
  "managerEmployeeId": "MGR001"
}
```

#### 3. Get User by ID
```http
GET /api/v1/users/:id
```
**Description:** Get single user details
**Access:** Authenticated

#### 4. Update User
```http
PUT /api/v1/users/:id
```
**Description:** Update user information
**Access:** Admin only
**Body:**
```json
{
  "fullName": "Jane Smith Updated",
  "deptCode": "IT",
  "role": "MANAGER",
  "isActive": true
}
```

#### 5. Get User's Subordinates
```http
GET /api/v1/users/:id/subordinates
```
**Description:** Get all direct subordinates of a user
**Access:** Authenticated

---

### KPI Management (`/api/v1/kpi`)

#### 1. Create KPI Plan
```http
POST /api/v1/kpi/plans
```
**Description:** Create new KPI plan for a user and period
**Access:** Admin/Manager
**Body:**
```json
{
  "userId": 5,
  "periodId": 1,
  "details": [
    {
      "title": "Sales Revenue",
      "definition": "Achieve monthly sales target",
      "polarity": "MAX",
      "weight": 40,
      "targetValue": 100000,
      "unit": "USD"
    },
    {
      "title": "Customer Satisfaction",
      "definition": "Maintain high customer satisfaction score",
      "polarity": "MAX",
      "weight": 30,
      "targetValue": 4.5,
      "unit": "stars"
    },
    {
      "title": "Bug Reports",
      "definition": "Minimize bug reports",
      "polarity": "MIN",
      "weight": 20,
      "targetValue": 5,
      "unit": "count"
    },
    {
      "title": "Certification",
      "definition": "Complete certification (1=completed, 0=not completed)",
      "polarity": "BINARY",
      "weight": 10,
      "targetValue": 1,
      "unit": "boolean"
    }
  ]
}
```

**Validation Rules:**
- Total weight must equal 100
- MAX polarity cannot have target value of 0 (use BINARY instead)
- One plan per user per period

#### 2. List KPI Plans
```http
GET /api/v1/kpi/plans?userId=5&periodId=1&status=APPROVED&page=1
```
**Description:** Get KPI plans with filtering
**Access:** Authenticated (filtered by role)
- **Employee:** Own plans only
- **Manager:** Own + subordinates' plans
- **Admin:** All plans

**Query Parameters:**
- `userId` (optional): Filter by user
- `periodId` (optional): Filter by period
- `status` (optional): DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED
- `page` (optional): Page number
- `take` (optional): Items per page

#### 3. Get KPI Plan by ID
```http
GET /api/v1/kpi/plans/:id
```
**Description:** Get single KPI plan with all details
**Access:** Owner, Manager, or Admin

#### 4. Submit KPI Plan
```http
POST /api/v1/kpi/plans/:id/submit
```
**Description:** Employee submits plan for manager approval
**Access:** Plan owner only
**Validations:**
- Plan status must be DRAFT or REJECTED
- Period must be ACTIVE
- Total weight must be 100%

#### 5. Approve KPI Plan
```http
POST /api/v1/kpi/plans/:id/approve
```
**Description:** Manager approves subordinate's KPI plan
**Access:** Direct manager only
**Validations:**
- Plan status must be SUBMITTED
- Current user must be plan owner's direct manager

#### 6. Reject KPI Plan
```http
POST /api/v1/kpi/plans/:id/reject
```
**Description:** Manager rejects plan with comment
**Access:** Direct manager only
**Body:**
```json
{
  "comment": "Please revise the sales target and add more specific metrics."
}
```

#### 7. Cancel Submission
```http
POST /api/v1/kpi/plans/:id/cancel
```
**Description:** Employee cancels submission (returns to DRAFT)
**Access:** Plan owner only

#### 8. Update Achievement
```http
PUT /api/v1/kpi/achievements/:detailId
```
**Description:** Update actual achievement value for a KPI item
**Access:** Owner, Manager, or Admin
**Body:**
```json
{
  "actual_value": 120000,
  "evidence_url": "https://evidence-link.com/report"
}
```

**Automatic Calculations:**
- `achievement_pct` calculated based on polarity
- `final_score` calculated with floor (0) and cap (120% of weight by default)
- Header `total_score` and `final_grade` recalculated

#### 9. Update KPI Comment
```http
PUT /api/v1/kpi/details/:detailId/comment
```
**Description:** Manager/Admin adds comment to specific KPI item
**Access:** Direct manager or Admin
**Body:**
```json
{
  "comment": "Great work on exceeding the target!"
}
```

#### 10. Cascade KPI
```http
POST /api/v1/kpi/cascade
```
**Description:** Copy a KPI from manager to subordinate
**Access:** Manager
**Body:**
```json
{
  "sourceDetailId": 10,
  "targetUserId": 15,
  "periodId": 1,
  "weight": 30
}
```

#### 11. Delete All KPI Data
```http
DELETE /api/v1/kpi/plans/all
```
**Description:** Delete all KPI headers and details (dangerous!)
**Access:** Admin only

---

### Periods (`/api/v1/periods`)

#### 1. Create Period
```http
POST /api/v1/periods
```
**Description:** Create new evaluation period
**Access:** Admin only
**Body:**
```json
{
  "name": "Q1 2026",
  "startDate": "2026-01-01",
  "endDate": "2026-03-31",
  "cycleType": "QUARTERLY",
  "status": "SETUP"
}
```

#### 2. List Periods
```http
GET /api/v1/periods?status=ACTIVE&isActive=true
```
**Description:** Get all periods with filtering
**Access:** Authenticated
**Query Parameters:**
- `status` (optional): SETUP, ACTIVE, LOCKED, CLOSED
- `isActive` (optional): true/false

#### 3. Get Active Period
```http
GET /api/v1/periods/active
```
**Description:** Get currently active period
**Access:** Authenticated

#### 4. Get Period by ID
```http
GET /api/v1/periods/:id
```
**Description:** Get single period details
**Access:** Authenticated

#### 5. Update Period
```http
PUT /api/v1/periods/:id
```
**Description:** Update period information
**Access:** Admin only
**Body:**
```json
{
  "name": "Q1 2026 Updated",
  "status": "ACTIVE",
  "isActive": true
}
```

**Note:** Only one period can be active at a time

#### 6. Delete Period
```http
DELETE /api/v1/periods/:id
```
**Description:** Delete a period
**Access:** Admin only

---

### Bulk Upload (`/api/v1/admin`)

#### 1. Upload Users Excel
```http
POST /api/v1/admin/users/bulk
Content-Type: multipart/form-data
```
**Description:** Upload Excel file to bulk import users
**Access:** Admin only
**Form Data:**
- `file`: Excel file (.xlsx)

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Bulk upload queued successfully"
}
```

#### 2. Get Job Status
```http
GET /api/v1/admin/jobs/:jobId
```
**Description:** Check bulk import job status
**Access:** Admin only

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "totalRows": 100,
  "successRows": 95,
  "failedRows": 5,
  "errorLogUrl": "/uploads/errors/job-xxx-errors.csv"
}
```

#### 3. List Jobs
```http
GET /api/v1/admin/jobs
```
**Description:** Get all bulk import jobs
**Access:** Admin only

#### 4. Download Template
```http
GET /api/v1/admin/users/template
```
**Description:** Download Excel template for bulk upload
**Access:** Admin only
**Response:** Excel file download

#### 5. Download Error Log
```http
GET /api/v1/admin/jobs/:jobId/error-log
```
**Description:** Download error log CSV for failed rows
**Access:** Admin only
**Response:** CSV file download

---

### Reports (`/api/v1/admin/reports`)

#### 1. Trigger KPI Export
```http
GET /api/v1/admin/reports/kpi-export?period_id=1
```
**Description:** Trigger async KPI export to Excel
**Access:** Admin only
**Query Parameters:**
- `period_id` (required): Period to export

**Response:**
```json
{
  "jobId": "export-job-123",
  "message": "KPI export job queued successfully"
}
```

#### 2. Get Export Status
```http
GET /api/v1/admin/reports/kpi-export/status/:jobId
```
**Description:** Check export job status
**Access:** Admin only

#### 3. Download Export
```http
GET /api/v1/admin/reports/kpi-export/download/:jobId
```
**Description:** Download completed export file
**Access:** Admin only
**Response:** Excel file download

#### 4. List Recent Exports
```http
GET /api/v1/admin/reports/kpi-export/list?limit=10
```
**Description:** Get list of recent export jobs
**Access:** Admin only

---

### Audit Log (`/api/v1/admin/audit-log`)

#### 1. Get Audit Logs
```http
GET /api/v1/admin/audit-log?action=LOGIN_SUCCESS&userId=1&startDate=2026-01-01&endDate=2026-12-31&page=1&limit=50
```
**Description:** Get audit logs with filtering
**Access:** Admin only
**Query Parameters:**
- `action` (optional): Filter by audit action (31 types available)
- `userId` (optional): Filter by user
- `resourceType` (optional): Filter by resource type (User, KpiHeader, Period)
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter to date (ISO format)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50, max: 100): Records per page

**Response:**
```json
{
  "logs": [
    {
      "id": 123,
      "action": "USER_CREATED",
      "userId": 1,
      "user": {
        "id": 1,
        "fullName": "Admin User",
        "email": "admin@hris.com"
      },
      "resourceType": "User",
      "resourceId": 45,
      "details": {
        "email": "newuser@example.com",
        "role": "EMPLOYEE"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2026-02-11T10:30:00.000Z"
    }
  ],
  "total": 1500,
  "page": 1,
  "limit": 50,
  "totalPages": 30
}
```

#### 2. Get Audit Statistics
```http
GET /api/v1/admin/audit-log/stats
```
**Description:** Get audit log statistics and counts
**Access:** Admin only

**Response:**
```json
{
  "totalLogs": 1500,
  "actionCounts": {
    "LOGIN_SUCCESS": 450,
    "USER_CREATED": 120,
    "KPI_CREATED": 300,
    "KPI_APPROVED": 200
  },
  "recentActivity": 87
}
```

---

### Scoring Configuration (`/api/v1/scoring-config`)

#### 1. Get Current Configuration
```http
GET /api/v1/scoring-config
```
**Description:** Get current dynamic scoring configuration
**Access:** Authenticated (all users can view)

**Response:**
```json
{
  "id": 1,
  "capMultiplier": 1.2,
  "gradeAThreshold": 90,
  "gradeBThreshold": 75,
  "gradeCThreshold": 60,
  "gradeDThreshold": 50,
  "updatedAt": "2026-02-12T10:30:00.000Z",
  "updatedBy": 1
}
```

**Grading Logic:**
- Score > 90 → Grade A
- Score > 75 → Grade B
- Score > 60 → Grade C
- Score > 50 → Grade D
- Score ≤ 50 → Grade E

**Scoring Logic:**
- **MAX polarity:** `Score = (Actual / Target) × Weight`
- **MIN polarity:** `Score = ((2 × Target - Actual) / Target) × Weight`
- **BINARY polarity:** `Score = (Actual === Target) ? Weight : 0`
- **Floor:** Minimum score is 0
- **Cap:** Maximum score is `Weight × capMultiplier` (default 120% of weight)

#### 2. Update Configuration
```http
PUT /api/v1/scoring-config
```
**Description:** Update scoring configuration
**Access:** Admin only

**Body (all fields optional):**
```json
{
  "capMultiplier": 1.5,
  "gradeAThreshold": 85,
  "gradeBThreshold": 70,
  "gradeCThreshold": 55,
  "gradeDThreshold": 45
}
```

**Validation Rules:**
- `capMultiplier` must be between 1.0 and 2.0
- Grade thresholds must be in descending order: A > B > C > D
- All thresholds must be between 0 and 100

**Response:**
```json
{
  "id": 1,
  "capMultiplier": 1.5,
  "gradeAThreshold": 85,
  "gradeBThreshold": 70,
  "gradeCThreshold": 55,
  "gradeDThreshold": 45,
  "updatedAt": "2026-02-12T10:35:00.000Z",
  "updatedBy": 1
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": "Grade thresholds must be in descending order: A > B > C > D",
  "error": "Bad Request"
}
```

**Note:** All configuration changes are logged to the audit trail.

---

## Common Response Codes

| Code | Meaning                | Description                                      |
|------|------------------------|--------------------------------------------------|
| 200  | OK                     | Request successful                               |
| 201  | Created                | Resource created successfully                    |
| 400  | Bad Request            | Invalid request body or parameters               |
| 401  | Unauthorized           | Missing or invalid authentication token          |
| 403  | Forbidden              | Insufficient permissions (wrong role)            |
| 404  | Not Found              | Requested resource doesn't exist                 |
| 409  | Conflict               | Resource already exists (e.g., duplicate email)  |
| 500  | Internal Server Error  | Server-side error                                |

---

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Or with multiple messages:

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 8 characters"
  ],
  "error": "Bad Request"
}
```

---

## Role-Based Access Control

### ADMIN
- Full system access
- Can create/update/delete users
- Can manage periods
- Can perform bulk operations
- Can access audit logs
- Can update scoring configuration
- Can approve any KPI plan

### MANAGER
- Can view own and subordinates' KPIs
- Can approve subordinates' KPI plans
- Can add comments to subordinates' KPIs
- Can cascade KPIs to subordinates
- Limited user management

### EMPLOYEE
- Can view and manage own KPIs only
- Can submit KPI plans
- Can update own achievements
- Cannot access admin features

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production:
- Authentication endpoints: 5 requests per minute
- General API: 100 requests per minute
- File uploads: 10 requests per minute

---

## Pagination

List endpoints support pagination with these query parameters:
- `page`: Page number (default: 1)
- `limit` or `take`: Items per page (default varies by endpoint)

Response includes:
```json
{
  "data": [...],
  "total": 500,
  "page": 2,
  "limit": 20,
  "totalPages": 25
}
```

---

## File Uploads

### Supported Formats
- **Bulk User Import:** Excel (.xlsx)
- **Evidence/Attachments:** URLs (stored as strings)

### File Size Limits
- Maximum upload size: 10MB (configurable)

---

## Testing with cURL

### Example: Login and Get KPI Plans
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hris.com","password":"admin123"}' \
  | jq -r '.access_token')

# 2. Get KPI Plans
curl -X GET "http://localhost:3001/api/v1/kpi/plans" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get Scoring Config
curl -X GET "http://localhost:3001/api/v1/scoring-config" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Swagger/OpenAPI

Interactive API documentation is available at:
```
http://localhost:3001/api/docs
```

Features:
- Try out endpoints directly from browser
- View request/response schemas
- Authentication with JWT token
- Example requests and responses

---

## Webhooks (Future Enhancement)

Not currently implemented. Potential use cases:
- KPI approval notifications
- Period status changes
- Export completion notifications

---

## API Versioning

Current version: **v1**

Future versions will be supported via URL path:
- v1: `/api/v1/...`
- v2: `/api/v2/...` (future)

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies or secure storage)
3. **Rotate JWT secrets regularly**
4. **Implement rate limiting**
5. **Validate all user inputs**
6. **Use CORS appropriately**
7. **Never log sensitive data** (passwords, tokens)
8. **Implement request logging** for audit trail

---

## Support

For API issues or questions:
- Check Swagger documentation: http://localhost:3001/api/docs
- Review this documentation
- Check backend logs for error details

---

*Last Updated: February 12, 2026*
*API Version: v1*
