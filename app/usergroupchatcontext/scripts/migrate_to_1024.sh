#!/bin/bash
# Script to migrate Pinecone index from 1536 to 1024 dimensions

set -e  # Exit on error

echo "=========================================="
echo "Pinecone Migration to 1024-dimensions"
echo "=========================================="

# Load environment variables
if [ -f .env.local ]; then
  echo "Loading environment variables from .env.local..."
  export $(grep -v '^#' .env.local | xargs)
else
  echo "ERROR: .env.local file not found. Please create it with PINECONE_API_KEY and OPENAI_API_KEY"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$PINECONE_API_KEY" ]; then
  echo "ERROR: PINECONE_API_KEY is not set"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "ERROR: OPENAI_API_KEY is not set"
  exit 1
fi

# Step 1: Recreate the Pinecone index with 1024 dimensions
echo -e "\n[Step 1] Recreating Pinecone index with 1024 dimensions..."
node app/usergroupchatcontext/scripts/recreate_pinecone_index.js
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to recreate Pinecone index"
  exit 1
fi

# Step 2: Index the codebase with the new 1024-dimensional embeddings
echo -e "\n[Step 2] Indexing the codebase with 1024-dimensional embeddings..."
node app/usergroupchatcontext/scripts/index-codebase-1024.js
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to index codebase"
  exit 1
fi

# Step 3: Setup the MCP integration
echo -e "\n[Step 3] Setting up MCP integration..."
# Export the required environment variables for MCP
export MCP_PINECONE_API_KEY=$PINECONE_API_KEY
export MCP_PINECONE_INDEX_NAME=agentconsult

echo "Environment variables set for MCP"

# Run the MCP initialization script
python3 app/usergroupchatcontext/scripts/initialize-pinecone-mcp-1024.py
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to initialize MCP Pinecone integration"
  exit 1
fi

# Step 4: Verify the index and MCP connectivity
echo -e "\n[Step 4] Verifying Pinecone index and MCP connectivity..."
node app/usergroupchatcontext/scripts/direct_pinecone_test.js
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to verify Pinecone connectivity"
  exit 1
fi

# Try to reinstall MCP Pinecone package
echo -e "\n[Step 5] Reinstalling the MCP Pinecone package..."
npx -y @smithery/cli@latest uninstall mcp-pinecone --client cursor
npx -y @smithery/cli@latest install mcp-pinecone --client cursor

echo -e "\n=========================================="
echo "Migration complete!"
echo "The Pinecone index has been recreated with 1024 dimensions"
echo "The codebase has been indexed using text-embedding-3-small"
echo "The MCP integration has been configured"
echo -e "===========================================\n"

echo "To verify MCP connectivity, run these commands:"
echo "export MCP_PINECONE_API_KEY=$PINECONE_API_KEY"
echo "export MCP_PINECONE_INDEX_NAME=agentconsult"
echo "Then try using the MCP Pinecone tools" 