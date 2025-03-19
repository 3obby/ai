import { pineconeService } from '../services/pineconeService';
import { OpenAI } from 'openai';

// Define types for the Pinecone response
interface PineconeMetadata {
  filepath?: string;
  type?: string;
  lastModified?: string;
  [key: string]: any;
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: PineconeMetadata;
}

interface PineconeQueryResponse {
  matches?: PineconeMatch[];
}

/**
 * Simple test script to query the Pinecone database
 * This simulates how a bot would use Pinecone to answer questions about the codebase
 */
async function testPineconeQuery() {
  try {
    console.log('Testing Pinecone query with question: "What\'s the architecture of the AgentConsult project?"');
    
    // Initialize OpenAI client for generating embeddings
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.BRAVE_BASE_AI
    });
    
    // 1. Generate embedding for the question
    console.log('Generating embedding for question...');
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "What's the architecture of the AgentConsult project?"
    });
    
    const questionEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding vector of length: ${questionEmbedding.length}`);
    
    // 2. Query Pinecone with the embedding
    console.log('Querying Pinecone for relevant context...');
    await pineconeService.initialize();
    const searchResults = await pineconeService.queryVectors(questionEmbedding, 3) as PineconeQueryResponse;
    
    // 3. Display the results
    console.log('\nSearch Results from Pinecone:');
    console.log(JSON.stringify(searchResults, null, 2));
    
    // If we have matches, display the relevant content
    if (searchResults.matches && searchResults.matches.length > 0) {
      console.log('\nTop matching files:');
      searchResults.matches.forEach((match, index) => {
        console.log(`\n[${index + 1}] Score: ${match.score} - ${match.metadata?.filepath || 'Unknown file'}`);
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
testPineconeQuery(); 