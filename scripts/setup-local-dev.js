#!/usr/bin/env node
/**
 * Local Development Setup Script
 * 
 * This script prepares the local development environment by:
 * 1. Creating/refreshing materialized views
 * 2. Creating necessary indexes
 * 3. Setting up Redis cache for development
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function setupLocalDev() {
  console.log('🚀 Setting up local development environment...');
  
  try {
    // 1. Check if materialized view exists
    console.log('Checking for materialized view...');
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
    
    // 2. Create or refresh the materialized view
    if (viewExists) {
      console.log('Refreshing existing materialized view...');
      await prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW CONCURRENTLY \"mv_dashboard_companions\"");
    } else {
      console.log('Creating materialized view for dashboard companions...');
      await prisma.$executeRawUnsafe(`
        CREATE MATERIALIZED VIEW "mv_dashboard_companions" AS
        SELECT 
          c.id, c.name, c.src, c.description, c.userName, c.isFree, c.global,
          c.categoryId, c."createdAt", c.private, c."userId",
          (SELECT COUNT(*) FROM "Message" m WHERE m."companionId" = c.id) AS message_count
        FROM "Companion" c
        WHERE c.private = false OR c."userId" = 'system'
        WITH DATA;
      `);
      
      // Create indexes on the materialized view
      console.log('Creating indexes on materialized view...');
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX "mv_dashboard_companions_id_idx" ON "mv_dashboard_companions" (id);
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "mv_dashboard_companions_category_idx" ON "mv_dashboard_companions" (categoryId);
      `);
    }
    
    // 3. Create indexes for better query performance
    console.log('Creating performance indexes on main tables...');
    
    // Index for companion filtering
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_companion_private_system" 
      ON "Companion" (private, "userId");
    `);
    
    // Index for category filtering
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_companion_category_public" 
      ON "Companion" ("categoryId", private);
    `);
    
    // Index for name search
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_companion_name" 
      ON "Companion" (name);
    `);
    
    // 4. Update .env.local with optimal settings if it exists
    const envLocalPath = path.join(process.cwd(), '.env.local');
    try {
      let envContent = '';
      
      // Check if file exists and read it
      if (fs.existsSync(envLocalPath)) {
        envContent = fs.readFileSync(envLocalPath, 'utf8');
      }
      
      // Add Redis chunk size if not present
      if (!envContent.includes('REDIS_MAX_CHUNK_SIZE')) {
        envContent += '\n# Increase Redis chunk size for better performance\nREDIS_MAX_CHUNK_SIZE=500000\n';
      }
      
      // Add query timeouts if not present
      if (!envContent.includes('QUERY_TIMEOUT')) {
        envContent += '\n# Set longer query timeouts for local development\nQUERY_TIMEOUT=15000\nANON_QUERY_TIMEOUT=30000\n';
      }
      
      // Write back to file
      fs.writeFileSync(envLocalPath, envContent);
      console.log('✅ Updated .env.local with performance settings');
    } catch (error) {
      console.warn(`⚠️ Could not update .env.local: ${error.message}`);
    }
    
    // 5. Generate static cache data for anonymous users
    console.log('Generating static cache data for anonymous users...');
    try {
      // Run the script that generates the static cache
      execSync('node scripts/generate-static-cache.js', { stdio: 'inherit' });
    } catch (error) {
      console.warn(`⚠️ Could not generate static cache: ${error.message}`);
    }
    
    // 6. Analyze tables for query planner
    console.log('Analyzing tables to update statistics...');
    await prisma.$executeRawUnsafe(`ANALYZE "Companion"`);
    await prisma.$executeRawUnsafe(`ANALYZE "Category"`);
    
    if (viewExists) {
      await prisma.$executeRawUnsafe(`ANALYZE "mv_dashboard_companions"`);
    }
    
    console.log('✅ Local development environment setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run your app with: npm run dev');
    console.log('2. Dashboard should now load much faster');
    console.log('3. If still experiencing issues, check console logs for specific errors');
    
    return true;
  } catch (error) {
    console.error('❌ Setup error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

setupLocalDev()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 