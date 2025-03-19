#!/usr/bin/env node
// Database and cache maintenance script
// Usage: node scripts/maintain-db.js [--refresh-views] [--clear-cache] [--fix-views]

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Only import @vercel/kv if it's available
let kvClient = null;
try {
  const { createClient } = require('@vercel/kv');
  kvClient = { createClient };
} catch (error) {
  console.log('⚠️ @vercel/kv not available. Cache clearing will be skipped.');
}

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const shouldRefreshViews = args.includes('--refresh-views') || args.includes('-r');
const shouldClearCache = args.includes('--clear-cache') || args.includes('-c');
const shouldFixViews = args.includes('--fix-views') || args.includes('-f');
const shouldDoAll = args.includes('--all') || args.includes('-a');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database and Cache Maintenance Script

Usage: node scripts/maintain-db.js [options]

Options:
  --refresh-views, -r    Refresh all materialized views
  --clear-cache, -c      Clear Redis cache for dashboard
  --fix-views, -f        Recreate materialized views (fix schema issues)
  --all, -a              Perform all maintenance operations
  --help, -h             Show this help message
  `);
  process.exit(0);
}

// If no specific flags are provided, show help
if (args.length === 0) {
  console.log('No maintenance options specified. Use --help for usage information.');
  process.exit(0);
}

async function refreshMaterializedViews() {
  try {
    console.log('🔄 Refreshing materialized views...');
    
    // Refresh the dashboard companions view
    await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW "mv_dashboard_companions";`);
    
    // Try to refresh all views using the function if it exists
    try {
      await prisma.$executeRawUnsafe(`SELECT refresh_all_views();`);
      console.log('✅ All materialized views refreshed successfully via refresh_all_views()');
    } catch (error) {
      // Function might not exist, which is fine - we already refreshed the main view
      console.log('ℹ️ refresh_all_views() function not available, but primary view was refreshed');
    }
    
    console.log('✅ Materialized views refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error refreshing materialized views:', error);
    return false;
  }
}

async function clearRedisCache() {
  try {
    console.log('🔄 Clearing Redis cache...');
    
    // Check if KV client is available
    if (!kvClient) {
      console.log('❌ @vercel/kv module not available. Install with: npm install @vercel/kv');
      console.log('⚠️ Skipping cache clearing.');
      return true; // Return true to continue with other operations
    }
    
    // Check if Redis is configured
    if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
      console.log('❌ Redis environment variables not configured.');
      console.log('If using Vercel KV, please set KV_URL and KV_REST_API_TOKEN');
      return false;
    }
    
    // Connect to Redis using Vercel KV
    const kv = kvClient.createClient({
      url: process.env.KV_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    // Get all keys matching the dashboard pattern
    console.log('Finding dashboard cache keys...');
    const keys = await kv.keys('dashboard:*');
    
    if (keys.length === 0) {
      console.log('No dashboard cache keys found.');
      return true;
    }
    
    console.log(`Found ${keys.length} dashboard cache keys to clear.`);
    
    // Delete all matching keys
    for (const key of keys) {
      await kv.del(key);
    }
    
    console.log('✅ Successfully cleared dashboard cache');
    return true;
  } catch (error) {
    console.error('❌ Error clearing Redis cache:', error);
    console.log('⚠️ Continuing with other operations...');
    return true; // Return true to continue with other operations
  }
}

async function fixMaterializedViews() {
  try {
    console.log('🔄 Fixing materialized views...');
    
    // Drop and recreate the dashboard companions view
    console.log('Dropping existing materialized view...');
    await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions";`);
    
    console.log('Creating updated materialized view...');
    await prisma.$executeRawUnsafe(`
      CREATE MATERIALIZED VIEW "mv_dashboard_companions" AS
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
      GROUP BY c.id, c.name, c.src, c.description, c."categoryId", c."userId", c.private, c."userName", 
              c."tokensBurned", c."createdAt", c."isFree", c.global, c.views, c.votes
      ORDER BY c."createdAt" DESC;
    `);
    
    // Create required indexes
    console.log('Creating view indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "mv_dashboard_companions_id_idx" 
      ON "mv_dashboard_companions"(id);
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "mv_dashboard_companions_categoryId_idx" 
      ON "mv_dashboard_companions"("categoryId");
    `);
    
    console.log('✅ Materialized views fixed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error fixing materialized views:', error);
    return false;
  }
}

async function main() {
  try {
    const operations = [];
    
    if (shouldFixViews || shouldDoAll) {
      operations.push(fixMaterializedViews());
    }
    
    if (shouldRefreshViews || shouldDoAll) {
      operations.push(refreshMaterializedViews());
    }
    
    if (shouldClearCache || shouldDoAll) {
      operations.push(clearRedisCache());
    }
    
    if (operations.length === 0) {
      console.log('No operations selected. Use --help for usage information.');
      return;
    }
    
    const results = await Promise.all(operations);
    const allSuccessful = results.every(result => result === true);
    
    if (allSuccessful) {
      console.log('✅ All maintenance operations completed successfully');
    } else {
      console.log('⚠️ Some maintenance operations failed - check logs for details');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error during maintenance:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Maintenance script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Maintenance script failed:', error);
    process.exit(1);
  }); 