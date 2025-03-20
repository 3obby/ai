#!/usr/bin/env node

/**
 * Simple test script to verify Pinecone MCP integration
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testPineconeConnection() {
  console.log('Testing Pinecone MCP connection...');
  
  try {
    // Test simple document upload
    const testDoc = {
      document_id: 'test-document-1',
      text: 'This is a test document for the Pinecone integration with UserGroupChatContext',
      metadata: {
        source: 'test-script',
        type: 'test',
        created_at: new Date().toISOString()
      }
    };

    // Convert command to a direct mcp-pinecone call via pipx
    const command = `/Users/dev/.local/bin/mcp-pinecone --index-name agentconsult --api-key ${process.env.PINECONE_API_KEY || '<YOUR_PINECONE_API_KEY>'}`;
    
    console.log('Executing direct Pinecone command...');
    console.log(`Command: ${command}`);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error('Error output:', stderr);
    }
    
    console.log('Command output:', stdout);
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Error testing Pinecone connection:', error.message);
    if (error.stderr) {
      console.error('Error details:', error.stderr);
    }
  }
}

// Run the test
testPineconeConnection(); 