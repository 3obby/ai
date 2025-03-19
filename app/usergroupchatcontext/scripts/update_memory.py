#!/usr/bin/env python3
"""
update_memory.py - Updates Pinecone index with only changed files
This can be used as a git hook or run manually to keep the memory up to date
"""

import os
import sys
import json
import time
import hashlib
import subprocess
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
HASH_STORAGE_FILE = os.path.join(DIRECTORY_TO_INDEX, 'scripts', '.file_hashes.json')

# Initialize OpenAI for embeddings
def init_openai():
    openai_api_key = os.environ.get('OPENAI_API_KEY', '')
    if openai_api_key.startswith('"') and openai_api_key.endswith('"'):
        openai_api_key = openai_api_key[1:-1]
        
    print(f"OpenAI API key (truncated): {openai_api_key[:10]}...{openai_api_key[-5:]}")
    return openai.OpenAI(api_key=openai_api_key)

# Initialize Pinecone client
def init_pinecone():
    pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
    return pinecone_client.Index(INDEX_NAME)

def get_embedding(text, openai_client):
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

def load_file_hashes():
    """Load previously saved file hashes"""
    if os.path.exists(HASH_STORAGE_FILE):
        try:
            with open(HASH_STORAGE_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading hashes: {e}")
            return {}
    return {}

def save_file_hashes(file_hashes):
    """Save file hashes for future comparison"""
    os.makedirs(os.path.dirname(HASH_STORAGE_FILE), exist_ok=True)
    try:
        with open(HASH_STORAGE_FILE, 'w') as f:
            json.dump(file_hashes, f, indent=2)
    except Exception as e:
        print(f"Error saving hashes: {e}")

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

def delete_file_vectors(file_path, pinecone_index):
    """Delete all vectors for a specific file from Pinecone"""
    try:
        # Generate a unique document ID base from the file path
        relative_path = get_relative_path(file_path)
        file_name = os.path.basename(file_path)
        file_type = "unknown"
        
        # Try to determine file type from path
        for ext in ['.ts', '.tsx', '.js', '.jsx']:
            if file_path.endswith(ext):
                if 'components' in file_path:
                    file_type = "component"
                elif 'hooks' in file_path:
                    file_type = "hook"
                # ... and so on
                break
        
        if file_path.endswith('.md'):
            file_type = "documentation"
        elif file_path.endswith('.css'):
            file_type = "style"
        elif file_path.endswith('.txt'):
            file_type = "text"
        
        # Get all IDs that match this file pattern
        id_prefix = f"usergroupchatcontext-{file_type}-{file_name}-chunk"
        
        # List vectors to find matching IDs (simulate - Pinecone doesn't have a direct way to do this)
        # In a real solution, you might need to maintain a separate index of files
        
        # For now, let's try a different approach - get the stats first
        print(f"Deleting vectors for {file_path}...")
        
        # Build a list of potential IDs (this is an approximation)
        ids_to_delete = []
        for i in range(1, 50):  # Assuming no file has more than 50 chunks
            ids_to_delete.append(f"usergroupchatcontext-{file_type}-{file_name}-chunk-{i}")
        
        # Delete in batches
        batch_size = 100
        for i in range(0, len(ids_to_delete), batch_size):
            batch = ids_to_delete[i:i+batch_size]
            try:
                pinecone_index.delete(ids=batch)
            except Exception as e:
                # Ignore errors about IDs not found
                if "not found" not in str(e).lower():
                    print(f"Error deleting vectors: {e}")
        
        print(f"Deleted vectors for {file_path}")
        return True
    except Exception as e:
        print(f"Error deleting vectors: {e}")
        return False

def index_file(file_path, openai_client, pinecone_index, force_update=False):
    """Index a single file in Pinecone"""
    if not should_index_file(file_path):
        return False
    
    # Load existing file hashes
    file_hashes = load_file_hashes()
    
    # Calculate current hash
    current_hash = get_file_hash(file_path)
    
    # Skip if file hasn't changed and we're not forcing update
    if not force_update and file_path in file_hashes and file_hashes[file_path] == current_hash:
        print(f"Skipping unchanged file: {file_path}")
        return True
    
    print(f"Indexing {file_path}...")
    
    # Delete existing vectors for this file
    delete_file_vectors(file_path, pinecone_index)
    
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
        embedding = get_embedding(chunk, openai_client)
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
    
    # Update file hash if successful
    if success:
        file_hashes[file_path] = current_hash
        save_file_hashes(file_hashes)
    
    return success

def get_changed_files():
    """Get recently changed files in the usergroupchatcontext directory"""
    changed_files = []
    
    try:
        # Try git status to get uncommitted changes
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            cwd='/Users/dev/code/agentconsult'
        )
        
        for line in result.stdout.splitlines():
            # Git status format: XY filename
            if line and len(line) > 3:
                status = line[:2]
                file_path = line[3:].strip()
                
                # Check if file is modified, added, or renamed
                if status.strip() and not status.startswith('??'):
                    if file_path.startswith('app/usergroupchatcontext'):
                        # Convert to absolute path
                        abs_path = os.path.join('/Users/dev/code/agentconsult', file_path)
                        if should_index_file(abs_path) and os.path.exists(abs_path):
                            changed_files.append(abs_path)
                            print(f"Found changed file: {abs_path}")
        
        # If no changes found with git status, try a different approach
        if not changed_files:
            print("No uncommitted changes found, checking committed changes...")
            
            # Try to get recently committed files
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
                capture_output=True,
                text=True,
                cwd='/Users/dev/code/agentconsult'
            )
            
            for file_path in result.stdout.splitlines():
                if file_path.startswith('app/usergroupchatcontext'):
                    abs_path = os.path.join('/Users/dev/code/agentconsult', file_path)
                    if should_index_file(abs_path) and os.path.exists(abs_path):
                        changed_files.append(abs_path)
                        print(f"Found committed change: {abs_path}")
        
        # If still no changes, check recently modified files
        if not changed_files:
            print("No git changes detected, checking file modification times...")
            
            current_time = time.time()
            one_hour_ago = current_time - (60 * 60)  # Look at files modified in the last hour
            
            for root, _, files in os.walk(DIRECTORY_TO_INDEX):
                for file in files:
                    file_path = os.path.join(root, file)
                    if should_index_file(file_path):
                        try:
                            mtime = os.path.getmtime(file_path)
                            if mtime > one_hour_ago:
                                changed_files.append(file_path)
                                print(f"Recently modified file: {file_path}")
                        except Exception as e:
                            print(f"Error checking file time: {e}")
    
    except Exception as e:
        print(f"Error detecting changed files: {e}")
    
    if not changed_files:
        print("No changed files detected in app/usergroupchatcontext")
    else:
        print(f"Found {len(changed_files)} changed files to process")
    
    return changed_files

def index_directory(directory_path=DIRECTORY_TO_INDEX, force_update=False):
    """Recursively index all files in a directory"""
    openai_client = init_openai()
    pinecone_index = init_pinecone()
    
    success_count = 0
    failure_count = 0
    
    for root, dirs, files in os.walk(directory_path):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = os.path.join(root, file)
            if index_file(file_path, openai_client, pinecone_index, force_update):
                success_count += 1
            else:
                failure_count += 1
                
            # Print stats every 10 files
            if (success_count + failure_count) % 10 == 0:
                print(f"Progress: {success_count + failure_count} files processed ({success_count} successful, {failure_count} failed)")
    
    print(f"Indexed {success_count} files successfully with {failure_count} failures")

def index_changed_files():
    """Index only files that have changed since last git commit"""
    openai_client = init_openai()
    pinecone_index = init_pinecone()
    
    changed_files = get_changed_files()
    
    if not changed_files:
        print("No changed files detected")
        return
    
    print(f"Found {len(changed_files)} changed files")
    
    success_count = 0
    failure_count = 0
    
    for file_path in changed_files:
        if index_file(file_path, openai_client, pinecone_index, force_update=True):
            success_count += 1
        else:
            failure_count += 1
    
    print(f"Indexed {success_count} changed files successfully with {failure_count} failures")

def main():
    """Main function for indexing files to Pinecone"""
    print("Enhanced Memory Updater for Pinecone")
    print("-" * 40)
    
    # Check command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "changed":
            print("Indexing only changed files...")
            index_changed_files()
        elif sys.argv[1] == "all":
            print("Indexing all files (forced update)...")
            index_directory(force_update=True)
        else:
            print("Unknown command. Use 'changed' or 'all'")
    else:
        # If no arguments, check if called from git hook
        if 'GIT_DIR' in os.environ:
            print("Running as git hook, indexing changed files...")
            index_changed_files()
        else:
            # Default to only indexing changed files (based on hash)
            print("Indexing all files (skipping unchanged)...")
            index_directory(force_update=False)
    
    print("Memory update complete")

if __name__ == "__main__":
    main() 