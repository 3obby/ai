// Script to fix the materialized view for dashboard companions
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Fixing materialized view for dashboard companions...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-mv-dashboard-companions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the first statement to drop the view
    console.log('Dropping existing materialized view...');
    try {
      await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions";`);
      console.log('✅ Materialized view dropped successfully');
    } catch (e) {
      console.log('⚠️ Could not drop view, it might not exist:', e.message);
    }
    
    // Execute the second statement to create the view
    console.log('Creating updated materialized view...');
    try {
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
      console.log('✅ Materialized view created successfully');
    } catch (e) {
      console.error('❌ Failed to create materialized view:', e.message);
      throw e;
    }
    
    // Create the unique index
    console.log('Creating unique index on id...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "mv_dashboard_companions_id_idx" 
        ON "mv_dashboard_companions"(id);
      `);
      console.log('✅ Unique index created successfully');
    } catch (e) {
      console.error('❌ Failed to create unique index:', e.message);
    }
    
    // Create the category index
    console.log('Creating index on categoryId...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "mv_dashboard_companions_categoryId_idx" 
        ON "mv_dashboard_companions"("categoryId");
      `);
      console.log('✅ Category index created successfully');
    } catch (e) {
      console.error('❌ Failed to create category index:', e.message);
    }
    
    console.log('✅ Materialized view fixed successfully');
    
    // Clear Redis cache for dashboard data
    console.log('🔄 Clearing Redis cache for dashboard data...');
    try {
      // If you have direct access to Redis, you could clear the cache here
      console.log('Note: You may need to manually clear your Redis cache');
    } catch (error) {
      console.error('❌ Error clearing Redis cache:', error);
    }
    
  } catch (error) {
    console.error('❌ Error fixing materialized view:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  }); 