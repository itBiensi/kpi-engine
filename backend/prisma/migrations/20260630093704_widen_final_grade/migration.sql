-- Widen final_grade to hold category ratings (Excellent / Very Good / Good / Poor / Bad).
-- Previously VARCHAR(2) from the original letter-grade system, which silently
-- broke header score persistence after the move to category-based ratings.
ALTER TABLE "kpi_headers" ALTER COLUMN "final_grade" TYPE VARCHAR(20);
