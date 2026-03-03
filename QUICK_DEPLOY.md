# Quick Production Deployment Guide

**For experienced operators who need a fast reference.**

---

## ⚡ Quick Deploy (5 minutes)

```bash
# 1. SSH to production server
ssh your-user@production-server
cd /path/to/kpi-management-system

# 2. BACKUP DATABASE (CRITICAL!)
mkdir -p backups
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U hris_user hris_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull latest code
git pull origin main

# 4. Run migration
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 5. Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail 20
```

---

## 🔄 One-Line Deploy (if you're confident)

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U hris_user hris_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql && \
git pull origin main && \
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy && \
docker compose -f docker-compose.prod.yml up -d --build && \
docker compose -f docker-compose.prod.yml ps
```

---

## 🔙 Quick Rollback

```bash
# Restore database
docker compose -f docker-compose.prod.yml stop backend
cat backups/backup_YYYYMMDD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U hris_user -d hris_db

# Revert code
git revert c84a91c --no-edit
git push origin main

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

---

## ✅ Quick Verification

```bash
# Check migration applied
docker compose -f docker-compose.prod.yml exec postgres psql -U hris_user -d hris_db -c \
  "SELECT excellent_threshold, very_good_threshold, good_threshold, poor_threshold FROM scoring_config LIMIT 1;"

# Expected: 130.00 | 110.00 | 90.00 | 70.00
```

---

## 🚨 If Something Breaks

1. **Check logs:** `docker compose -f docker-compose.prod.yml logs --tail 100`
2. **Rollback immediately:** See Quick Rollback above
3. **Contact support** with logs

---

**Full Guide:** See `PRODUCTION_DEPLOYMENT.md` for detailed instructions.
