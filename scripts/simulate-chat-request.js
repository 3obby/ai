// Simulate the database query from the chat page
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function simulateChatPageRequest() {
  console.log('Simulating chat page request...');
  
  // Get a chatId for testing - either from .env or generate a random one
  let chatId = process.env.TEST_CHAT_ID;
  if (!chatId) {
    // Generate a random UUID-like string
    chatId = 'test-' + Math.random().toString(36).substring(2, 15);
    console.log(`No TEST_CHAT_ID in .env, using random ID: ${chatId}`);
  }
  
  const prisma = new PrismaClient();
  
  try {
    console.log(`Looking up companion with ID: ${chatId}`);
    
    // This replicates the query from chat/[chatId]/page.tsx
    const companion = await prisma.companion.findUnique({
      where: {
        id: chatId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          where: {
            userId: 'anonymous-test-user',
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
    
    if (companion) {
      console.log('Found companion:', {
        id: companion.id,
        name: companion.name,
        messageCount: companion._count.messages
      });
    } else {
      console.log('No companion found with that ID. This is expected if using a random ID.');
      
      // Try a more general query to at least see if we can access the database
      console.log('Trying to fetch any companion...');
      const anyCompanion = await prisma.companion.findFirst();
      
      if (anyCompanion) {
        console.log('Successfully found at least one companion:', {
          id: anyCompanion.id,
          name: anyCompanion.name
        });
      } else {
        console.log('No companions found in the database.');
      }
    }
    
    console.log('Database connection working correctly!');
  } catch (error) {
    console.error('Error during database access:', error);
    
    if (error.message.includes("Can't reach database server")) {
      console.error('\nDatabase connection failure detected!');
      console.error('\nThis matches the error you\'re seeing in the application.');
      console.error('\nPossible causes:');
      console.error('1. Temporary network disruption');
      console.error('2. VPN connection issue');
      console.error('3. Database server is under heavy load or has connection limits');
      console.error('4. Firewall or security group rules blocking access');
      
      // Check if retry logic is enabled
      const envFile = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        if (!envContent.includes('ENABLE_DB_CONNECTION_RETRIES=true')) {
          console.error('\nYou should enable database connection retries:');
          console.error('Add to your .env.local:');
          console.error('ENABLE_DB_CONNECTION_RETRIES=true');
          console.error('DB_MAX_RETRIES=3');
          console.error('DB_RETRY_DELAY_MS=1000');
        } else {
          console.error('\nConnection retries are enabled, but still failing after multiple attempts.');
          console.error('This suggests a more persistent network or access issue.');
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

simulateChatPageRequest(); 