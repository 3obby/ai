-- Verify Performance Indexes Script
-- Run with: npx prisma db execute --file=scripts/verify-indexes.sql

-- Helper function to check if an index exists
CREATE OR REPLACE FUNCTION index_exists(index_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = index_name
  );
END;
$$ LANGUAGE plpgsql;

-- Output header
SELECT '=== Performance Index Verification Report ===';
SELECT CURRENT_TIMESTAMP AS "Verification Time";
SELECT '';

-- Message table indexes
SELECT 'Message Table Indexes:';
SELECT 
  'Message_companionId_createdAt_idx' AS "Index Name",
  CASE 
    WHEN index_exists('Message_companionId_createdAt_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT 
  'Message_companionId_userId_idx' AS "Index Name",
  CASE 
    WHEN index_exists('Message_companionId_userId_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT 
  'Message_companionId_userId_createdAt_idx' AS "Index Name",
  CASE 
    WHEN index_exists('Message_companionId_userId_createdAt_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT '';

-- GroupChat indexes
SELECT 'GroupChat Table Indexes:';
SELECT 
  'GroupChat_creatorId_createdAt_idx' AS "Index Name",
  CASE 
    WHEN index_exists('GroupChat_creatorId_createdAt_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT '';

-- GroupMessage indexes
SELECT 'GroupMessage Table Indexes:';
SELECT 
  'GroupMessage_groupChatId_createdAt_idx' AS "Index Name",
  CASE 
    WHEN index_exists('GroupMessage_groupChatId_createdAt_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT 
  'GroupMessage_groupChatId_senderId_idx' AS "Index Name",
  CASE 
    WHEN index_exists('GroupMessage_groupChatId_senderId_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT 
  'GroupMessage_groupChatId_isBot_idx' AS "Index Name",
  CASE 
    WHEN index_exists('GroupMessage_groupChatId_isBot_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT 
  'GroupMessage_groupChatId_senderId_createdAt_idx' AS "Index Name",
  CASE 
    WHEN index_exists('GroupMessage_groupChatId_senderId_createdAt_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT '';

-- Additional verification for schema drift indexes
SELECT 'Schema Drift Indexes:';
SELECT 
  'Companion_categoryId_private_idx' AS "Index Name",
  CASE 
    WHEN index_exists('Companion_categoryId_private_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

SELECT 
  'Companion_private_userId_createdAt_idx' AS "Index Name",
  CASE 
    WHEN index_exists('Companion_private_userId_createdAt_idx') THEN '✅ Present' 
    ELSE '❌ Missing' 
  END AS "Status";

-- Get total count of indexes
SELECT '';
SELECT 'Index Summary:';
SELECT count(*) AS "Total Index Count" FROM pg_indexes WHERE schemaname = 'public';

-- Clean up
DROP FUNCTION IF EXISTS index_exists; 