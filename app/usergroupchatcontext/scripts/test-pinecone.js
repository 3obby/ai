// CommonJS script to test Pinecone query
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: '.env.local' });

// Configure clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new PineconeClient();

async function testPineconeQuery() {
  try {
    console.log('Testing Pinecone query with question: "What\'s the architecture of the AgentConsult project?"');
    
    // 1. Generate embedding for the question
    console.log('Generating embedding for question...');
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "What's the architecture of the AgentConsult project?"
    });
    
    const questionEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding vector of length: ${questionEmbedding.length}`);
    
    // 2. Initialize Pinecone client
    console.log('Initializing Pinecone client...');
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: 'us-east-1-aws'
    });
    
    // 3. Query Pinecone with the embedding
    console.log('Querying Pinecone for relevant context...');
    const index = pinecone.Index('agentconsult');
    
    const searchResults = await index.query({
      queryRequest: {
        vector: questionEmbedding,
        topK: 5,
        includeMetadata: true,
        namespace: ''
      }
    });
    
    // 4. Display the results
    console.log('\nSearch Results from Pinecone:');
    console.log(JSON.stringify(searchResults, null, 2));
    
    // If we have matches, display the relevant content
    if (searchResults.matches && searchResults.matches.length > 0) {
      console.log('\nTop matching files:');
      searchResults.matches.forEach((match, index) => {
        console.log(`\n[${index + 1}] Score: ${match.score}`);
        if (match.metadata) {
          console.log(`  File: ${match.metadata.filepath || 'Unknown'}`);
          console.log(`  Snippet: ${match.metadata.snippet || ''}`);
        }
      });
    } else {
      console.log('\nNo matches found. The index may be empty or the query didn\'t match any content.');
      console.log('Make sure you\'ve run the indexing process with: node app/usergroupchatcontext/scripts/index-codebase.js');
    }
    
  } catch (error) {
    console.error('Error testing Pinecone query:', error);
  }
}

// Run the test
testPineconeQuery(); 