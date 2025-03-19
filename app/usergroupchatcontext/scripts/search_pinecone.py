#!/usr/bin/env python3
"""
search_pinecone.py - Search Pinecone index directly using the SDK
"""

import os
import sys
import json
import argparse
from datetime import datetime
import openai
from pinecone import Pinecone

# Constants
PINECONE_API_KEY = "pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ"
INDEX_NAME = "agentconsult"

# Initialize OpenAI for embeddings
openai_api_key = os.environ.get('OPENAI_API_KEY', '')
if openai_api_key.startswith('"') and openai_api_key.endswith('"'):
    openai_api_key = openai_api_key[1:-1]
    
print(f"OpenAI API key (truncated): {openai_api_key[:10]}...{openai_api_key[-5:]}")
openai_client = openai.OpenAI(api_key=openai_api_key)

# Initialize Pinecone client
pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
pinecone_index = pinecone_client.Index(INDEX_NAME)

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

def search_pinecone(query, top_k=5, filter_dict=None):
    """Search Pinecone for similar content"""
    try:
        print(f"Searching for: {query}")
        
        # Generate embedding for query
        query_embedding = get_embedding(query)
        if not query_embedding:
            print("Failed to generate embedding for query")
            return None
        
        # Search Pinecone
        results = pinecone_index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict
        )
        
        return results
    except Exception as e:
        print(f"Error searching Pinecone: {e}")
        return None

def display_results(results):
    """Display search results in a formatted way"""
    if not results or not results.matches:
        print("No results found.")
        return
    
    print(f"\nFound {len(results.matches)} results:")
    print("-" * 80)
    
    for i, match in enumerate(results.matches):
        print(f"Result {i+1} (Score: {match.score:.4f}):")
        print(f"ID: {match.id}")
        
        if hasattr(match, 'metadata') and match.metadata:
            # Print file information
            if 'file_path' in match.metadata:
                print(f"File: {match.metadata.get('file_path', 'Unknown')}")
            if 'file_type' in match.metadata:
                print(f"Type: {match.metadata.get('file_type', 'Unknown')}")
            
            # Print the actual text content
            if 'text' in match.metadata:
                print("\nContent:")
                print("-" * 40)
                print(match.metadata['text'])
                print("-" * 40)
        
        print("-" * 80)

def filter_by_file_type(file_type):
    """Create a filter dictionary for a specific file type"""
    return {
        "file_type": file_type
    }

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Search Pinecone index for similar content')
    
    # Required query argument
    parser.add_argument('query', nargs='?', help='Search query')
    
    # Optional arguments
    parser.add_argument('--file-type', '-f', help='Filter by file type')
    parser.add_argument('--limit', '-k', type=int, default=5, help='Maximum number of results (default: 5)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show more detailed output')
    
    return parser.parse_args()

def main():
    """Main function for searching Pinecone"""
    # Parse command line arguments
    args = parse_args()
    
    # Get index stats
    try:
        stats = pinecone_index.describe_index_stats()
        print(f"Index stats: {json.dumps(stats.to_dict(), indent=2)}")
        total_vectors = stats.total_vector_count
        print(f"Total vectors in index: {total_vectors}")
    except Exception as e:
        print(f"Error getting index stats: {e}")
        return
    
    # Get search query
    query = args.query
    if not query:
        query = input("Enter search query: ")
    
    # Set up filter if needed
    filter_dict = None
    if args.file_type:
        filter_dict = filter_by_file_type(args.file_type)
        print(f"Filtering by file type: {args.file_type}")
    
    # Search Pinecone
    results = search_pinecone(query, top_k=args.limit, filter_dict=filter_dict)
    
    # Display results
    if results:
        display_results(results)
    else:
        print("Search failed or returned no results.")

if __name__ == "__main__":
    main() 