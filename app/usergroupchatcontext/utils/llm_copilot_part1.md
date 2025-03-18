# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice. The system ensures a seamless transition from text chat to voice chat at any time. When a user presses the “voice mode” button, the latest and most capable realtime OpenAI voice model is automatically selected, preserving full context from the ongoing text-based conversation. While in voice mode, each exchange between the user and the bot is transcribed in real time and injected into the unified text output, maintaining a consistent history for both text and voice interactions.

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
   - A single default bot leverages the latest OpenAI models for both text and voice interactions  
   - The system maintains unified context across text and voice so that switching modes is instant and retains conversational history  
   - All message flows (text and transcribed voice) route through the same bot, ensuring a consistent, high-quality exchange  

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

## Key Components

### Core Components
1. **GroupChatProvider**  
   - Top-level context provider managing global state, including user and bot data
2. **BotRegistry**  
   - Manages the set of available bots and their configurations  
3. **MessageProcessor**  
   - Central message-handling pipeline for routing and sequencing  

### Input/Output Components
1. **ChatInterface**  
   - Minimal, mobile-first UI supporting text input and a “voice mode” toggle  
2. **LiveKitService**  
   - Wraps LiveKit’s WebRTC functionalities for high-quality voice streaming and automatic transcription  
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

## Next Implementation Steps

1. **Model Version Management**  
   - Implement a service to discover and cache the latest model versions  
   - Fallback gracefully if a preferred model version is unavailable  
   - Integrate a feature detection system for each model’s capabilities  

2. **Single Bot Experience**  
   - Use a single latest-model bot for all incoming user interactions (text or voice)  
   - Remove or refine any multi-bot UI elements that are no longer relevant  
   - Guarantee that text-based and voice-based messages unify under one straightforward conversation flow  

3. **Enhanced Signal Chain Visualization**  
   - Provide more detailed views of how each message is processed at each step  
   - Highlight reprocessing or refinement logic when user or system intervention occurs  
   - Consider a timeline layout for more complex debugging sessions  

4. **Tool System Integration**  
   - Complete tool configuration options in the UI  
   - Enable tool calling via natural voice commands  
   - Select the most appropriate tools based on context, usage patterns, or user preference  

5. **LiveKit Integration Enhancement**  
   - Ensure minimal latency for real-time voice streaming and OpenAI transcription  
   - Automate voice session startup and shutdown for an easy “voice mode” toggle  
   - Maintain context across text and voice seamlessly to enable one continuous conversation  

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