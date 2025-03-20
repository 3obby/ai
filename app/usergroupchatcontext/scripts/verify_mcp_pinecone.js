// Script to verify Pinecone MCP integration after migration
require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');

async function verifyPinecone() {
  console.log('\n=== Pinecone Migration Verification ===\n');
  
  // Check environment variables
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const mcpPineconeApiKey = process.env.MCP_PINECONE_API_KEY;
  const mcpIndexName = process.env.MCP_PINECONE_INDEX_NAME;
  
  console.log('Environment variables:');
  console.log(`- PINECONE_API_KEY: ${pineconeApiKey ? '✓ Set' : '✗ Not set'}`);
  console.log(`- MCP_PINECONE_API_KEY: ${mcpPineconeApiKey ? '✓ Set' : '✗ Not set'}`);
  console.log(`- MCP_PINECONE_INDEX_NAME: ${mcpIndexName ? '✓ Set' : '✗ Not set'}`);
  
  if (!pineconeApiKey) {
    console.error('ERROR: PINECONE_API_KEY is not set');
    process.exit(1);
  }
  
  // Initialize Pinecone client
  console.log('\nConnecting to Pinecone...');
  const pc = new Pinecone({ apiKey: pineconeApiKey });
  
  // List indexes
  try {
    console.log('Listing Pinecone indexes...');
    const indexes = await pc.listIndexes();
    console.log(`Found ${indexes.indexes?.length || 0} indexes`);
    
    const indexList = indexes.indexes?.map(index => `${index.name} (${index.dimension} dimensions)`) || [];
    console.log(`Available indexes: ${indexList.join(', ')}`);
    
    // Check if our index exists
    const agentConsultIndex = indexes.indexes?.find(index => index.name === 'agentconsult');
    if (agentConsultIndex) {
      console.log(`\nFound 'agentconsult' index with ${agentConsultIndex.dimension} dimensions`);
      
      if (agentConsultIndex.dimension === 1024) {
        console.log('✅ SUCCESS: Index has been migrated to 1024 dimensions');
      } else {
        console.log(`⚠️ WARNING: Index dimension is ${agentConsultIndex.dimension}, expected 1024`);
      }
      
      // Get index stats
      console.log('\nGetting index stats...');
      const index = pc.index('agentconsult');
      const stats = await index.describeIndexStats();
      
      console.log(`Total vectors: ${stats.totalRecordCount}`);
      console.log(`Index dimension: ${stats.dimension}`);
      
      if (stats.totalRecordCount > 0) {
        console.log('✅ SUCCESS: Index contains vectors');
      } else {
        console.log('⚠️ WARNING: Index is empty');
      }
    } else {
      console.log('❌ ERROR: agentconsult index not found');
    }
  } catch (error) {
    console.error('Error connecting to Pinecone:', error);
    process.exit(1);
  }
  
  console.log('\nMCP setup instructions:');
  console.log('1. Ensure these environment variables are set:');
  console.log('   export MCP_PINECONE_API_KEY=$PINECONE_API_KEY');
  console.log('   export MCP_PINECONE_INDEX_NAME=agentconsult');
  console.log('2. Restart Cursor after the migration completes');
  console.log('3. Try using the MCP Pinecone tools in Claude');
}

// Run the verification
verifyPinecone().catch(console.error); 