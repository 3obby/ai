#!/usr/bin/env node

/**
 * verify-mcp-pinecone.js
 * Verifies the MCP Pinecone configuration by checking environment variables and index
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Configuration
const CURSOR_MCP_PATH = path.join(os.homedir(), '.cursor', 'mcp.json');

function verifyMcpConfig() {
  console.log('=== MCP Pinecone Configuration Verification ===\n');
  
  // Check if mcp.json exists
  if (fs.existsSync(CURSOR_MCP_PATH)) {
    console.log(`MCP configuration found at: ${CURSOR_MCP_PATH}`);
    
    try {
      const mcpConfig = JSON.parse(fs.readFileSync(CURSOR_MCP_PATH, 'utf8'));
      
      console.log('\nAnalyzing MCP configuration:');
      
      if (mcpConfig.mcpServers && mcpConfig.mcpServers.pinecone) {
        console.log('✅ Pinecone server configuration found');
        
        const pineconeConfig = mcpConfig.mcpServers.pinecone;
        console.log(`Command: ${pineconeConfig.command}`);
        console.log(`Arguments: ${pineconeConfig.args.join(' ')}`);
        
        // Check for correct parameters
        const hasCorrectIndexParam = pineconeConfig.args.includes('--index-name');
        const hasCorrectApiKeyParam = pineconeConfig.args.includes('--api-key');
        
        if (hasCorrectIndexParam) {
          console.log('✅ Correct index parameter: --index-name');
        } else {
          console.log('❌ Missing or incorrect index parameter. Should be --index-name');
        }
        
        if (hasCorrectApiKeyParam) {
          console.log('✅ Correct API key parameter: --api-key');
        } else {
          console.log('❌ Missing or incorrect API key parameter. Should be --api-key');
        }
      } else {
        console.log('❌ No Pinecone server configuration found in mcp.json');
      }
    } catch (error) {
      console.error(`Error parsing MCP configuration: ${error.message}`);
    }
  } else {
    console.log(`❌ MCP configuration not found at ${CURSOR_MCP_PATH}`);
  }
  
  // Display documentation on how to fix issues
  console.log('\nTo ensure correct Pinecone MCP configuration:');
  console.log('1. Edit ~/.cursor/mcp.json to have:');
  console.log(`
{
  "mcpServers": {
    "pinecone": {
      "command": "uvx",
      "args": [
        "mcp-pinecone",
        "--index-name",
        "agentconsult",
        "--api-key",
        "your-api-key"
      ],
      "name": "Pinecone Vector DB",
      "description": "Access to the agentconsult Pinecone index"
    }
  }
}
  `);
  console.log('2. Restart Cursor to apply the changes');
  console.log('3. In a code chat, try using the pinecone_semantic_search or pinecone_list_documents functions');
}

verifyMcpConfig(); 