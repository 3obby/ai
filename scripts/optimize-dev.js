#!/usr/bin/env node
/**
 * Optimize Development Environment
 * 
 * This script optimizes the local development environment for 
 * anonymous user handling and faster loading.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function ensureAnonymousUser() {
  console.log('🚀 Setting up an optimized anonymous user for local development...');
  
  try {
    // Create a consistent anonymous user ID for local development
    const devAnonymousId = 'dev-anonymous-' + uuidv4().substring(0, 8);
    
    // Create the user in the database
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          startsWith: 'dev-anonymous-'
        }
      }
    });
    
    let anonymousUserId = existingUser?.id;
    
    if (!existingUser) {
      console.log('Creating development anonymous user...');
      const newUser = await prisma.user.create({
        data: {
          id: devAnonymousId,
          name: 'Local Anonymous User',
          email: `dev-anonymous-${devAnonymousId}@example.com`
        }
      });
      anonymousUserId = newUser.id;
    } else {
      console.log('Using existing development anonymous user:', existingUser.id);
    }
    
    // Set up user usage for this anonymous user
    const existingUsage = await prisma.userUsage.findUnique({
      where: {
        userId: anonymousUserId
      }
    });
    
    if (!existingUsage) {
      console.log('Creating user usage record for anonymous user...');
      await prisma.userUsage.create({
        data: {
          userId: anonymousUserId,
          email: `dev-anonymous-${anonymousUserId}@example.com`,
          availableTokens: 5000,
          totalSpent: 0,
          totalMoneySpent: 0
        }
      });
    }
    
    // Create an .env.anonymous file with this ID
    const anonymousEnvPath = path.join(process.cwd(), '.env.anonymous');
    fs.writeFileSync(anonymousEnvPath, `NEXT_PUBLIC_DEV_ANONYMOUS_ID=${anonymousUserId}\n`);
    
    console.log(`✅ Anonymous user setup complete.`);
    console.log(`Anonymous User ID: ${anonymousUserId}`);
    
    return anonymousUserId;
  } catch (error) {
    console.error('Error setting up anonymous user:', error);
    return null;
  }
}

async function setupStaticCache() {
  console.log('Setting up static cache for dashboard...');
  try {
    // Check if static cache directory exists
    const cacheDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Run static cache generator if available
    try {
      execSync('node scripts/generate-static-cache.js', { stdio: 'inherit' });
      console.log('✅ Static cache generated successfully.');
    } catch (error) {
      console.warn('⚠️ Could not generate static cache:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up static cache:', error);
    return false;
  }
}

// Entry point
async function main() {
  console.log('🛠️  Optimizing local development environment...');
  
  try {
    // Set up anonymous user
    const anonymousUserId = await ensureAnonymousUser();
    
    // Set up static cache
    await setupStaticCache();
    
    // Verify environment variables
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const optimizationFlags = [
        'OPTIMIZE_FOR_DEVELOPMENT=true',
        'ENABLE_STATIC_CACHE=true',
        'DISABLE_METRICS_LOGGING=true',
        'ENABLE_DB_CONNECTION_RETRIES=true',
        'DB_MAX_RETRIES=5',
        'DB_RETRY_DELAY_MS=1000',
        'NETWORK_RETRY_COUNT=3',
        'NETWORK_RETRY_DELAY=1000'
      ];
      
      let modified = false;
      let newContent = envContent;
      
      for (const flag of optimizationFlags) {
        if (!newContent.includes(flag.split('=')[0])) {
          newContent += `\n${flag}`;
          modified = true;
        }
      }
      
      // Check for and enhance DATABASE_URL if needed
      if (newContent.includes('DATABASE_URL=') &&
          (!newContent.includes('keepalives=1') || !newContent.includes('connect_timeout=60'))) {
        // Find and update the DATABASE_URL to add connection resilience params
        const dbUrlRegex = /(DATABASE_URL=["']?.*?)(\?|["']|$)/;
        if (dbUrlRegex.test(newContent)) {
          const hasParams = newContent.includes('?');
          const separator = hasParams ? '&' : '?';
          
          // Create a comprehensive set of connection resilience parameters
          const resilienceParams = [
            'connect_timeout=60',
            'application_name=local_dev',
            'keepalives=1',
            'keepalives_idle=60',
            'keepalives_interval=10',
            'keepalives_count=6',
            'statement_timeout=60000',
            'idle_in_transaction_session_timeout=60000'
          ].join('&');
          
          newContent = newContent.replace(
            dbUrlRegex,
            `$1${separator}${resilienceParams}$2`
          );
          modified = true;
          console.log('✅ Enhanced DATABASE_URL with comprehensive connection resilience parameters');
        }
      }
      
      if (modified) {
        fs.writeFileSync(envLocalPath, newContent);
        console.log('✅ Added optimization flags to .env.local');
      }
    }
    
    console.log('✅ Local environment optimization complete!');
    console.log('🔍 Next steps:');
    console.log('1. Restart your Next.js server');
    console.log('2. Clear browser cookies for your local development domain');
    console.log('3. Test anonymous user flow again');
    
    return true;
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 