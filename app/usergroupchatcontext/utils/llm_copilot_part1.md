# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can interact with multiple AI bots through text and voice. The system enables seamless transitions between text and voice inputs, with full transcription capabilities powered by OpenAI Whisper and LiveKit's WebRTC infrastructure. Each bot can be individually configured with custom prompts, processing rules, and tool capabilities.

**Key Focus**: All data flows (tools, bots, text, transcriptions) must flow to a unified text output system, both under the hood and in the UI. By default, only bot outputs are displayed, but clicking a bot message should reveal the full signal chain:
- Original input
- Optional pre-processing steps
- Tool calling logic (if applicable)
- Tool execution and debugging information
- Optional post-processing
- Final bot output

## Development Direction

We are no longer building samples or demos. Our new default configuration:

1. **Latest OpenAI Models by Default**:
   - Text interactions should always use the latest GPT model (e.g., gpt-4o)
   - Voice interactions should use the latest available realtime model

2. **LiveKit Integration with OpenAI**:
   - For realtime models: Use the MultimodalAgent class with RealtimeModel
   - Specify the latest model version (e.g., gpt-4o-realtime-preview-yyyy-mm-dd)
   - For text models: Use the LLM class with latest models (gpt-4o)
   - Query for the most current model version names at build time

3. **Single-Bot Experience**:
   - Default to a single bot powered by the latest OpenAI model
   - Seamless transition between text and voice interactions with the same bot
   - Unified history and context across modalities

## Core Architecture

### Component Hierarchy and Relationships

**Top Level: GroupChatContext**
- Contains and orchestrates all other components

**Main Components and Their Relationships:**
1. User I/O (Text & Voice)
   - Bidirectional connection with Bot Manager
   - Bidirectional connection with LiveKit Integration

2. Bot Manager
   - Connected to User I/O
   - Connected to Settings System (bidirectional)
   - Controls Bot Instance Registry

3. Settings System
   - Connected to Bot Manager (bidirectional)
   - Connected to Prompt Processor (bidirectional)

4. LiveKit Integration
   - Connected to User I/O
   - Connected to Bot Instance Registry (bidirectional)

5. Bot Instance Registry
   - Controlled by Bot Manager
   - Connected to LiveKit Integration (bidirectional)
   - Connected to Prompt Processor (bidirectional)
   - Controls Bot Response Pipeline

6. Prompt Processor (Pre/Post Hooks)
   - Connected to Bot Instance Registry (bidirectional)
   - Connected to Settings System (bidirectional)
   - Connected to Reprocessing Control System (bidirectional)

7. Tool Calling System
   - Connected to Bot Response Pipeline (bidirectional)

8. Bot Response Pipeline
   - Controlled by Bot Instance Registry
   - Connected to Tool Calling System (bidirectional)
   - Connected to Reprocessing Control System (bidirectional)

9. Reprocessing Control System
   - Connected to Bot Response Pipeline (bidirectional)
   - Connected to Prompt Processor (bidirectional)

## Key Components

### Core Components
1. **GroupChatProvider** - Top-level context provider managing global state and configuration
2. **BotRegistry** - Manages available and active bots with their configurations
3. **MessageProcessor** - Central message handling pipeline for routing and sequencing

### Input/Output Components
1. **ChatInterface** - Minimal, mobile-first UI with text input and microphone toggle
2. **LiveKitService** - Wraps LiveKit's WebRTC infrastructure for high-quality voice communication
3. **BotResponseRenderer** - Renders bot responses with appropriate styling and animations

### Configuration Components
1. **GroupSettingsPanel** - Global chat settings UI for bot selection, response mode configuration, and processing settings
2. **BotConfigPanel** - Per-bot configuration for prompts, tools, and processing settings (pre/post-processing, reprocessing)
3. **PromptEditor** - Advanced prompt editing with pre/post-processing support

## Signal Chain Logging System

### Data Flow and Processing Stages

**Main Container: Unified Text Output System**

**Processing Flow:**
1. User Input (Text & Voice) → Pre-Process Logging → Tool Resolution Logging
2. Tool Resolution Logging → Tool Execution Logging → Post-Process Logging → Final Output
3. Final Output → Message Display Component

**Message Display Component:**
- Contains two views:
  - Default View: Shows only final bot response
  - Expanded View: Shows complete processing signal chain

### Flow Direction:
- User Input flows forward through Pre-Process and Tool Resolution
- Tool Execution results flow back through Post-Process to Final Output
- Final Output is displayed in the Message Display Component

## Next Implementation Steps

1. **Model Version Management**:
   - Create a service to query and cache latest model versions
   - Implement version fallback mechanism if preferred version unavailable
   - Add model capability detection to match features with supported models

2. **Single Bot Experience**:
   - Update bot initialization to use a single latest-model bot
   - Remove multi-bot UI/UX elements not relevant to single-bot experience
   - Ensure all messages (text and voice) route to the same bot

3. **Enhanced Signal Chain Visualization**:
   - Improve visual representation of pre/post processing effects
   - Add detailed view of reprocessing iterations
   - Create dedicated timeline view of complete signal chain

4. **Tool System Integration**:
   - Complete the tool configuration UI
   - Integrate tool system with voice capabilities
   - Implement tool selection based on context and user needs

5. **LiveKit Integration Enhancement**:
   - Update MultimodalAgent implementation for latest model versions
   - Ensure proper audio streaming and transcription with latest models
   - Optimize latency for realtime voice interactions

## Architectural Advantages

- **WebRTC Benefits**: Lower latency, global edge network, simplified implementation
- **Voice Activity Detection**: Natural conversation flow, efficient audio transmission
- **Multi-modal Integration**: Unified context across text and voice interactions
- **Mobile-First Design**: Responsive design, touch-friendly interface, efficient resource usage
- **Voice Tool Optimization**: Natural language tool calling, format responses for speech 
- **Unified Signal Chain**: Complete visibility into all processing steps with expandable UI
- **Pre/Post Processing**: Enhanced message quality and customization at both global and bot levels
- **Reprocessing System**: Intelligent detection of content changes with configurable depth limits
- **Unified Bot Settings**: Consistent configuration across all bots with individual overrides 