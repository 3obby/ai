# Pinecone Integration for AgentConsult

## Overview

This document outlines the integration of Pinecone vector database with the AgentConsult project. Pinecone provides semantic search and memory capabilities, allowing our bots to maintain context and retrieve relevant information from the codebase.

## Setup

The integration requires several components:

1. **Pinecone Client**: A TypeScript client for connecting to the Pinecone service
2. **Cursor MCP Server**: Connects the Cursor IDE with Pinecone for indexing and searching
3. **Environment Variables**: Configuration for the Pinecone service

## Installation

The Pinecone package is already installed in the project:

```bash
npm install @pinecone-database/pinecone
```

## Configuration

### Environment Variables

The Pinecone API key is stored in `.env.local`:

```
PINECONE_API_KEY=<YOUR_PINECONE_API_KEY>
```

### Cursor IDE Configuration

The Cursor MCP server is configured in `.cursor.json`:

```json
"mcpServers": {
  "pinecone-memory": {
    "command": "npx",
    "args": ["-y", "@pinecone-database/pinecone-mcp-server"],
    "env": {
      "PINECONE_API_KEY": "<YOUR_PINECONE_API_KEY>"
    }
  }
},
"ai.externalMemory": true
```

## Core Components

### PineconeService

The `PineconeService` (`app/usergroupchatcontext/services/pineconeService.ts`) provides a singleton instance for interacting with the Pinecone vector database:

- `init()`: Initializes the Pinecone client
- `getIndex()`: Gets the Pinecone index for the AgentConsult project
- `upsertVectors()`: Adds or updates vectors in the index
- `queryVectors()`: Queries the index for semantically similar vectors

### PineconeUtils

The `PineconeUtils` (`app/usergroupchatcontext/utils/pineconeUtils.ts`) provides utility functions:

- `generateId()`: Creates unique IDs for indexed content
- `indexDirectory()`: Recursively indexes files in a directory

## Indexing the Codebase

### Using NPM Scripts

Two NPM scripts are available for indexing the codebase:

```bash
# Using TypeScript script (manual indexing)
npm run index-codebase

# Using Cursor's built-in indexing (recommended)
npm run cursor:index
```

### Using Cursor CLI

You can also index the codebase directly using the Cursor CLI:

```bash
cursor create-embeddings --path="app/usergroupchatcontext" --destination="pinecone" --index="agentconsult"
```

## Usage in Bots

The Pinecone integration enhances bots with:

1. **Semantic Search**: Find relevant code snippets or documentation based on natural language queries
2. **Conversation Memory**: Maintain context across longer conversations
3. **Codebase Awareness**: Reference specific parts of the codebase in responses

## Future Improvements

- Implement chunking strategies for large files
- Add embeddings generation using OpenAI embeddings API
- Create conversation memory system using vector storage
- Develop query optimization for more accurate code search 