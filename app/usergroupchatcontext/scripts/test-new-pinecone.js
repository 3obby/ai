// Test script for the new Pinecone integration
require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

async function testPineconeDirectly() {
  try {
    console.log('Testing direct Pinecone connection with the latest SDK...');
    
    // Initialize the Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || 'pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ'
    });
    
    // Initialize OpenAI client for generating embeddings
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.BRAVE_BASE_AI
    });
    
    // Generate embedding for the test question
    console.log('Generating embedding for test question...');
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "What's the architecture of the AgentConsult project?"
    });
    
    const questionEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding vector of length: ${questionEmbedding.length}`);
    
    // Access the index
    const indexName = 'agentconsult';
    console.log(`Targeting Pinecone index: ${indexName}`);
    const index = pinecone.index(indexName);
    
    // Query Pinecone with the embedding
    console.log('Querying Pinecone for relevant context...');
    const searchResults = await index.query({
      vector: questionEmbedding,
      topK: 3,
      includeMetadata: true
    });
    
    // Display the results
    console.log('\nSearch Results from Pinecone:');
    console.log(JSON.stringify(searchResults, null, 2));
    
    // If we have matches, display the relevant content
    if (searchResults.matches && searchResults.matches.length > 0) {
      console.log('\nTop matching files:');
      searchResults.matches.forEach((match, index) => {
        console.log(`\n[${index + 1}] Score: ${match.score}`);
        if (match.metadata) {
          console.log(`  File: ${match.metadata.filepath || 'Unknown'}`);
          console.log(`  Snippet: ${match.metadata.snippet?.substring(0, 100) || ''}`);
        }
      });
    } else {
      console.log('\nNo matches found. The index may be empty or the query didn\'t match any content.');
      console.log('Make sure you\'ve run the indexing process with: npm run cursor:index');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing Pinecone query:', error);
    process.exit(1);
  }
}

// Run the test
testPineconeDirectly(); 