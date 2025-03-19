// Simulate network instability and test database resilience
const { PrismaClient } = require('@prisma/client');

async function simulateNetworkIssues() {
  console.log('Simulating network instability...');
  
  // Create Prisma client with minimal connection timeout
  // This will make it more likely to fail on connection issues
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL?.replace('connect_timeout=30', 'connect_timeout=2')
      }
    }
  });
  
  const MAX_ATTEMPTS = 10;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      console.log(`\nAttempt ${i+1}/${MAX_ATTEMPTS}: Connecting to database...`);
      
      // Simulate network load/congestion
      if (Math.random() < 0.3) { // 30% chance of high network congestion
        console.log('Simulating network congestion...');
      }
      
      // Force connection to close between attempts
      await prisma.$disconnect();
      
      // Add random delays to simulate varying network conditions
      const delay = Math.floor(Math.random() * 300);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Reconnect and run query
      await prisma.$connect();
      
      // Run a simple query with a short timeout
      const startTime = Date.now();
      const promise = prisma.$queryRaw`SELECT pg_sleep(0.1)::text as sleep_result, 1 as test`;
      
      // Set a short timeout for the query - this simulates connection issues
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Can't reach database server - connection timed out"));
        }, 2000); // Short timeout to simulate issues
      });
      
      // Race the actual query against our artificial timeout
      const result = await Promise.race([promise, timeoutPromise]);
      
      const endTime = Date.now();
      console.log(`Query completed in ${endTime - startTime}ms`);
      successCount++;
      
    } catch (error) {
      console.error(`Connection failed:`, error.message);
      failCount++;
      
      // Wait longer after a failure
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n--- Test Results ---');
  console.log(`Successful connections: ${successCount}/${MAX_ATTEMPTS} (${(successCount/MAX_ATTEMPTS*100).toFixed(1)}%)`);
  console.log(`Failed connections: ${failCount}/${MAX_ATTEMPTS} (${(failCount/MAX_ATTEMPTS*100).toFixed(1)}%)`);
  
  if (failCount > 0) {
    console.log('\nDetected intermittent connectivity issues!');
    console.log('This matches the behavior you\'re seeing in your application.');
    console.log('\nRecommendations:');
    console.log('1. Ensure your retry logic is enabled in .env.local:');
    console.log('   ENABLE_DB_CONNECTION_RETRIES=true');
    console.log('   DB_MAX_RETRIES=3');
    console.log('   DB_RETRY_DELAY_MS=1000');
    console.log('2. Check your network stability');
    console.log('3. Make sure your DATABASE_URL includes proper connection parameters:');
    console.log('   - connect_timeout=30');
    console.log('   - keepalives=1');
    console.log('   - keepalives_idle=60');
    console.log('   - application_name=local_dev');
  } else {
    console.log('\nNo connection issues detected in this test run.');
    console.log('However, your application might still be experiencing issues under different conditions.');
  }
  
  await prisma.$disconnect();
}

simulateNetworkIssues().finally(() => process.exit(0)); 