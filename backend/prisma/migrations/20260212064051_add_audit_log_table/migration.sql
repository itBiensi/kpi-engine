-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('SETUP', 'ACTIVE', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_UPDATED', 'PASSWORD_RESET', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'BULK_IMPORT_STARTED', 'BULK_IMPORT_COMPLETED', 'KPI_CREATED', 'KPI_SUBMITTED', 'KPI_APPROVED', 'KPI_REJECTED', 'KPI_ACHIEVEMENT_UPDATED', 'KPI_COMMENT_ADDED', 'KPI_ALL_DELETED', 'PERIOD_CREATED', 'PERIOD_UPDATED', 'PERIOD_DELETED', 'PERIOD_STATUS_CHANGED', 'EXPORT_TRIGGERED', 'EXPORT_COMPLETED', 'SYSTEM_SEEDED');

-- AlterEnum
ALTER TYPE "KpiStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "kpi_details" ADD COLUMN     "manager_comment" TEXT;

-- AlterTable
ALTER TABLE "kpi_headers" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approver_id" INTEGER,
ADD COLUMN     "manager_comment" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "periods" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "cycle_type" "CycleType" NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'SETUP',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" "AuditAction" NOT NULL,
    "user_id" INTEGER,
    "resourceType" VARCHAR(50),
    "resource_id" INTEGER,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resource_id_idx" ON "audit_logs"("resourceType", "resource_id");

-- AddForeignKey
ALTER TABLE "kpi_headers" ADD CONSTRAINT "kpi_headers_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_headers" ADD CONSTRAINT "kpi_headers_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
