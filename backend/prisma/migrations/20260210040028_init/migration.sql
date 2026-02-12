-- CreateEnum
CREATE TYPE "KpiStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "Polarity" AS ENUM ('MAX', 'MIN', 'BINARY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "employee_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '',
    "dept_code" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "manager_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_headers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "period_id" INTEGER NOT NULL,
    "status" "KpiStatus" NOT NULL DEFAULT 'DRAFT',
    "total_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_grade" VARCHAR(2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_details" (
    "id" SERIAL NOT NULL,
    "header_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "definition" TEXT,
    "polarity" "Polarity" NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "target_value" DECIMAL(15,2) NOT NULL,
    "actual_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "achievement_pct" DECIMAL(5,2),
    "final_score" DECIMAL(5,2),
    "evidence_url" VARCHAR(255),

    CONSTRAINT "kpi_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_import_jobs" (
    "job_id" TEXT NOT NULL,
    "admin_id" INTEGER,
    "filename" VARCHAR(255),
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "error_log_url" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_import_jobs_pkey" PRIMARY KEY ("job_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_headers_user_id_period_id_key" ON "kpi_headers"("user_id", "period_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_headers" ADD CONSTRAINT "kpi_headers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_details" ADD CONSTRAINT "kpi_details_header_id_fkey" FOREIGN KEY ("header_id") REFERENCES "kpi_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_import_jobs" ADD CONSTRAINT "bulk_import_jobs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
