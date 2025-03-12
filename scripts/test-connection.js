// Test database connection
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Testing database connection...');
  
  const prisma = new PrismaClient();
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Successfully connected to database!');
    
    // Try a simple query
    console.log('Executing a simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Query result:', result);
    
    console.log('Connection test successful!');
  } catch (error) {
    console.error('Connection error:', error);
    console.error('Error message:', error.message);
    
    // If it's a connection error, provide more details
    if (error.message.includes('Can\'t reach database server')) {
      console.error('\nPossible causes:');
      console.error('1. The database server is not running');
      console.error('2. The database server is not accessible from your network');
      console.error('3. Firewall is blocking the connection');
      console.error('4. VPN settings may be interfering');
      console.error('5. The DATABASE_URL in .env.local might be incorrect');
      
      console.error('\nTry these solutions:');
      console.error('1. Check if your DATABASE_URL is correct in .env.local');
      console.error('2. Try connecting to the database using a different tool like psql');
      console.error('3. Check if you need to use a VPN to access the database');
      console.error('4. Try setting up a local database for development');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 