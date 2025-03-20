// Direct test of Pinecone JS SDK
require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');

async function testPinecone() {
  console.log('Testing direct connection to Pinecone...');
  
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('PINECONE_API_KEY is not set in environment variables');
    return;
  }
  
  try {
    console.log(`Initializing Pinecone with API key: ${apiKey.substring(0, 5)}...`);
    const pc = new Pinecone({ apiKey });
    
    // List indexes
    console.log('Listing indexes...');
    const indexesList = await pc.listIndexes();
    console.log('Available indexes:', JSON.stringify(indexesList, null, 2));
    
    // Try to get the agentconsult index
    const indexName = 'agentconsult';
    console.log(`Checking if index '${indexName}' exists...`);
    
    // Check if the index exists in the returned list
    if (indexesList.indexes && indexesList.indexes.some(index => index.name === indexName)) {
      console.log(`Index '${indexName}' found!`);
      const index = pc.index(indexName);
      
      // Get stats
      console.log('Getting index stats...');
      const stats = await index.describeIndexStats();
      console.log('Index stats:', JSON.stringify(stats, null, 2));
      
      console.log('\nPinecone connection test successful! ✅');
    } else {
      console.error(`Index '${indexName}' not found! ❌`);
    }
  } catch (error) {
    console.error('Error connecting to Pinecone:', error);
  }
}

// Run the test
testPinecone().catch(console.error); 