// Test database connection reliability
const { PrismaClient } = require('@prisma/client');

async function testConnectionReliability() {
  console.log('Testing database connection reliability...');
  
  const prisma = new PrismaClient();
  const totalTests = 10;
  let successCount = 0;
  let failCount = 0;
  
  try {
    console.log(`Will run ${totalTests} connection tests...`);
    
    for (let i = 0; i < totalTests; i++) {
      try {
        console.log(`Test #${i+1}: Connecting to database...`);
        
        // Force a new connection each time
        await prisma.$disconnect();
        await prisma.$connect();
        
        // Run a simple query
        const startTime = Date.now();
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`Test #${i+1}: Success! Query completed in ${duration}ms`);
        successCount++;
        
        // Add a small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Test #${i+1}: Failed with error:`, error.message);
        failCount++;
      }
    }
    
    console.log('\nConnection reliability test results:');
    console.log(`Success: ${successCount}/${totalTests} (${(successCount/totalTests*100).toFixed(2)}%)`);
    console.log(`Failed: ${failCount}/${totalTests} (${(failCount/totalTests*100).toFixed(2)}%)`);
    
    if (failCount > 0) {
      console.log('\nDetected intermittent connection issues!');
      console.log('Recommendations:');
      console.log('1. Check your network stability');
      console.log('2. Verify VPN settings if using one');
      console.log('3. Consider using connection pooling or adding retry logic');
      console.log('4. Adjust connection parameters in DATABASE_URL (keepalives, connection timeout)');
    } else {
      console.log('\nNo connection issues detected. Your database connection appears to be stable.');
    }
  } catch (error) {
    console.error('Test setup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnectionReliability(); 