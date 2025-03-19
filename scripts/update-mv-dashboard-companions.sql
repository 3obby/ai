-- Script to update the materialized view to include all required fields
-- Run this script directly on your production database

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions";

-- Create the updated materialized view with all needed columns
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_dashboard_companions" AS
SELECT 
  c.id, 
  c.name, 
  c.src, 
  c.description,
  c."categoryId", 
  c."userId",
  c.private,
  c."userName", 
  c."tokensBurned",
  c."createdAt",
  c."isFree",
  c.global,
  c.views,
  c.votes,
  COUNT(m.id) as message_count
FROM "Companion" c
LEFT JOIN "Message" m ON c.id = m."companionId"
WHERE c.private = false OR c."userId" = 'system'
GROUP BY c.id
ORDER BY c."createdAt" DESC;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS "mv_dashboard_companions_id_idx" 
ON "mv_dashboard_companions"(id);

CREATE INDEX IF NOT EXISTS "mv_dashboard_companions_categoryId_idx" 
ON "mv_dashboard_companions"("categoryId");

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Materialized view mv_dashboard_companions has been updated successfully!';
END $$; 