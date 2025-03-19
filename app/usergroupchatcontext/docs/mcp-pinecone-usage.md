# Using MCP Pinecone for Claude's Memory

This guide explains how to use the Pinecone MCP integration to give Claude persistent memory.

## Setup

The Pinecone MCP is configured in `.cursor/mcp.json` with the following settings:

```json
"mcp-pinecone": {
  "command": "/Users/dev/.local/bin/mcp-pinecone",
  "args": [
    "--index-name",
    "agentconsult",
    "--api-key",
    "pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ"
  ],
  "env": {
    "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY"
  }
}
```

## Available MCP Pinecone Tools

Once configured, you can use the following MCP Pinecone tools:

1. **Semantic Search**
   ```
   mcp_mcp_pinecone_semantic_search({
     "query": "your search query",
     "top_k": 5  // optional, default is 10
   })
   ```

2. **Read Document**
   ```
   mcp_mcp_pinecone_read_document({
     "document_id": "the document ID"
   })
   ```

3. **Process Document**
   ```
   mcp_mcp_pinecone_process_document({
     "document_id": "unique-id-for-document",
     "text": "The content to remember",
     "metadata": {
       "source": "conversation",
       "tags": ["important", "memory"],
       "created_at": "2025-03-19"
     }
   })
   ```

4. **Get Stats**
   ```
   mcp_mcp_pinecone_pinecone_stats({})
   ```

## Example Usage

### Storing a Memory

When Claude learns something important that should be remembered:

```
I'll remember that information for you.

mcp_mcp_pinecone_process_document({
  "document_id": "user-preference-theme",
  "text": "The user prefers a dark theme for the UI and minimalist design.",
  "metadata": {
    "source": "conversation",
    "type": "preference",
    "category": "ui",
    "created_at": "2025-03-19"
  }
})
```

### Retrieving Memories

When Claude needs to recall information:

```
Let me check what I know about your UI preferences.

mcp_mcp_pinecone_semantic_search({
  "query": "user interface preferences",
  "top_k": 3
})
```

### Maintaining Context

Claude can also periodically check for relevant context:

```
Before I continue, let me check if I have any relevant information about this project.

mcp_mcp_pinecone_semantic_search({
  "query": "mobile chat interface design",
  "top_k": 5
})
```

## Tips for Effective Usage

1. **Create structured memories** - Include relevant metadata to organize information
2. **Use consistent document IDs** - Makes it easier to update specific memories
3. **Keep memories concise** - Store focused, specific pieces of information
4. **Use semantic search strategically** - Search for relevant context at the start of conversations

## Fallback to Direct SDK

If the MCP tools aren't working, you can always use the direct SDK scripts:

```bash
# Search for information
python3 ./app/usergroupchatcontext/scripts/search_pinecone.py "your query"

# Update the entire codebase in Pinecone
./app/usergroupchatcontext/scripts/update_pinecone_manual.sh
``` 