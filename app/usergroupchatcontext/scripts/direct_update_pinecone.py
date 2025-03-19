#!/usr/bin/env python3
"""
direct_update_pinecone.py - Updates Pinecone index with usergroupchatcontext files using the SDK directly
"""

import os
import sys
import json
import time
import hashlib
from datetime import datetime
import openai
from pinecone import Pinecone

# Constants
DIRECTORY_TO_INDEX = '/Users/dev/code/agentconsult/app/usergroupchatcontext'
CHUNK_SIZE = 500  # tokens (approximate)
CHUNK_OVERLAP = 100  # tokens of overlap between chunks
EXTENSIONS_TO_INDEX = ['.ts', '.tsx', '.js', '.jsx', '.md', '.txt', '.css']
IGNORE_DIRS = ['.git', 'node_modules', '__pycache__']
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

def get_file_hash(file_path):
    """Calculate SHA-256 hash of a file to detect changes"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def should_index_file(file_path):
    """Determine if we should index this file based on extension and ignore list"""
    _, ext = os.path.splitext(file_path)
    
    # Check file extension
    if ext not in EXTENSIONS_TO_INDEX:
        return False
    
    # Check if file is in ignored directory
    for ignore_dir in IGNORE_DIRS:
        if f"/{ignore_dir}/" in file_path:
            return False
    
    return True

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split text into chunks of approximately chunk_size tokens with overlap"""
    # Very rough approximation: 1 token ≈ 4 characters for English text
    char_size = chunk_size * 4
    char_overlap = overlap * 4
    
    if len(text) <= char_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + char_size
        
        if end >= len(text):
            chunks.append(text[start:])
            break
        
        # Try to find a good break point (newline or period)
        # Look for paragraph break first (empty line)
        paragraph_break = text.find('\n\n', end - char_overlap, end + char_overlap)
        if paragraph_break != -1:
            chunks.append(text[start:paragraph_break].strip())
            start = paragraph_break
            continue
            
        # Try to find a sentence break (period followed by space)
        sentence_break = text.find('. ', end - char_overlap, end + char_overlap)
        if sentence_break != -1:
            chunks.append(text[start:sentence_break+1].strip())
            start = sentence_break + 1
            continue
            
        # Fall back to a line break
        line_break = text.find('\n', end - char_overlap, end + char_overlap)
        if line_break != -1:
            chunks.append(text[start:line_break].strip())
            start = line_break
            continue
            
        # If no good break point, just chunk at char_size with overlap
        chunks.append(text[start:end].strip())
        start = end - char_overlap
    
    return chunks

def get_relative_path(file_path):
    """Get the path relative to the indexing directory"""
    return file_path.replace(DIRECTORY_TO_INDEX, '').lstrip('/')

def create_metadata(file_path):
    """Create rich metadata for a file"""
    relative_path = get_relative_path(file_path)
    file_name = os.path.basename(file_path)
    file_dir = os.path.dirname(relative_path)
    _, ext = os.path.splitext(file_path)
    
    # Get file stats
    stats = os.stat(file_path)
    modified_time = datetime.fromtimestamp(stats.st_mtime).isoformat()
    
    # Determine file type/category
    file_type = "unknown"
    if ext in ['.ts', '.tsx', '.js', '.jsx']:
        if 'components' in file_path:
            file_type = "component"
        elif 'hooks' in file_path:
            file_type = "hook"
        elif 'context' in file_path:
            file_type = "context"
        elif 'utils' in file_path:
            file_type = "utility"
        elif 'services' in file_path:
            file_type = "service"
        elif 'types' in file_path:
            file_type = "type_definition"
        else:
            file_type = "code"
    elif ext == '.md':
        file_type = "documentation"
    elif ext == '.css':
        file_type = "style"
    elif ext == '.txt':
        file_type = "text"
    
    return {
        "file_path": relative_path,
        "file_name": file_name,
        "directory": file_dir,
        "extension": ext,
        "file_type": file_type,
        "last_modified": modified_time,
        "file_hash": get_file_hash(file_path),
        "source": "usergroupchatcontext"
    }

def read_file_content(file_path):
    """Read file content, handling different encodings"""
    encodings = ['utf-8', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    
    print(f"WARNING: Could not decode {file_path} with any encoding")
    return ""

def index_file(file_path):
    """Index a single file in Pinecone"""
    if not should_index_file(file_path):
        return False
    
    print(f"Indexing {file_path}...")
    
    # Read file content
    content = read_file_content(file_path)
    if not content:
        return False
    
    # Create base metadata
    metadata = create_metadata(file_path)
    
    # Generate a unique document ID base
    base_doc_id = f"usergroupchatcontext-{metadata['file_type']}-{metadata['file_name']}"
    
    # Chunk content and index each chunk
    chunks = chunk_text(content)
    success = True
    
    vectors_to_upsert = []
    
    for i, chunk in enumerate(chunks):
        # Create a unique document ID for each chunk
        doc_id = f"{base_doc_id}-chunk-{i+1}"
        
        # Add chunk-specific metadata
        chunk_metadata = metadata.copy()
        chunk_metadata.update({
            "chunk_index": i+1,
            "total_chunks": len(chunks),
            "text": chunk  # Store the actual text in metadata for retrieval
        })
        
        # Get embedding for the chunk
        embedding = get_embedding(chunk)
        if not embedding:
            print(f"Failed to get embedding for {doc_id}")
            success = False
            continue
        
        # Add to vectors to upsert
        vectors_to_upsert.append({
            "id": doc_id,
            "values": embedding,
            "metadata": chunk_metadata
        })
        
        # Upsert in batches of 100 to avoid rate limits
        if len(vectors_to_upsert) >= 100:
            try:
                pinecone_index.upsert(vectors=vectors_to_upsert)
                print(f"Uploaded batch of {len(vectors_to_upsert)} vectors")
                vectors_to_upsert = []
                time.sleep(0.2)  # Brief pause to avoid rate limits
            except Exception as e:
                print(f"Error upserting vectors: {e}")
                success = False
    
    # Upsert any remaining vectors
    if vectors_to_upsert:
        try:
            pinecone_index.upsert(vectors=vectors_to_upsert)
            print(f"Uploaded final batch of {len(vectors_to_upsert)} vectors")
        except Exception as e:
            print(f"Error upserting final batch: {e}")
            success = False
    
    return success

def index_directory(directory_path=DIRECTORY_TO_INDEX):
    """Recursively index all files in a directory"""
    success_count = 0
    failure_count = 0
    
    for root, dirs, files in os.walk(directory_path):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = os.path.join(root, file)
            if index_file(file_path):
                success_count += 1
            else:
                failure_count += 1
                
            # Print stats every 10 files
            if (success_count + failure_count) % 10 == 0:
                print(f"Progress: {success_count + failure_count} files processed ({success_count} successful, {failure_count} failed)")
    
    print(f"Indexed {success_count} files successfully with {failure_count} failures")

if __name__ == "__main__":
    print(f"Starting to index {DIRECTORY_TO_INDEX} in Pinecone...")
    
    # Check Pinecone index
    try:
        stats = pinecone_index.describe_index_stats()
        print(f"Index stats before indexing: {json.dumps(stats.to_dict(), indent=2)}")
    except Exception as e:
        print(f"Error getting index stats: {e}")
    
    # Index directory
    index_directory()
    
    # Check Pinecone index again
    try:
        stats = pinecone_index.describe_index_stats()
        print(f"Index stats after indexing: {json.dumps(stats.to_dict(), indent=2)}")
    except Exception as e:
        print(f"Error getting index stats: {e}")
    
    print("Indexing complete.") 