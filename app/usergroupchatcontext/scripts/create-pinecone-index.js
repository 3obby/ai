// Script to create a Pinecone index for the agent-consult system
const { PineconeClient } = require('@pinecone-database/pinecone');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createPineconeIndex() {
  try {
    console.log('Initializing Pinecone client...');
    const pinecone = new PineconeClient();
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: 'us-east-1-aws' // Updated to use us-east-1-aws
    });
    
    console.log('Pinecone client initialized!');
    
    // List existing indexes
    console.log('Checking existing indexes...');
    const indexList = await pinecone.listIndexes();
    console.log('Current indexes:', indexList);
    
    const indexName = 'agentconsult';
    const dimensions = 1536; // Use 1536 for OpenAI embeddings
    
    // Check if index already exists
    if (indexList.includes(indexName)) {
      console.log(`Index '${indexName}' already exists. No need to create it.`);
      return;
    }
    
    // Create the index
    console.log(`Creating new index '${indexName}'...`);
    
    // Serverless config (AWS)
    const createRequest = {
      name: indexName,
      dimension: dimensions,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    };
    
    await pinecone.createIndex(createRequest);
    console.log(`Index '${indexName}' created successfully!`);
    
    // Wait for the index to be ready
    console.log('Waiting for index to initialize...');
    let isReady = false;
    let attempts = 0;
    
    while (!isReady && attempts < 10) {
      try {
        attempts++;
        console.log(`Checking index status (attempt ${attempts})...`);
        
        // Get the index description
        const indexDescription = await pinecone.describeIndex({
          indexName
        });
        
        console.log('Index status:', indexDescription?.status);
        
        if (indexDescription?.status?.ready) {
          console.log('Index is ready!');
          isReady = true;
        } else {
          // Wait 10 seconds before checking again
          console.log('Index not ready yet, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error) {
        console.error('Error checking index status:', error);
        // Wait 10 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    if (isReady) {
      console.log(`Index '${indexName}' is ready to use.`);
    } else {
      console.log(`Index '${indexName}' may not be fully ready yet. Please check the console for status.`);
    }
  } catch (error) {
    console.error('Error creating Pinecone index:', error);
  }
}

// Run the function
createPineconeIndex(); 