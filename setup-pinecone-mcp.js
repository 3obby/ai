#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const API_KEY = 'pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ';
const INDEX_NAME = 'agentconsult';
const VENV_DIR = path.join(process.cwd(), '.pinecone-venv');
const CURSOR_MCP_PATH = path.join(os.homedir(), '.cursor', 'mcp.json');

// Make sure virtual environment exists
if (!fs.existsSync(VENV_DIR)) {
  console.log('Creating Python virtual environment...');
  execSync('python3 -m venv .pinecone-venv');
}

// Install required packages
try {
  console.log('Installing required packages...');
  execSync(`${path.join(VENV_DIR, 'bin', 'pip')} install mcp-pinecone --upgrade`, { stdio: 'inherit' });
  console.log('Installed mcp-pinecone successfully');
} catch (error) {
  console.error('Failed to install packages:', error);
  process.exit(1);
}

// Get the Python interpreter path
const pythonPath = path.join(VENV_DIR, 'bin', 'python');

// Read existing MCP configuration
let mcpConfig = { mcpServers: {} };
if (fs.existsSync(CURSOR_MCP_PATH)) {
  try {
    mcpConfig = JSON.parse(fs.readFileSync(CURSOR_MCP_PATH, 'utf8'));
  } catch (error) {
    console.warn('Failed to parse existing MCP config, creating new one.');
  }
}

// Add or update Pinecone MCP server
mcpConfig.mcpServers = {
  ...mcpConfig.mcpServers,
  'pinecone': {
    command: pythonPath,
    args: [
      '-m',
      'mcp_pinecone',
      '--index-name',
      INDEX_NAME,
      '--api-key',
      API_KEY
    ],
    name: 'Pinecone Vector DB',
    description: 'Access to the agentconsult Pinecone index'
  }
};

// Write updated configuration
try {
  fs.writeFileSync(CURSOR_MCP_PATH, JSON.stringify(mcpConfig, null, 2));
  console.log(`Updated MCP configuration at ${CURSOR_MCP_PATH}`);
  console.log('Configuration:');
  console.log(JSON.stringify(mcpConfig, null, 2));
} catch (error) {
  console.error('Failed to write MCP configuration:', error);
  process.exit(1);
}

console.log('\nSetup complete! Please restart Cursor to apply the changes.');
console.log('To test the MCP server, run:');
console.log(`${pythonPath} -m mcp_pinecone --index-name ${INDEX_NAME} --api-key ${API_KEY}`);

// Test the server setup
try {
  console.log('\nVerifying MCP server setup...');
  const testResult = execSync(`cd ${VENV_DIR} && source bin/activate && python -c "import mcp_pinecone; print('mcp-pinecone successfully imported')"`, { encoding: 'utf8' });
  console.log(testResult);
  console.log('MCP server setup verified successfully.');
  console.log('Please restart Cursor for the changes to take effect.');
} catch (error) {
  console.error('Error verifying MCP server setup:', error);
  console.warn('You may need to restart Cursor and check if the MCP appears in the list.');
} 