import { PrismaClient } from '@prisma/client';
import { refreshStaticCacheIfNeeded } from './static-data-cache';

const prisma = new PrismaClient();

/**
 * This script refreshes materialized views and static caches.
 * It should be scheduled to run during low-traffic periods.
 * Vercel cron jobs can be configured to run this at scheduled intervals.
 * 
 * Example cron schedule:
 * - Every 6 hours: 0 6-23/6 * * *
 * - Every day at 3am UTC: 0 3 * * *
 */
async function refreshJob() {
  console.log('🔄 Starting scheduled refresh job...');
  const startTime = Date.now();
  
  try {
    // 1. Refresh materialized views
    console.log('Refreshing materialized views...');
    
    try {
      // Try to refresh concurrently first (requires unique index)
      await prisma.$executeRawUnsafe(`
        REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS "mv_dashboard_companions"
      `);
    } catch (viewError) {
      console.log('Concurrent refresh failed, trying regular refresh:', viewError);
      
      // Fall back to regular refresh (will block reads)
      await prisma.$executeRawUnsafe(`
        REFRESH MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions"
      `);
    }
    
    // 2. Regenerate static cache file
    console.log('Refreshing static cache...');
    await refreshStaticCacheIfNeeded();
    
    // 3. Run analyze on key tables
    console.log('Updating database statistics...');
    await prisma.$executeRawUnsafe(`ANALYZE "Companion"`);
    await prisma.$executeRawUnsafe(`ANALYZE "Category"`);
    await prisma.$executeRawUnsafe(`ANALYZE "mv_dashboard_companions"`);
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Refresh job completed successfully in ${duration.toFixed(2)}s`);
    
    return {
      success: true,
      duration,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Refresh job failed:', error);
    
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  refreshJob()
    .then((result) => {
      console.log('Job result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default refreshJob; 