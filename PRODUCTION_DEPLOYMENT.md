# Production Deployment Guide - Scoring System Update

This guide explains how to deploy the new scoring system update (commit: c84a91c) to your production environment.

---

## ⚠️ IMPORTANT: Breaking Change

This update contains a **BREAKING CHANGE** that modifies the database schema:
- ✅ Renames scoring threshold columns
- ✅ Changes grading from letters (A-E) to categories (Excellent, Very Good, Good, Poor, Bad)
- ✅ Updates thresholds from 90/75/60/50 to 130/110/90/70 (percentage-based)

**Estimated Downtime:** ~5 minutes (for migration)

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] SSH access to production server
- [ ] Docker and Docker Compose installed on production
- [ ] Database backup (critical!)
- [ ] Git access to pull latest code
- [ ] 5-10 minutes maintenance window
- [ ] Rollback plan ready

---

## 🔄 Deployment Steps

### Step 1: Connect to Production Server

```bash
ssh your-user@your-production-server
cd /path/to/kpi-management-system
```

### Step 2: Backup Database (CRITICAL!)

```bash
# Create backup directory if it doesn't exist
mkdir -p backups

# Backup the database
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U hris_user hris_db > backups/backup_before_scoring_update_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has content
ls -lh backups/backup_before_scoring_update_*.sql
```

**⚠️ DO NOT PROCEED** if backup fails or file is empty!

---

### Step 3: Pull Latest Code

```bash
# Fetch latest changes
git fetch origin

# Check what will be updated
git log HEAD..origin/main --oneline

# Pull the changes
git pull origin main
```

You should see commit: `c84a91c feat: update scoring system from letter grades to category-based ratings`

---

### Step 4: Review Migration

Check the migration file to understand what will happen:

```bash
cat backend/prisma/migrations/20260303144707_update_scoring_config_categories/migration.sql
```

**Expected migration:**
- Adds 4 new columns: `excellent_threshold`, `very_good_threshold`, `good_threshold`, `poor_threshold`
- Drops 4 old columns: `grade_a_threshold`, `grade_b_threshold`, `grade_c_threshold`, `grade_d_threshold`

---

### Step 5: Stop Frontend (Optional - Prevent User Access During Migration)

```bash
# Stop only frontend to show maintenance page
docker compose -f docker-compose.prod.yml stop frontend
```

Or display a maintenance message if you have a reverse proxy.

---

### Step 6: Run Database Migration

```bash
# Run migration inside backend container
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

**Expected output:**
```
Applying migration `20260303144707_update_scoring_config_categories`
The following migration(s) have been applied:
migrations/
  └─ 20260303144707_update_scoring_config_categories/
    └─ migration.sql

All migrations have been successfully applied.
```

**⚠️ If migration fails:**
1. Check error message
2. Restore from backup (see Rollback section)
3. Contact support

---

### Step 7: Rebuild Backend Container

```bash
# Rebuild backend with new code
docker compose -f docker-compose.prod.yml up -d --build backend
```

**Wait for backend to be healthy:**
```bash
# Check logs for successful startup
docker compose -f docker-compose.prod.yml logs backend --tail 20

# Look for: "Nest application successfully started"
```

---

### Step 8: Rebuild Frontend Container

```bash
# Rebuild frontend with new UI
docker compose -f docker-compose.prod.yml up -d --build frontend
```

**Wait for frontend to be ready:**
```bash
# Check frontend is running
docker compose -f docker-compose.prod.yml logs frontend --tail 20
```

---

### Step 9: Verify Deployment

#### Check Container Status
```bash
docker compose -f docker-compose.prod.yml ps
```

All containers should show status: `Up`

#### Verify Database Migration
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U hris_user -d hris_db -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'scoring_config';"
```

**Expected columns:**
- `excellent_threshold`
- `very_good_threshold`
- `good_threshold`
- `poor_threshold`

**Should NOT see:**
- `grade_a_threshold`
- `grade_b_threshold`
- `grade_c_threshold`
- `grade_d_threshold`

#### Check API Health
```bash
# Test API endpoint (replace with your domain)
curl -s https://kpi.yourcompany.com/api/v1/auth/login | jq .

# Should return 400 or 401 (not 500)
```

#### Test Scoring Config (as Admin)
1. Login to web interface
2. Go to **Dashboard → Scoring Configuration**
3. Verify you see:
   - **Excellent Threshold** (default: 130)
   - **Very Good Threshold** (default: 110)
   - **Good Threshold** (default: 90)
   - **Poor Threshold** (default: 70)
4. Check preview table shows category names (not letters)
5. Toggle dark mode - verify colors are readable

---

### Step 10: Monitor for Issues

```bash
# Monitor backend logs for errors
docker compose -f docker-compose.prod.yml logs -f backend

# Monitor frontend logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

**Watch for:**
- ✅ No error messages
- ✅ API requests completing successfully
- ✅ Users can login and access scoring config

---

## 🔙 Rollback Plan

If something goes wrong, follow these steps:

### Option 1: Quick Rollback (Restore Database Only)

```bash
# Stop backend to prevent data corruption
docker compose -f docker-compose.prod.yml stop backend

# Restore database from backup
cat backups/backup_before_scoring_update_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U hris_user -d hris_db

# Checkout previous commit
git checkout 71f3fb5  # Previous commit before scoring update

# Rebuild containers
docker compose -f docker-compose.prod.yml up -d --build

# Verify everything works
docker compose -f docker-compose.prod.yml ps
```

### Option 2: Full Rollback (Git Revert)

```bash
# Revert the commit
git revert c84a91c --no-edit

# Push revert to remote
git push origin main

# Restore database
cat backups/backup_before_scoring_update_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U hris_user -d hris_db

# Rebuild containers
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📊 Post-Deployment Tasks

### 1. Update Existing KPI Plans

The scoring configuration will be automatically updated, but existing KPI plans will keep their old letter grades in the database. The system will:
- ✅ Continue to display old grades correctly
- ✅ Calculate new grades using the new thresholds for any recalculations
- ✅ Display category names for newly created KPI plans

### 2. Notify Users

Send notification to users about the change:

**Subject:** KPI Scoring System Update

**Message:**
> We've updated our KPI scoring system to provide clearer performance categories:
>
> - **Excellent** (>130%): Outstanding performance
> - **Very Good** (110-130%): Exceeds expectations
> - **Good** (90-110%): Meets expectations
> - **Poor** (70-90%): Needs improvement
> - **Bad** (<70%): Below expectations
>
> Your existing KPI data remains unchanged. The new system applies to all score calculations going forward.

### 3. Update Documentation

- [ ] Update user manual with new category names
- [ ] Update training materials
- [ ] Update screenshots in help docs

---

## 🔍 Troubleshooting

### Issue: Migration fails with "column already exists"

**Cause:** Migration was partially applied

**Solution:**
```bash
# Check current schema
docker compose -f docker-compose.prod.yml exec postgres psql -U hris_user -d hris_db -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'scoring_config';"

# If you see both old and new columns, manually drop old ones:
docker compose -f docker-compose.prod.yml exec postgres psql -U hris_user -d hris_db <<EOF
ALTER TABLE scoring_config DROP COLUMN IF EXISTS grade_a_threshold;
ALTER TABLE scoring_config DROP COLUMN IF EXISTS grade_b_threshold;
ALTER TABLE scoring_config DROP COLUMN IF EXISTS grade_c_threshold;
ALTER TABLE scoring_config DROP COLUMN IF EXISTS grade_d_threshold;
EOF
```

### Issue: Frontend shows old UI

**Cause:** Browser cache or build cache

**Solution:**
```bash
# Force rebuild without cache
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Ask users to hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
```

### Issue: Dark mode colors not showing

**Cause:** Tailwind classes not compiled

**Solution:**
```bash
# Rebuild frontend
docker compose -f docker-compose.prod.yml up -d --build frontend

# Check build logs for Tailwind warnings
docker compose -f docker-compose.prod.yml logs frontend | grep -i tailwind
```

### Issue: API returns 500 errors

**Cause:** TypeScript compilation error or missing Prisma client

**Solution:**
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail 50

# Regenerate Prisma client and rebuild
docker compose -f docker-compose.prod.yml exec backend npx prisma generate
docker compose -f docker-compose.prod.yml restart backend
```

---

## 📞 Support

If you encounter issues during deployment:

1. **Check logs first:**
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

2. **Verify database state:**
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U hris_user -d hris_db
   ```

3. **Rollback if needed** (see Rollback Plan above)

4. **Contact support** with:
   - Deployment step where error occurred
   - Error logs
   - Database backup status

---

## ✅ Success Criteria

Deployment is successful when:

- [x] All containers are running and healthy
- [x] Database migration applied successfully
- [x] Scoring config page shows new category thresholds
- [x] Users can view and update scoring configuration
- [x] Dark mode displays correctly with solid colors
- [x] No errors in backend/frontend logs
- [x] Existing KPI data is preserved
- [x] API endpoints respond correctly

---

## 📝 Change Summary

**Database Changes:**
- ✅ 4 new columns added
- ✅ 4 old columns removed
- ✅ Default values set (130, 110, 90, 70)

**Backend Changes:**
- ✅ 7 files modified
- ✅ Scoring engine returns category names
- ✅ All APIs updated with new field names

**Frontend Changes:**
- ✅ 2 files modified
- ✅ UI completely redesigned
- ✅ Dark mode fully supported

**Estimated Deployment Time:** 5-10 minutes

---

## 📚 Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Docker Compose Production Guide](https://docs.docker.com/compose/production/)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)

---

**Last Updated:** 2026-03-03
**Deployment Version:** c84a91c
**Migration:** 20260303144707_update_scoring_config_categories
