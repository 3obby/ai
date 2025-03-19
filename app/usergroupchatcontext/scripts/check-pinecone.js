// Simple script to check Pinecone connection
const { PineconeClient } = require('@pinecone-database/pinecone');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkPineconeConnection() {
  try {
    console.log('Initializing Pinecone client...');
    console.log(`Using API key: ${process.env.PINECONE_API_KEY.substring(0, 5)}...`);
    
    const pinecone = new PineconeClient();
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: 'us-east-1-aws'
    });
    
    console.log('Pinecone client initialized successfully!');
    
    // List indexes
    console.log('Checking indexes...');
    const indexList = await pinecone.listIndexes();
    console.log('Available indexes:', indexList);
    
    // Check if our index exists
    const indexName = 'agentconsult';
    const indexExists = indexList.includes(indexName);
    console.log(`Index '${indexName}' exists: ${indexExists}`);
    
    if (indexExists) {
      // Get index
      console.log(`Getting index ${indexName}...`);
      const index = pinecone.Index(indexName);
      
      // Mock vector for testing
      const mockVector = Array(1536).fill(0);
      
      try {
        // Try to upsert a test vector
        console.log('Attempting to upsert a test vector...');
        const upsertResponse = await index.upsert({
          upsertRequest: {
            vectors: [
              {
                id: 'test-vector-1',
                values: mockVector,
                metadata: {
                  description: 'Test vector for connection check'
                }
              }
            ],
            namespace: ''
          }
        });
        console.log('Upsert successful!', upsertResponse);
        
        // Wait a moment to ensure the vector is indexed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Then try to query it
        console.log('Attempting to query the test vector...');
        const queryResponse = await index.query({
          queryRequest: {
            vector: mockVector,
            topK: 1,
            includeMetadata: true,
            namespace: ''
          }
        });
        console.log('Query successful!');
        console.log('Number of matches:', queryResponse.matches?.length || 0);
        if (queryResponse.matches?.length > 0) {
          console.log('First match:', JSON.stringify(queryResponse.matches[0], null, 2));
        }
      } catch (error) {
        console.error('Error interacting with Pinecone:', error);
      }
    } else {
      console.log(`Index '${indexName}' doesn't exist yet. You may need to create it first.`);
    }
    
    console.log('Pinecone connection test complete!');
  } catch (error) {
    console.error('Error checking Pinecone connection:', error);
  }
}

// Run the check
checkPineconeConnection(); 