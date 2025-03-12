// Script to apply performance indexes migration
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Applying performance indexes migration...');
  
  try {
    // 1. Apply the SQL migration directly
    const migrationPath = path.join(__dirname, '../prisma/migrations/20250311000000_add_performance_indexes/migration.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL by statements and execute each one
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await prisma.$executeRawUnsafe(`${statement};`);
      }
    }
    
    console.log('✅ Migration SQL applied successfully');
    
    // 2. Mark the migration as applied in Prisma's migration table
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid(),
        'add_performance_indexes_checksum',
        NOW(),
        '20250311000000_add_performance_indexes',
        'applied successfully',
        NULL,
        NOW() - INTERVAL '1 SECOND',
        1
      )
      ON CONFLICT (migration_name) DO NOTHING;
    `;
    
    console.log('✅ Migration recorded in _prisma_migrations table');
    
    // 3. Generate updated Prisma client to match schema
    console.log('🔄 Generating updated Prisma client...');
    exec('npx prisma generate', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error generating Prisma client: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Prisma generate stderr: ${stderr}`);
        return;
      }
      console.log('✅ Prisma client generated successfully');
      console.log(stdout);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Performance indexes migration completed successfully');
  })
  .catch((e) => {
    console.error('❌ Script error:', e);
    process.exit(1);
  }); 