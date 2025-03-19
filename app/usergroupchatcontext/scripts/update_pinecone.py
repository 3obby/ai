#!/usr/bin/env python3
"""
update_pinecone.py - Script to index usergroupchatcontext files in Pinecone
"""

import os
import sys
import json
import time
import subprocess
from datetime import datetime
import hashlib

# Constants
DIRECTORY_TO_INDEX = '/Users/dev/code/agentconsult/app/usergroupchatcontext'
CHUNK_SIZE = 500  # tokens (approximate)
CHUNK_OVERLAP = 100  # tokens of overlap between chunks
EXTENSIONS_TO_INDEX = ['.ts', '.tsx', '.js', '.jsx', '.md', '.txt', '.css']
IGNORE_DIRS = ['.git', 'node_modules', '__pycache__']
INDEX_NAME = "agentconsult"  # Make sure this matches your Pinecone index name

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
        return
    
    print(f"Indexing {file_path}...")
    
    # Read file content
    content = read_file_content(file_path)
    if not content:
        return
    
    # Create base metadata
    metadata = create_metadata(file_path)
    
    # Generate a unique document ID based on file path
    base_doc_id = f"usergroupchatcontext-{metadata['file_type']}-{metadata['file_name']}"
    
    # Chunk content and index each chunk
    chunks = chunk_text(content)
    
    for i, chunk in enumerate(chunks):
        # Create a unique document ID for each chunk
        doc_id = f"{base_doc_id}-chunk-{i+1}"
        
        # Add chunk-specific metadata
        chunk_metadata = metadata.copy()
        chunk_metadata.update({
            "chunk_index": i+1,
            "total_chunks": len(chunks)
        })
        
        # Run the Pinecone process_document tool using CLI
        cli_command = [
            "npx", "-y", "@smithery/cli@latest", "call", "mcp-pinecone",
            "process_document", "--arg", f"document_id={doc_id}",
            "--arg", f"text={chunk}", "--arg", f"metadata={json.dumps(chunk_metadata)}"
        ]
        
        try:
            result = subprocess.run(
                cli_command,
                check=True,
                capture_output=True,
                text=True
            )
            # Wait a bit to avoid overwhelming the API
            time.sleep(0.2)
        except subprocess.CalledProcessError as e:
            print(f"Error indexing {doc_id}: {e.stderr}")
            return False
    
    return True

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
    
    print(f"Indexed {success_count} files successfully with {failure_count} failures")

if __name__ == "__main__":
    print(f"Starting to index {DIRECTORY_TO_INDEX} in Pinecone...")
    index_directory()
    print("Indexing complete.") 