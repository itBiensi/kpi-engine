-- AlterTable: Update scoring_config table to use new category-based grading system

-- Step 1: Add new columns with default values
ALTER TABLE "scoring_config"
  ADD COLUMN "excellent_threshold" DECIMAL(5,2) NOT NULL DEFAULT 130,
  ADD COLUMN "very_good_threshold" DECIMAL(5,2) NOT NULL DEFAULT 110,
  ADD COLUMN "good_threshold" DECIMAL(5,2) NOT NULL DEFAULT 90,
  ADD COLUMN "poor_threshold" DECIMAL(5,2) NOT NULL DEFAULT 70;

-- Step 2: Drop old columns
ALTER TABLE "scoring_config"
  DROP COLUMN "grade_a_threshold",
  DROP COLUMN "grade_b_threshold",
  DROP COLUMN "grade_c_threshold",
  DROP COLUMN "grade_d_threshold";
