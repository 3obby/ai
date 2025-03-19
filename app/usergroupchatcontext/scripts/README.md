# Pinecone Indexing Scripts

These scripts help index the usergroupchatcontext files into Pinecone for semantic search and retrieval.

## Environment Variables Setup

Before running these scripts, make sure to set the following environment variables:

```bash
# Required for all scripts
export PINECONE_API_KEY="your_pinecone_api_key_here"
export OPENAI_API_KEY="your_openai_api_key_here"
```

You can add these to your `.env.local` file or set them directly in your shell session.

## Available Scripts

- `update_pinecone.py`: Uses the MCP CLI to index files via the API
- `direct_update_pinecone.py`: Uses the Pinecone SDK directly for indexing
- `update_memory.py`: Indexes only changed files for efficient updates

## Usage

```bash
# Index all files
python app/usergroupchatcontext/scripts/update_pinecone.py

# Use the SDK directly
python app/usergroupchatcontext/scripts/direct_update_pinecone.py

# Index only changed files
python app/usergroupchatcontext/scripts/update_memory.py changed

# Force update all files
python app/usergroupchatcontext/scripts/update_memory.py all
```

## Security Note

Never commit API keys directly in these files. Always use environment variables. 