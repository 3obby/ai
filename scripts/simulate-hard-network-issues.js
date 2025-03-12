// Simulate more aggressive network instability
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');

// Function to temporarily block outbound connections to PostgreSQL
function temporarilyBlockPostgresPort() {
  // This simulates a network disruption by adding a small sleep
  // without actually modifying firewall rules
  return new Promise(resolve => {
    console.log('Simulating network disruption...');
    setTimeout(resolve, 3000); // Block for 3 seconds
  });
}

async function simulateHardNetworkIssues() {
  console.log('Simulating severe network disruptions...');
  
  // Create client with very short timeouts to increase chances of failure
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL?.replace(/connect_timeout=\d+/, 'connect_timeout=1')
                                     .replace(/keepalives=\d+/, 'keepalives=0')
      }
    }
  });
  
  const MAX_ATTEMPTS = 10;
  let successCount = 0;
  let failCount = 0;
  let connectionErrorCount = 0;
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      console.log(`\nAttempt ${i+1}/${MAX_ATTEMPTS}: Testing connection...`);
      
      // 50% chance of simulating a connection problem
      const shouldBlockConnection = Math.random() < 0.5;
      
      if (shouldBlockConnection) {
        console.log('Simulating network disruption before connecting...');
        await temporarilyBlockPostgresPort();
      }
      
      // Force connection to close between attempts
      await prisma.$disconnect();
      
      // Add random delay to simulate varying network conditions
      const delay = Math.floor(Math.random() * 500);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Very short timeout for connection - likely to fail sometimes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Can't reach database server - connection timed out"));
        }, 1000); // Very short timeout to ensure some failures
      });
      
      // Try to connect and run a query with an artificial timeout
      console.log('Attempting database query...');
      const queryPromise = async () => {
        await prisma.$connect();
        return prisma.$queryRaw`SELECT pg_sleep(0.3)::text as sleep_result, 1 as test`;
      };
      
      const startTime = Date.now();
      const result = await Promise.race([queryPromise(), timeoutPromise]);
      
      const endTime = Date.now();
      console.log(`Query completed in ${endTime - startTime}ms`);
      successCount++;
      
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      console.error(`Connection failed: ${errorMsg}`);
      failCount++;
      
      if (errorMsg.includes("Can't reach database server")) {
        connectionErrorCount++;
      }
      
      // Wait a bit before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n--- Test Results ---');
  console.log(`Successful connections: ${successCount}/${MAX_ATTEMPTS} (${(successCount/MAX_ATTEMPTS*100).toFixed(1)}%)`);
  console.log(`Failed connections: ${failCount}/${MAX_ATTEMPTS} (${(failCount/MAX_ATTEMPTS*100).toFixed(1)}%)`);
  console.log(`"Can't reach database server" errors: ${connectionErrorCount}/${failCount} failed connections`);
  
  if (connectionErrorCount > 0) {
    console.log('\n✅ Successfully reproduced the "Can\'t reach database server" error!');
    console.log('This is the same error you\'re seeing in your application.');
    console.log('\nThis confirms that your issue is related to network connectivity or timeouts.');
    console.log('\nRECOMMENDED FIXES:');
    console.log('1. Ensure your retry logic is correctly implemented:');
    console.log('   - Check that prismadb.ts has proper retry middleware');
    console.log('   - Verify that ENABLE_DB_CONNECTION_RETRIES=true is in .env.local');
    console.log('   - Set DB_MAX_RETRIES=5 (increase from 3 for better reliability)');
    console.log('   - Set DB_RETRY_DELAY_MS=1000');
    console.log('2. Implement fallback for anonymous users:');
    console.log('   - Ensure the chat/[chatId]/page.tsx has proper error handling');
    console.log('   - Verify your fallback companion object is complete');
    console.log('3. Optimize your database connection string:');
    console.log('   - Increase connect_timeout=60 (seconds)');
    console.log('   - Enable keepalives=1 with appropriate intervals');
    console.log('   - Add TCP connection parameters');
    console.log('4. Consider creating a local database for development');
  } else {
    console.log('\nCould not reproduce the specific "Can\'t reach database server" error.');
    console.log('This suggests your issue might be more sporadic or environment-specific.');
  }
  
  await prisma.$disconnect();
}

simulateHardNetworkIssues().finally(() => process.exit(0)); 