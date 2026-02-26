# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** KPI Engine
- **Date:** 2026-02-26
- **Prepared by:** TestSprite AI Team
- **Test Environment:** Docker production containers (frontend:3000, backend:3001, postgres:5433, redis:6379)
- **Total Tests:** 42
- **Pass Rate:** 59.52% (25 passed / 17 failed)

---

## 2️⃣ Requirement Validation Summary

### REQ-01: Dashboard Overview & Navigation
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC001](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/c05d548e-6e17-41de-9cd8-419f7ada7c6f) | ✅ Passed | Dashboard shows key stats cards after login | — |
| [TC002](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/5c9e3490-f5db-4330-99db-ce9ea6c1d29d) | ✅ Passed | Quick action navigates to KPI plan management | — |
| [TC003](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/59f9614e-0431-42be-aeee-8e9678ea5478) | ✅ Passed | Sidebar navigation routes to Achievements | — |
| [TC004](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/989e0c0f-9da0-4370-b80c-6127919adb4c) | ✅ Passed | Quick action navigates to Bulk Upload | — |
| [TC005](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/1ca09591-cdb3-4903-8861-629354272ab9) | ✅ Passed | Theme toggle switches dashboard theme | — |
| [TC006](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/fb405327-a24d-465b-b8b4-13a9405279d3) | ❌ Failed | Logout redirects to login screen | Logout button clicks did not redirect; behavior non-deterministic |
| [TC007](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/5a23f090-1fcf-430e-9faa-be8f0cef8c1f) | ✅ Passed | Dashboard layout renders sidebar and navigation items | — |

**Result: 6/7 passed ⚠️**

---

### REQ-02: KPI Plan Management
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC008](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/54fc9137-8770-42cb-93c5-25e0ba3bc900) | ❌ Failed | Create a KPI plan with one KPI detail row | KPI plan for this user/period already exists (duplicate constraint) |

**Result: 0/1 passed ❌** (data-dependent — plan already exists from previous test run)

---

### REQ-03: Achievement Tracking
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC009](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/3993816d-5a39-43dd-8b4c-d40c62baaee6) | ✅ Passed | Update achievement values and see recalculated metrics | — |
| [TC010](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/a4aaebc1-ab72-4a93-a96e-a72a0ecd98cb) | ❌ Failed | Save and confirm success feedback | No save confirmation toast/banner displayed |
| [TC011](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/c9ca94e6-a909-4e79-a4c7-dfb09e9fa05e) | ❌ Failed | Persist manager comment on approved plan | No approved KPI plan available (only DRAFT plans) |
| [TC012](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/cf76f9f1-e367-44f0-863c-0d11d8a7abbc) | ❌ Failed | Manager comment remains visible after save | No approved plan available to test comment workflow |
| [TC013](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/8fba25e0-10f9-4272-bba5-275c12adc419) | ❌ Failed | Invalid evidence URL shows validation error | No validation error for invalid URL "not-a-url" |
| [TC014](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/07c982fb-3533-42a6-9ed1-57317f54a9dc) | ✅ Passed | Evidence URL accepts valid HTTPS link | — |
| [TC015](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/59aab9be-4509-442b-871d-0b8fa63d875a) | ✅ Passed | Real-time calculation indicators visible | — |
| [TC016](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/04edb33f-a1dc-45dd-8a71-19b3733af0b3) | ✅ Passed | Save button updates achievement and stays on page | — |

**Result: 4/8 passed ⚠️**

---

### REQ-04: User Management
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC017](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/e590d2e8-a7e5-414e-8302-062db801b404) | ✅ Passed | Create a new user | — |
| [TC018](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/d90a7d4b-0765-498a-9964-4e27c8bdf250) | ❌ Failed | Filter users by department code | Department filter dropdown not found |
| [TC019](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/7af115e8-3578-4bbe-8bae-15687b4d9460) | ✅ Passed | Add User modal validates required email field | — |
| [TC020](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/28e2f1de-0619-4bd6-a90a-8424d6107f5e) | ❌ Failed | Paginate user list | Only 5 users, all shown on one page, no pagination controls |
| [TC021](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/3969d2fb-a9a2-4999-a9f9-d10aff8e812b) | ✅ Passed | Non-admin view shows restricted controls | — |

**Result: 3/5 passed ⚠️**

---

### REQ-05: Bulk Upload
| Test | Status | Description |
|------|--------|-------------|
| [TC022](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/dd0bafa1-5664-460a-9933-7132b55cd0e1) | ✅ Passed | Bulk Upload page shows job list/status tracking |

**Result: 1/1 passed ✅**

---

### REQ-06: Period Management
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC023](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/b491c783-2636-4008-a3ed-ee7ae02f98ff) | ❌ Failed | Create a new evaluation period | Overlaps with existing "Q1 2026" period |
| [TC024](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/1025bdea-3d61-4992-a3d1-b4c57b29f952) | ✅ Passed | View periods list and status badges | — |
| [TC025](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/041f833a-1679-4c00-b756-588951a8a8a7) | ✅ Passed | Validation: end date before start date | — |
| [TC026](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/f38a2dcb-5b75-43d7-a02b-f784119815ac) | ✅ Passed | Validation: required fields missing | — |

**Result: 3/4 passed ⚠️**

---

### REQ-07: Scoring Configuration
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC027](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/74a2428b-1565-46f5-9221-008a19483826) | ✅ Passed | Save updated cap multiplier and thresholds | — |
| [TC028](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/7918684a-1c7d-4abe-8928-cb5b3cbb6805) | ✅ Passed | Edit thresholds and confirm persistence | — |
| [TC029](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/aa95628f-72ee-4fc7-950c-a0d0e11c45c0) | ✅ Passed | Validation error for out-of-range threshold | — |
| [TC030](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/9458f3eb-12fd-41ca-9025-7236ef6a7d1c) | ✅ Passed | Validation error for overlapping thresholds | — |
| [TC031](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/e6547c85-080f-4796-8f91-6ca9b04036d7) | ❌ Failed | Preview grade for sample score | No interactive sample score input — static display only |
| [TC032](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/7ad189b4-4d82-4874-b0dd-ddd7eda85c9e) | ❌ Failed | Preview updates when sample score changes | No interactive preview controls |
| [TC033](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/fcbb001f-0f57-4302-b425-b4bfcd8c999b) | ✅ Passed | Cap multiplier rejects non-numeric input | — |
| [TC034](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/df5278d9-0c0f-49ee-b754-761b28adb406) | ✅ Passed | Page shows existing config on load | — |

**Result: 6/8 passed ⚠️**

---

### REQ-08: Audit Log
| Test | Status | Description | Failure Reason |
|------|--------|-------------|----------------|
| [TC035](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/dcb9465c-21a6-44de-aacd-d27ec1788e68) | ❌ Failed | View entries with all details | User Agent column not displayed in audit log table |
| [TC036](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/f686f98c-a99f-4520-9481-082e9cf7f953) | ✅ Passed | Pagination — go to next page | — |
| [TC037](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/26d23334-088d-49ed-a683-dab42ac64f64) | ❌ Failed | Pagination — next then back to previous | Pagination controls unstable (DOM indexes change), click failed |
| [TC038](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/70b8efaa-b9cc-46ba-98a3-ba696e55a14e) | ❌ Failed | Apply filters and search | Loading indicator persists, results didn't update after filter |
| [TC039](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/2fa254fa-ac92-4313-a273-87b03ba5ffe2) | ❌ Failed | Verify filtered results show | No audit entries within selected date range; "User Agent" text not found |
| [TC040](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/473a9de1-e5ad-4b15-88d5-65a42bf37836) | ❌ Failed | Invalid date range validation | No validation when start > end date, query executed anyway |
| [TC041](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/416d0a81-5c4f-4342-92aa-80021b0efbd7) | ❌ Failed | Invalid date range — verify error text | No error message displayed, loads data with invalid range |
| [TC042](https://www.testsprite.com/dashboard/mcp/tests/c0f02282-6fcb-4c5e-a4e9-af590d72f00f/a091ac84-f119-4907-b8f6-de2187c9fac7) | ✅ Passed | Reset clears filters | — |

**Result: 2/8 passed ❌**

---

## 3️⃣ Coverage & Matching Metrics

- **Overall Pass Rate:** 59.52% (25/42)

| Requirement | Total Tests | ✅ Passed | ❌ Failed |
|---|---|---|---|
| REQ-01: Dashboard Overview & Navigation | 7 | 6 | 1 |
| REQ-02: KPI Plan Management | 1 | 0 | 1 |
| REQ-03: Achievement Tracking | 8 | 4 | 4 |
| REQ-04: User Management | 5 | 3 | 2 |
| REQ-05: Bulk Upload | 1 | 1 | 0 |
| REQ-06: Period Management | 4 | 3 | 1 |
| REQ-07: Scoring Configuration | 8 | 6 | 2 |
| REQ-08: Audit Log | 8 | 2 | 6 |
| **Total** | **42** | **25** | **17** |

---

## 4️⃣ Key Gaps / Risks

### 🔴 High Priority — Real Bugs
1. **Audit Log date range validation missing** — TC040, TC041: No client-side validation when start date > end date. The query executes silently with invalid range. **Fix: Add date range validation before API call.**
2. **No save confirmation feedback (Achievements)** — TC010: Users get no toast, banner, or visual feedback after saving achievement data. **Fix: Add a success toast/notification.**
3. **Evidence URL not validated** — TC013: Invalid URLs like "not-a-url" are accepted without validation. **Fix: Add URL format validation.**
4. **Audit Log filter loading state** — TC037, TC038: Pagination and filter actions cause persistent loading states, results don't reliably update. **Fix: Investigate race conditions in state management.**

### 🟡 Medium Priority — Missing Features
5. **Interactive score preview missing (Scoring Config)** — TC031, TC032: Grade preview is static-only. Code summary described it as interactive. **Fix: Add sample score input field with dynamic grade preview.**
6. **Department filter not accessible (Users)** — TC018: Department filter dropdown not found. May be hidden or not fully implemented.
7. **Logout behavior non-deterministic** — TC006: Logout button clicks don't reliably redirect. May be a timing/race condition.
8. **Audit Log missing User Agent column** — TC035: User Agent data exists in the audit log model but is not shown in the table UI.

### 🟢 Low Priority — Data-Dependent
9. **KPI plan duplicate constraint** — TC008: Plan already exists for this user/period from previous test run. Working correctly — needs test data cleanup between runs.
10. **Period overlap** — TC023: Existing "Q1 2026" conflicts. Overlap validation working — test needs unique date range.
11. **User pagination** — TC020: Only 5 users, all fit on one page. Not a bug — needs more seed data.
12. **No approved KPI plans** — TC011, TC012: Manager comment tests need an approved plan but only DRAFT plans exist. Needs test data with approved plans.
---
