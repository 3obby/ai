// Simple script to test Pinecone environment variables

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

console.log('Testing Pinecone environment variables...');

// Check PINECONE_API_KEY
const apiKey = process.env.PINECONE_API_KEY;
if (!apiKey) {
  console.error('❌ PINECONE_API_KEY is not set in environment variables');
  console.log('Make sure to set PINECONE_API_KEY in your .env.local file or environment');
} else {
  console.log(`✅ PINECONE_API_KEY is set (first few chars: ${apiKey.substring(0, 5)}...)`);
}

// Check OpenAI API key (needed for embeddings)
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error('❌ OPENAI_API_KEY is not set in environment variables');
  console.log('Make sure to set OPENAI_API_KEY in your .env.local file or environment');
} else {
  console.log(`✅ OPENAI_API_KEY is set (first few chars: ${openaiKey.substring(0, 5)}...)`);
}

console.log('\nEnvironment test completed. If both keys are present, your scripts should work!'); 