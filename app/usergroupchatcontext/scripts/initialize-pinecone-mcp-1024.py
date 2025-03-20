#!/usr/bin/env python3
import os
import argparse
from pinecone import Pinecone
import mcp_pinecone
from mcp_pinecone.pinecone import PineconeClient

def main():
    parser = argparse.ArgumentParser(description='Initialize Pinecone for MCP server with 1024 dimensions')
    parser.add_argument('--api-key', default=os.environ.get('PINECONE_API_KEY', ''), help='Pinecone API key')
    parser.add_argument('--index-name', default='agentconsult', help='Pinecone index name')
    args = parser.parse_args()
    
    print(f"Initializing Pinecone with index: {args.index_name} (1024 dimensions)")
    
    # Initialize Pinecone client
    pc = Pinecone(api_key=args.api_key)
    
    # Check if index exists
    print("Checking if index exists...")
    indexes = pc.list_indexes()
    print(f"Available indexes: {indexes}")
    
    index_exists = False
    expected_dimension = 1024
    
    if indexes.indexes:
        for idx in indexes.indexes:
            if idx.name == args.index_name:
                index_exists = True
                dimension = idx.dimension
                if dimension != expected_dimension:
                    print(f"WARNING: Index {args.index_name} exists but has dimension {dimension}, not {expected_dimension}!")
                    print("This may cause issues with the MCP tools which expect 1024 dimensions.")
                    response = input("Do you want to delete and recreate the index with 1024 dimensions? (y/n): ")
                    if response.lower() == 'y':
                        print(f"Deleting index {args.index_name}...")
                        pc.delete_index(args.index_name)
                        index_exists = False
                        print("Index deleted.")
                    else:
                        print("Continuing with existing index configuration.")
                break
    
    # Create index if it doesn't exist
    if not index_exists:
        print(f"Creating index {args.index_name} with {expected_dimension} dimensions...")
        pc.create_index(
            name=args.index_name,
            dimension=expected_dimension,
            metric='cosine',
            spec={
                'pod': {
                    'environment': 'us-east-1-aws',
                    'pod_type': 'p1.x1',
                    'pods': 1
                }
            }
        )
        print(f"Index {args.index_name} created with {expected_dimension} dimensions.")
        print("Waiting for index to initialize... (This may take a minute)")
        # We'd normally wait here, but for simplicity we'll just continue
    
    # Get the index
    index = pc.Index(args.index_name)
    
    # Check index stats
    print("Getting index stats...")
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")
    
    total_vectors = stats.total_vector_count
    print(f"Total vectors in index: {total_vectors}")
    
    if total_vectors == 0:
        print("WARNING: Your index appears to be empty. You may need to run your indexing script first.")
        print("Try running: node app/usergroupchatcontext/scripts/index-codebase-1024.js")
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
    
    # Export the environment variables for use with MCP
    print("\nRun the following commands to set up the MCP environment variables:")
    print(f"export MCP_PINECONE_API_KEY={args.api_key}")
    print(f"export MCP_PINECONE_INDEX_NAME={args.index_name}")
    
    # Update MCP configuration
    print("\nTo use with Cursor, update your ~/.cursor/mcp.json to:")
    print(f"""
{{
  "mcpServers": {{
    "pinecone": {{
      "command": "{os.path.abspath('.pinecone-venv/bin/python3')}",
      "args": ["-m", "mcp_pinecone", "--index", "{args.index_name}", "--api-key", "{args.api_key}"]
    }}
  }}
}}
    """)

if __name__ == "__main__":
    main() 