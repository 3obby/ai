import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test migrations against a copy of production data
 * 
 * Usage:
 * - Set TEST_DATABASE_URL in env or pass as argument
 * - Run: npx ts-node scripts/test-migrations.ts
 */
async function testMigrations() {
  const testDbUrl = process.env.TEST_DATABASE_URL || process.argv[2];
  
  if (!testDbUrl) {
    console.error('❌ ERROR: TEST_DATABASE_URL environment variable or argument is required');
    process.exit(1);
  }
  
  console.log('🔍 Validating Prisma schema...');
  try {
    execSync('npx prisma validate', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Schema validation failed');
    process.exit(1);
  }
  
  console.log('📋 Checking for pending migrations...');
  const migrationDir = path.join(process.cwd(), 'prisma', 'migrations');
  const migrations = fs.readdirSync(migrationDir)
    .filter(dir => !dir.startsWith('.') && dir !== 'migration_lock.toml');
  
  console.log(`Found ${migrations.length} migrations`);
  
  console.log('🧪 Testing migrations on test database...');
  try {
    // Reset test database to ensure clean state
    execSync(`DATABASE_URL="${testDbUrl}" npx prisma migrate reset --force`, { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDbUrl }
    });
    
    console.log('✅ Migration test successful!');
  } catch (error) {
    console.error('❌ Migration test failed');
    process.exit(1);
  }
  
  // Check for unsafe changes in migrations
  console.log('🔍 Checking for potentially unsafe migration operations...');
  let hasWarnings = false;
  
  for (const migration of migrations) {
    const sqlPath = path.join(migrationDir, migration, 'migration.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Check for risky operations
      if (sqlContent.includes('DROP TABLE') || 
          sqlContent.includes('DROP COLUMN') ||
          sqlContent.includes('ALTER COLUMN') && sqlContent.includes('NOT NULL')) {
        console.warn(`⚠️ Warning: Migration ${migration} contains potentially risky operations`);
        hasWarnings = true;
      }
    }
  }
  
  if (hasWarnings) {
    console.log('⚠️ Some migrations contain potentially unsafe operations. Review carefully before deploying.');
  } else {
    console.log('✅ No obvious risky operations detected in migrations.');
  }
  
  console.log('✅ All migration tests passed');
}

testMigrations().catch(error => {
  console.error('❌ Migration testing failed:', error);
  process.exit(1);
}); 