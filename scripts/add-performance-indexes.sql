-- Add performance-related indexes to the database
-- Run this script against your PostgreSQL database to improve query performance

-- Index on Companion for the dashboard query
CREATE INDEX IF NOT EXISTS "idx_companion_dashboard_query" ON "Companion" ("private", "userId", "createdAt");

-- Index for count queries that happen frequently
CREATE INDEX IF NOT EXISTS "idx_message_companionId_userId" ON "Message" ("companionId", "userId");

-- Index for UserBurnedTokens to make token lookups faster
CREATE INDEX IF NOT EXISTS "idx_user_burned_tokens_lookup" ON "UserBurnedTokens" ("userId", "companionId");

-- Add index for category queries
CREATE INDEX IF NOT EXISTS "idx_companion_categoryId_private" ON "Companion" ("categoryId", "private");

-- Add index for searching companions by name
CREATE INDEX IF NOT EXISTS "idx_companion_name_trgm" ON "Companion" USING gin (name gin_trgm_ops);

-- Add functional index for case-insensitive name searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "idx_companion_name_lower" ON "Companion" (lower(name));

-- Optimize for counting queries
CREATE INDEX IF NOT EXISTS "idx_companion_system" ON "Companion" ("userId") WHERE "userId" = 'system';

-- Create a materialized view for dashboard companions data
-- This will dramatically speed up the dashboard query
-- Note: You'll need to refresh this view periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_dashboard_companions" AS
SELECT 
  c.id, 
  c.name, 
  c.src, 
  c."categoryId", 
  c."userName", 
  c."tokensBurned", 
  c.private, 
  c."userId",
  COUNT(m.id) as message_count
FROM "Companion" c
LEFT JOIN "Message" m ON c.id = m."companionId"
WHERE c.private = false OR c."userId" = 'system'
GROUP BY c.id
ORDER BY c."createdAt" DESC;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS "idx_mv_dashboard_companions_id" ON "mv_dashboard_companions" (id);

-- Create a function to refresh the view
CREATE OR REPLACE FUNCTION refresh_dashboard_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_dashboard_companions";
END;
$$ LANGUAGE plpgsql;

-- Create a migration to run this refresh daily
-- You'll need to set up a cron job to call this function
-- Or you can call it manually after major updates
COMMENT ON FUNCTION refresh_dashboard_view() IS 'Call this function to refresh the dashboard companions view';

-- Create view for user's companion data
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_user_companions" AS
SELECT 
  c.id, 
  c."userId",
  ub."tokensBurned" as user_tokens_burned
FROM "Companion" c
LEFT JOIN "UserBurnedTokens" ub ON c.id = ub."companionId"
WHERE c.private = true
GROUP BY c.id, c."userId", ub."tokensBurned";

-- Create index on the user companions view
CREATE INDEX IF NOT EXISTS "idx_mv_user_companions_userId" ON "mv_user_companions" ("userId");

-- Create function to refresh user companions view
CREATE OR REPLACE FUNCTION refresh_user_companions_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_user_companions";
END;
$$ LANGUAGE plpgsql;

-- Export these as executable SQL to improve performance
-- Run this file on your database to apply all optimizations

-- Add primary key indexes if not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_pkey') THEN
    ALTER TABLE "User" ADD PRIMARY KEY IF NOT EXISTS ("id");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_pkey') THEN
    ALTER TABLE "Companion" ADD PRIMARY KEY IF NOT EXISTS ("id");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Category_pkey') THEN  
    ALTER TABLE "Category" ADD PRIMARY KEY IF NOT EXISTS ("id");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Message_pkey') THEN
    ALTER TABLE "Message" ADD PRIMARY KEY IF NOT EXISTS ("id");
  END IF;
END
$$;

-- Add foreign key indexes for faster joins
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_userId_idx') THEN
    CREATE INDEX IF NOT EXISTS "Companion_userId_idx" ON "Companion"("userId");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_categoryId_idx') THEN
    CREATE INDEX IF NOT EXISTS "Companion_categoryId_idx" ON "Companion"("categoryId");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Message_companionId_idx') THEN
    CREATE INDEX IF NOT EXISTS "Message_companionId_idx" ON "Message"("companionId");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Message_userId_idx') THEN
    CREATE INDEX IF NOT EXISTS "Message_userId_idx" ON "Message"("userId");
  END IF;
END
$$;

-- Add partial indexes for common query patterns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_public_idx') THEN
    CREATE INDEX IF NOT EXISTS "Companion_public_idx" ON "Companion"("private") 
    WHERE "private" = false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_system_idx') THEN
    CREATE INDEX IF NOT EXISTS "Companion_system_idx" ON "Companion"("userId") 
    WHERE "userId" = 'system';
  END IF;
END
$$;

-- Add composite indexes for common multi-column queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_categoryId_private_idx') THEN
    CREATE INDEX IF NOT EXISTS "Companion_categoryId_private_idx" 
    ON "Companion"("categoryId", "private");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Message_companionId_createdAt_idx') THEN
    CREATE INDEX IF NOT EXISTS "Message_companionId_createdAt_idx" 
    ON "Message"("companionId", "createdAt" DESC);
  END IF;
END
$$;

-- Create extension for full-text search if not exists
-- DO $$
-- BEGIN
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   
--   IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Companion_name_trgm_idx') THEN
--     CREATE INDEX IF NOT EXISTS "Companion_name_trgm_idx" 
--     ON "Companion" USING gin (name gin_trgm_ops);
--   END IF;
-- END
-- $$;

-- Create materialized view for dashboard companions query
DO $$
BEGIN
  -- Drop existing view if it exists to ensure we have the latest schema
  DROP MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions";
  
  -- Create the materialized view
  CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_dashboard_companions" AS
  SELECT 
    c.id, 
    c.name, 
    c.src, 
    c."categoryId", 
    c."userId",
    c.private,
    c."userName", 
    c."tokensBurned",
    c."createdAt",
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
END
$$;

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_dashboard_companions";
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create a function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT matviewname FROM pg_matviews
  LOOP
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(r.matviewname);
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- For analysis - Create function to identify slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries()
RETURNS TABLE (
  query_text text,
  execution_count bigint,
  mean_time double precision,
  max_time double precision,
  min_time double precision,
  total_time double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    query,
    calls,
    mean_time,
    max_time, 
    min_time,
    total_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql; 