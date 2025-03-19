# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice. The system ensures a seamless transition from text chat to voice chat at any time. When a user presses the "voice mode" button, the latest and most capable realtime OpenAI voice model is automatically selected, preserving full context from the ongoing text-based conversation. While in voice mode, each exchange between the user and the bot is transcribed in real time and injected into the unified text output, maintaining a consistent history for both text and voice interactions.

By default, only the final outputs from each bot are displayed. However, users can expand any bot message to reveal the complete signal chain, which includes:
- Original user input (text or transcribed voice)  
- Optional pre-processing steps  
- Tool calling logic (if applicable)  
- Tool execution details and debugging information  
- Optional post-processing steps  
- Final bot output  

This design ensures that tool usage, pre- and post-processing, and any rework attempts remain available to all users in both text and voice contexts with no gaps in functionality.

## Development Direction

We have shifted our efforts to create a robust production-ready system. By default:

1. **Latest OpenAI Models by Default**  
   - Text interactions use the latest GPT model (e.g., gpt-4o)  
   - Voice interactions automatically switch to the newest realtime OpenAI model for an optimal experience  

2. **LiveKit Integration with OpenAI**  
   - For realtime models: Use the MultimodalAgent class with RealtimeModel (e.g., gpt-4o-realtime-preview-yyyy-mm-dd)  
   - For text models: Use the LLM class (e.g., gpt-4o)  
   - Model versions are dynamically queried at build time to ensure currency  

3. **Single-Bot Experience**  
   - A single default bot leverages the latest OpenAI models for voice interactions  
   - The system maintains unified context across text and voice so that switching modes is instant and retains conversational history  
   - All message flows (text and transcribed voice) route through the same bot, ensuring a consistent, high-quality exchange  

4. **Pinecone Vector Database Integration**
   - Enhanced contextual awareness through semantic codebase indexing
   - Integrated memory capabilities for improved conversation retention
   - Cursor IDE integration with MCP server for seamless development experience
   - Allows bots to reference and recall specific parts of the codebase during conversations

## Core Architecture

### Component Hierarchy and Relationships

**Top Level: GroupChatContext**  
- Orchestrates and contains all other components

**Main Components and Their Relationships**:
1. **User I/O (Text & Voice)**
   - Bidirectional connection with Bot Manager  
   - Bidirectional connection with LiveKit Integration  

2. **Bot Manager**
   - Connected to User I/O  
   - Connected to Settings System (bidirectional)  
   - Controls Bot Instance Registry  

3. **Settings System**
   - Connected to Bot Manager (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  

4. **LiveKit Integration**
   - Connected to User I/O  
   - Connected to Bot Instance Registry (bidirectional)  

5. **Bot Instance Registry**
   - Controlled by Bot Manager  
   - Connected to LiveKit Integration (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Manages the Bot Response Pipeline  

6. **Prompt Processor (Pre/Post Hooks)**
   - Connected to Bot Instance Registry (bidirectional)  
   - Connected to Settings System (bidirectional)  
   - Connected to Reprocessing Control System (bidirectional)  

7. **Tool Calling System**
   - Connected to Bot Response Pipeline (bidirectional)  

8. **Bot Response Pipeline**
   - Controlled by Bot Instance Registry  
   - Connected to Tool Calling System (bidirectional)  
   - Connected to Reprocessing Control System (bidirectional)  

9. **Reprocessing Control System**
   - Connected to Bot Response Pipeline (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  

10. **Pinecone Integration**
    - Connected to Bot Response Pipeline (bidirectional)
    - Provides semantic search capabilities across the codebase
    - Enhances context retrieval for more accurate responses
    - Enables conversation memory through vector embeddings

## Pinecone Indexing and Retrieval Implementation

Our Pinecone integration provides the AI copilot with comprehensive access to the codebase, enabling semantic understanding and contextual responses based on the project's source code. The implementation follows a pipeline of indexing, embedding, and retrieval:

### Indexing Pipeline

1. **Codebase Scanning**
   - Recursive directory traversal targeting TypeScript, JavaScript, and Markdown files
   - Intelligent filtering to exclude binary files, node_modules, and build artifacts
   - Content chunking of large files to maintain optimal embedding quality

2. **Text Embedding Generation**
   - OpenAI's text-embedding-ada-002 model (1536 dimensions) for high-quality semantic representations
   - Chunking strategy that preserves semantic coherence (paragraphs, sentences)
   - MD5 hash-based ID generation for consistent retrieval and updates

3. **Vector Database Storage**
   - Serverless Pinecone index (agentconsult) hosted on AWS us-east-1 region
   - Optimized upsert operations with batching (50 vectors per batch)
   - Rich metadata storage including file paths, snippets, and modification dates

### Retrieval Process

1. **Semantic Query Generation**
   - User questions converted to the same embedding space as the indexed content
   - Context-aware query formulation based on ongoing conversation

2. **Similarity Search**
   - Cosine similarity matching to find the most relevant code segments
   - TopK retrieval (configurable, default 5) with metadata inclusion
   - Configurable filtering to narrow searches to specific parts of the codebase

3. **Context Integration**
   - Retrieved code segments seamlessly integrated into the bot's context window
   - Automatic prioritization of most relevant content within token limits
   - Source attribution with file paths to maintain referential transparency

This implementation successfully extends the AI copilot's ability to read and understand the codebase, enabling it to:
- Answer specific questions about implementation details
- Provide code references and explanations from existing project files
- Maintain contextual awareness of code structure during conversations
- Generate suggestions and modifications informed by the actual codebase

The architecture allows for continuous indexing of new code changes, ensuring the AI assistant always has access to the most current version of the codebase for accurate, context-aware assistance.

## Key Components

### Core Components
1. **GroupChatProvider**  
   - Top-level context provider managing global state, including user and bot data
2. **BotRegistry**  
   - Manages the set of available bots and their configurations  
3. **MessageProcessor**  
   - Central message-handling pipeline for routing and sequencing  
4. **PineconeService**
   - Manages vector database connections and operations
   - Enables semantic search across indexed content

### Input/Output Components
1. **ChatInterface**  
   - Minimal, mobile-first UI supporting text input and a "voice mode" toggle  
2. **LiveKitService**  
   - Wraps LiveKit's WebRTC functionalities for high-quality voice streaming and automatic transcription  
3. **BotResponseRenderer**  
   - Displays bot responses with a collapsible view for advanced debugging and signal chain exploration  

### Configuration Components
1. **GroupSettingsPanel**  
   - Global chat settings panel controlling bot selections, response configurations, and advanced processing  
2. **BotConfigPanel**  
   - Per-bot configuration, including prompts, tools, and pre/post-processing rules  
3. **PromptEditor**  
   - Advanced configuration interface for refining prompts and hooking into reprocessing logic  

## Signal Chain Logging System

### Data Flow and Processing Stages

**Main Container: Unified Text Output System**

**Processing Flow**:  
1. User Input (Text & Voice) → Pre-Process Logging → Tool Resolution Logging  
2. Tool Resolution Logging → Tool Execution Logging → Post-Process Logging → Final Output  
3. Final Output → Message Display Component  

**Message Display Component**:  
- Default View: Displays only the final output from each bot  
- Expanded View: Shows all intermediate steps, configuration details, and debug logs  

### Flow Direction:
- User Input travels through pre-processing and tool resolution stages  
- Tool results flow back through post-processing to produce the final output  
- The final output is then presented in the Message Display Component with optional expanded logs  

## Architectural Advantages

- **WebRTC Benefits**  
  Provides low latency, optimized global edge networking, and straightforward implementation  
- **Voice Activity Detection**  
  Enables natural conversation flow, with real-time detection of speaking intervals  
- **Multi-modal Integration**  
  Merges text and voice in a single conversation thread with shared context  
- **Mobile-First Design**  
  Offers an efficient, touch-friendly interface that adapts gracefully to smaller screens  
- **Voice Tool Optimization**  
  Transforms user voice commands into natural language tool calls  
- **Unified Signal Chain**  
  Centralizes logs, making it easy to trace data from pre-processing to final bot output  
- **Pre/Post Processing**  
  Allows flexible, high-quality control over messages, both globally and per bot  
- **Reprocessing System**  
  Provides iterative refinement, automatically or on user demand, within clearly defined limits  
- **Unified Bot Settings**  
  Maintains consistent global defaults across all bots, with flexible overrides per individual bot
- **Vector Database Integration**
  Enhances context retrieval with semantic search across the codebase
- **Memory Persistence**
  Maintains conversation history and context through vector embeddings