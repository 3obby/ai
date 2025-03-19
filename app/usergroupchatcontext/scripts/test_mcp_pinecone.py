#!/usr/bin/env python3
"""
test_mcp_pinecone.py - Test script to verify Pinecone integration works with MCP environment
"""

import os
import sys
import json
from datetime import datetime
import openai
from pinecone import Pinecone

# Set OpenAI API key - This should be the same key used in MCP configuration
openai_api_key = os.environ.get('OPENAI_API_KEY')
if not openai_api_key:
    print("Error: OPENAI_API_KEY environment variable is not set.")
    print("Please set it before running this script.")
    sys.exit(1)
    
print(f"OpenAI API key (truncated): {openai_api_key[:10]}...{openai_api_key[-5:]}")
openai_client = openai.OpenAI(api_key=openai_api_key)

# Pinecone API key - This should be the same key used in MCP configuration
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
if not PINECONE_API_KEY:
    print("Error: PINECONE_API_KEY environment variable is not set.")
    print("Please set it before running this script.")
    sys.exit(1)

INDEX_NAME = "agentconsult"

print(f"Connecting to Pinecone index '{INDEX_NAME}'...")

try:
    # Initialize Pinecone client
    pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
    pinecone_index = pinecone_client.Index(INDEX_NAME)
    
    # Get index stats
    stats = pinecone_index.describe_index_stats()
    print(f"Index stats: {json.dumps(stats.to_dict(), indent=2)}")
    total_vectors = stats.total_vector_count
    print(f"Total vectors in index: {total_vectors}")
    
    # Test embedding generation
    test_text = "Testing MCP Pinecone integration"
    print(f"Generating embedding for: '{test_text}'")
    
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=test_text
    )
    
    embedding = response.data[0].embedding
    print(f"Successfully generated embedding with dimension: {len(embedding)}")
    
    # Test Pinecone query
    print("Testing Pinecone query...")
    results = pinecone_index.query(
        vector=embedding,
        top_k=1,
        include_metadata=True
    )
    
    print(f"Query results: {json.dumps(results.to_dict(), indent=2)}")
    
    print("\nMCP Pinecone integration test completed successfully!")
    
except Exception as e:
    print(f"Error testing MCP Pinecone integration: {str(e)}")
    sys.exit(1) 