// Script to recreate the Pinecone index with 1024 dimensions
require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');

async function recreateIndex() {
  console.log('Starting Pinecone index recreation process...');
  
  // Check for API key
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('ERROR: PINECONE_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  // Initialize Pinecone client
  console.log('Initializing Pinecone client...');
  const pc = new Pinecone({ apiKey });
  
  const indexName = 'agentconsult';
  
  // List existing indexes
  console.log('Checking existing indexes...');
  const indexList = await pc.listIndexes();
  console.log('Current indexes:', indexList);
  
  // Check if our index exists
  const indexExists = indexList.indexes && indexList.indexes.some(index => index.name === indexName);
  
  if (indexExists) {
    console.log(`Index '${indexName}' exists. Deleting it...`);
    
    try {
      await pc.deleteIndex(indexName);
      console.log(`Successfully deleted index '${indexName}'`);
      
      // Wait a bit for the deletion to propagate
      console.log('Waiting 10 seconds for deletion to propagate...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`Error deleting index: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(`Index '${indexName}' does not exist.`);
  }
  
  // Create new index with 1024 dimensions
  console.log(`Creating new index '${indexName}' with 1024 dimensions...`);
  try {
    await pc.createIndex({
      name: indexName,
      dimension: 1024,
      metric: 'cosine',
      spec: {
        pod: {
          environment: 'us-east-1-aws',
          podType: 'p1.x1',
          pods: 1
        }
      }
    });
    
    console.log(`Successfully created index '${indexName}' with 1024 dimensions`);
    console.log('Waiting 45 seconds for the index to initialize...');
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    // Verify the index was created
    const updatedIndexList = await pc.listIndexes();
    const newIndex = updatedIndexList.indexes && updatedIndexList.indexes.find(index => index.name === indexName);
    
    if (newIndex) {
      console.log(`Verified index creation. Dimension: ${newIndex.dimension}`);
    } else {
      console.error('Could not verify index creation. Please check Pinecone console.');
    }
  } catch (error) {
    console.error(`Error creating index: ${error.message}`);
    process.exit(1);
  }
  
  console.log('\nIndex recreation completed successfully!');
  console.log('Next step: Run the indexing scripts to populate the index with 1024-dimensional embeddings.');
}

// Run the recreation process
recreateIndex().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 