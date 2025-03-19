import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to apply database performance optimizations
 * - Refresh materialized views 
 * - Create necessary indexes
 * - Analyze tables 
 */
async function applyDatabaseOptimizations() {
  console.log('🚀 Running database performance optimizations...');
  
  try {
    // 1. Check if materialized view exists
    console.log('Checking materialized view status...');
    const viewCheck = await prisma.$queryRaw`
      SELECT COUNT(*) > 0 as exists 
      FROM pg_catalog.pg_class c 
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = 'mv_dashboard_companions' 
      AND c.relkind = 'm'
    `;
    
    const viewExists = Array.isArray(viewCheck) && 
                      viewCheck.length > 0 && 
                      viewCheck[0]?.exists === true;
    
    // 2. Refresh or create the view if needed
    if (viewExists) {
      console.log('Refreshing existing materialized view...');
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_dashboard_companions"`);
    } else {
      console.log('Creating dashboard companions materialized view...');
      
      // Drop the view if it exists but in a corrupt state
      await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions"`);
      
      // Create the new optimized view (with simpler query and fewer columns)
      await prisma.$executeRawUnsafe(`
        CREATE MATERIALIZED VIEW "mv_dashboard_companions" AS
        SELECT 
          c.id, 
          c.name, 
          c.src, 
          c.description,
          c."categoryId", 
          c."userName",
          c."isFree",
          c.global,
          c."createdAt"
        FROM "Companion" c
        WHERE c.private = false OR c."userId" = 'system'
        ORDER BY c."createdAt" DESC
      `);
      
      // Create indexes on the view
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "mv_dashboard_companions_id_idx" 
        ON "mv_dashboard_companions"(id)
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "mv_dashboard_companions_categoryId_idx" 
        ON "mv_dashboard_companions"("categoryId")
      `);
    }
    
    // 3. Create indexes for anonymous user queries if they don't exist
    console.log('Creating optimized indexes for anonymous user queries...');
    
    // Index for the public companions (used in dashboard)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_companion_public_system" 
      ON "Companion" (private, "userId", "createdAt") 
      WHERE private = false OR "userId" = 'system'
    `);
    
    // Index for category filtering
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_companion_category_public" 
      ON "Companion" ("categoryId", private)
    `);
    
    // Index for name search
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_companion_name" 
      ON "Companion" (name)
    `);
    
    // 4. Analyze tables for query planner
    console.log('Analyzing tables to update statistics...');
    await prisma.$executeRawUnsafe(`ANALYZE "Companion"`);
    await prisma.$executeRawUnsafe(`ANALYZE "Category"`);
    if (viewExists) {
      await prisma.$executeRawUnsafe(`ANALYZE "mv_dashboard_companions"`);
    }
    
    // 5. Set up a daily refresh job using a stored procedure
    console.log('Setting up materialized view refresh procedure...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION refresh_dashboard_views()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_dashboard_companions";
        RETURN;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Database optimizations completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database optimization error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  applyDatabaseOptimizations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default applyDatabaseOptimizations; 