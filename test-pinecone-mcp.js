const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Configure your MCP server command and args
const command = '/opt/homebrew/bin/uvx';
const args = [
  'mcp-pinecone',
  '--index-name',
  'agentconsult',
  '--api-key',
  process.env.PINECONE_API_KEY || '<YOUR_PINECONE_API_KEY>'
];

console.log('Creating transport...');
const transport = new StdioClientTransport({
  command,
  args
});

// Create MCP client
const client = new Client({
  name: 'Test Client',
  version: '1.0.0'
});

// Test connection
async function testConnection() {
  try {
    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('Connected successfully!');
    
    console.log('Listing available tools...');
    const tools = await client.listTools();
    console.log('Available tools:', tools);
    
    if (tools && Array.isArray(tools)) {
      console.log('Tool names:', tools.map(t => t.name).join(', '));
      
      console.log('Testing server with a semantic search call...');
      try {
        const result = await client.callTool('semantic-search', { 
          query: 'What is the UserGroupChatContext component?',
          topK: 3
        });
        console.log('Search result:', JSON.stringify(result, null, 2));
      } catch (toolError) {
        console.error('Tool call error:', toolError);
      }
    } else {
      console.log('Tools response is not an array:', typeof tools);
    }
    
    // Close the connection
    console.log('Closing connection...');
    await client.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Connection error:', error);
  }
}

// Run the test
testConnection().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}).finally(() => {
  console.log('Test completed');
}); 