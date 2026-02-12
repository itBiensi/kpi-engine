-- CreateTable
CREATE TABLE "scoring_config" (
    "id" SERIAL NOT NULL,
    "cap_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.2,
    "grade_a_threshold" DECIMAL(5,2) NOT NULL DEFAULT 90,
    "grade_b_threshold" DECIMAL(5,2) NOT NULL DEFAULT 75,
    "grade_c_threshold" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "grade_d_threshold" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "scoring_config_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scoring_config" ADD CONSTRAINT "scoring_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
