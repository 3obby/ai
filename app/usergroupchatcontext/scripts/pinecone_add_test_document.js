// Script to add a test document to Pinecone
require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

async function addTestDocument() {
  console.log('Adding test document to Pinecone...');
  
  // Check environment variables
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!pineconeApiKey || !openaiApiKey) {
    console.error('Missing required API keys. Make sure PINECONE_API_KEY and OPENAI_API_KEY are set.');
    return;
  }
  
  try {
    // Initialize OpenAI
    console.log('Initializing OpenAI...');
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });
    
    // Initialize Pinecone
    console.log('Initializing Pinecone...');
    const pc = new Pinecone({
      apiKey: pineconeApiKey
    });
    
    // Get the index
    const indexName = 'agentconsult';
    const index = pc.index(indexName);
    
    // Test document
    const testDocument = {
      id: 'mcp-test-doc-' + Date.now(),
      text: 'This is a test document created through the MCP-Pinecone integration test.',
      metadata: {
        source: 'mcp-test',
        timestamp: new Date().toISOString()
      }
    };
    
    // Generate embedding from OpenAI
    console.log('Generating embedding...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testDocument.text
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Prepare vector for Pinecone
    const vector = {
      id: testDocument.id,
      values: embedding,
      metadata: {
        ...testDocument.metadata,
        text: testDocument.text
      }
    };
    
    // Upsert to Pinecone
    console.log('Upserting to Pinecone...');
    await index.upsert([vector]);
    
    console.log(`Test document ${testDocument.id} successfully added to Pinecone!`);
    
    // Now let's verify we can retrieve it
    console.log('Retrieving the document to verify...');
    const queryResponse = await index.query({
      vector: embedding,
      topK: 1,
      includeMetadata: true,
    });
    
    console.log('Query results:', JSON.stringify(queryResponse, null, 2));
    
    console.log('\nTest completed successfully! ✅');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
addTestDocument().catch(console.error); 