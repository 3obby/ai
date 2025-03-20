#!/usr/bin/env python3
"""
direct_pinecone_test.py - Direct test of Pinecone SDK without using MCP
"""

import os
import sys
import json
import time
from datetime import datetime
import openai
from pinecone import Pinecone, ServerlessSpec

# Your Pinecone API key and index name
PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
if not PINECONE_API_KEY:
    print("Error: PINECONE_API_KEY environment variable is not set.")
    print("Please set it before running this script.")
    sys.exit(1)

INDEX_NAME = "agentconsult"

# Initialize OpenAI for embeddings - strip quotes if present in env var
openai_api_key = os.environ.get('OPENAI_API_KEY', '')
if openai_api_key.startswith('"') and openai_api_key.endswith('"'):
    openai_api_key = openai_api_key[1:-1]
    
print(f"OpenAI API key (truncated): {openai_api_key[:10]}...{openai_api_key[-5:]}")
openai_client = openai.OpenAI(api_key=openai_api_key)

def get_embedding(text):
    """Get embeddings from OpenAI"""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def init_pinecone():
    """Initialize Pinecone client and check if index exists"""
    try:
        print(f"Initializing Pinecone with API key: {PINECONE_API_KEY[:5]}...{PINECONE_API_KEY[-5:]}")
        pc = Pinecone(api_key=PINECONE_API_KEY)
        
        # List indexes to see if our index exists
        indexes = pc.list_indexes()
        print(f"Available indexes: {indexes}")
        
        if any(index.name == INDEX_NAME for index in indexes):
            print(f"Index '{INDEX_NAME}' found!")
            index = pc.Index(INDEX_NAME)
            return index
        else:
            print(f"Index '{INDEX_NAME}' not found. Creating it...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            print(f"Waiting for index creation...")
            time.sleep(60)  # Wait for index to be created
            return pc.Index(INDEX_NAME)
            
    except Exception as e:
        print(f"Error initializing Pinecone: {e}")
        return None

def add_test_document(index):
    """Add a test document to Pinecone"""
    try:
        # Sample text
        test_text = "UserGroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice."
        
        # Generate embedding
        embedding = get_embedding(test_text)
        if not embedding:
            return False
        
        # Create vector
        vector = {
            "id": "direct-test-doc-1",
            "values": embedding,
            "metadata": {
                "text": test_text,
                "source": "direct_test",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Upsert to Pinecone
        print(f"Upserting test vector to Pinecone...")
        index.upsert(vectors=[vector])
        
        print(f"Test vector uploaded successfully!")
        return True
    except Exception as e:
        print(f"Error adding test document: {e}")
        return False

def query_test_document(index):
    """Query for the test document to verify it was added"""
    try:
        # Sample query text
        query_text = "mobile chat interface"
        
        # Generate embedding
        query_embedding = get_embedding(query_text)
        if not query_embedding:
            return False
        
        # Query Pinecone
        print(f"Querying Pinecone for '{query_text}'...")
        results = index.query(
            vector=query_embedding,
            top_k=3,
            include_metadata=True
        )
        
        print(f"Query results: {json.dumps(results.to_dict(), indent=2)}")
        return True
    except Exception as e:
        print(f"Error querying Pinecone: {e}")
        return False

def main():
    """Main function to test Pinecone directly"""
    print("Starting direct Pinecone test...")
    
    # Initialize Pinecone
    index = init_pinecone()
    if not index:
        print("Failed to initialize Pinecone!")
        return
    
    # Get index stats
    try:
        stats = index.describe_index_stats()
        print(f"Index stats: {json.dumps(stats.to_dict(), indent=2)}")
    except Exception as e:
        print(f"Error getting index stats: {e}")
    
    # Add test document
    if add_test_document(index):
        # Query to verify
        query_test_document(index)
    
    print("Direct Pinecone test completed!")

if __name__ == "__main__":
    main() 