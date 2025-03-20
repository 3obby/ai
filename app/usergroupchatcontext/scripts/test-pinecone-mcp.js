#!/usr/bin/env node

/**
 * test-pinecone-mcp.js
 * A simple script to test searching the Pinecone index through the MCP setup
 */

require('dotenv').config({ path: '.env.local' });
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

async function testPineconeSearch() {
  try {
    console.log("=== Testing Pinecone Search ===\n");
    
    // Initialize clients
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    // Get the index
    const index = pinecone.index('agentconsult');
    
    // Get index stats
    console.log("Getting index stats...");
    const stats = await index.describeIndexStats();
    console.log(`Total vectors: ${stats.totalRecordCount}`);
    console.log(`Dimension: ${stats.dimension}`);
    console.log(`Namespaces: ${Object.keys(stats.namespaces).join(', ')}`);
    
    // Generate a test query embedding
    console.log("\nGenerating test query embedding...");
    const queryText = "usergroupchatcontext documentation";
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
      dimensions: 1024
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions`);
    
    // Query the index
    console.log("\nQuerying Pinecone index...");
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });
    
    console.log(`Found ${queryResponse.matches.length} matches`);
    
    // Display results
    console.log("\nTop results:");
    queryResponse.matches.forEach((match, i) => {
      console.log(`\n--- Result ${i+1} (score: ${match.score.toFixed(4)}) ---`);
      console.log(`ID: ${match.id}`);
      console.log(`File: ${match.metadata.filepath}`);
      console.log(`Snippet: ${match.metadata.snippet}`);
    });
    
    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("Error during test:", error);
  }
}

testPineconeSearch().catch(console.error); 