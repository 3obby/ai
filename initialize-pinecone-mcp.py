#!/usr/bin/env python3
import os
import argparse
from pinecone import Pinecone
import mcp_pinecone
from mcp_pinecone.pinecone import PineconeClient

def main():
    parser = argparse.ArgumentParser(description='Initialize Pinecone for MCP server')
    parser.add_argument('--api-key', default=os.environ.get('PINECONE_API_KEY', 'pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ'), help='Pinecone API key')
    parser.add_argument('--index-name', default='agentconsult', help='Pinecone index name')
    args = parser.parse_args()
    
    print(f"Initializing Pinecone with index: {args.index_name}")
    
    # Initialize Pinecone client
    pc = Pinecone(api_key=args.api_key)
    
    # Check if index exists
    print("Checking if index exists...")
    indexes = pc.list_indexes()
    print(f"Available indexes: {indexes}")
    
    if args.index_name not in indexes:
        print(f"Index {args.index_name} does not exist!")
        return
    
    # Get the index
    index = pc.Index(args.index_name)
    
    # Check index stats
    print("Getting index stats...")
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")
    
    total_vectors = stats.get('total_vector_count', 0)
    print(f"Total vectors in index: {total_vectors}")
    
    if total_vectors == 0:
        print("WARNING: Your index appears to be empty. You may need to run your indexing script first.")
        print("Try running: node app/usergroupchatcontext/scripts/index-codebase.js")
    else:
        print(f"Found {total_vectors} vectors in the index.")
    
    # Initialize MCP Pinecone client
    print("\nInitializing MCP Pinecone client...")
    try:
        pinecone_client = PineconeClient(
            api_key=args.api_key,
            index_name=args.index_name
        )
        print("Successfully initialized MCP Pinecone client!")
    except Exception as e:
        print(f"Failed to initialize MCP Pinecone client: {e}")
        return
    
    print("\nPinecone MCP initialization complete!")
    
    # Update MCP configuration
    print("\nTo use with Cursor, update your ~/.cursor/mcp.json to:")
    print(f"""
{{
  "mcpServers": {{
    "pinecone": {{
      "command": "{os.path.abspath('.pinecone-venv/bin/python3')}",
      "args": ["-m", "mcp_pinecone", "--index-name", "{args.index_name}", "--api-key", "{args.api_key}"]
    }}
  }}
}}
    """)

if __name__ == "__main__":
    main() 