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

```
┌─────────────────────────────────────────────────────────────┐
│                      GroupChatContext                       │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  User I/O   │    │ Bot Manager │    │ Settings System │  │
│  │ Text & Voice│◄──►│             │◄──►│                 │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│         ▲                  │                    ▲            │
│         │                  ▼                    │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ LiveKit     │    │ Bot Instance│    │ Prompt Processor │  │
│  │ Integration │◄──►│  Registry   │◄──►│ Pre/Post Hooks   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│         ▲                  │                    ▲            │
│         │                  ▼                    │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ Tool Calling│◄──►│ Bot Response│◄──►│ Recursion Control│  │
│  │   System    │    │  Pipeline   │    │     System      │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

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
1. **GroupSettingsPanel** - Global chat settings UI for bot selection and response mode configuration
2. **BotConfigPanel** - Per-bot configuration for prompts, tools, and voice settings
3. **PromptEditor** - Advanced prompt editing with pre/post-processing support

## Signal Chain Logging System

```
┌────────────────────────────────────────────────────────────┐
│                 Unified Text Output System                 │
│                                                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ User Input  │    │ Pre-Process │    │ Tool Resolution │ │
│  │ Text & Voice│───►│   Logging   │───►│     Logging     │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│                                                ▼           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │   Final     │    │ Post-Process│    │ Tool Execution  │ │
│  │   Output    │◄───│   Logging   │◄───│     Logging     │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                Message Display Component             │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │                  Default View                  │  │  │
│  │ │         (Shows only final bot response)        │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  │ ┌────────────────────────────────────────────────┐  │  │
│  │ │                 Expanded View                  │  │  │
│  │ │     (Shows complete processing signal chain)   │  │  │
│  │ └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Type System

```typescript
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'system' | 'assistant';
  sender: string; // Bot ID or 'user'
  senderName?: string; // Display name of the sender
  timestamp: number;
  type: 'text' | 'voice' | 'tool_result';
  metadata?: {
    toolResults?: ToolResult[];
    processing?: ProcessingMetadata;
  };
}

export interface ToolResult {
  toolName: string;
  input: Record<string, any>;
  output: any;
  error?: string;
  executionTime?: number;
}

export interface ProcessingMetadata {
  preProcessed?: boolean;
  postProcessed?: boolean;
  recursionDepth?: number;
  processingTime?: number;
  originalContent?: string;
  modifiedContent?: string;
  preprocessedContent?: string;
  postprocessedContent?: string;
  usedMockService?: boolean;
}
```

## Implementation Status

### Completed
- [x] LiveKit infrastructure setup (LiveKitService, RoomSessionManager)
- [x] OpenAI Realtime API integration 
- [x] Voice activity detection system with sensitivity controls
- [x] Voice input/output components with WebRTC support
- [x] Audio visualization and playback controls
- [x] Voice settings panel with configuration options
- [x] Custom voice selection and personalization features
- [x] Enhanced UI components for voice functionality
- [x] Turn-taking management system
- [x] Voice transcription and synthesis services
- [x] Integrate LiveKit voice services with tool calling system
- [x] Complete voice tool calling service implementation
- [x] Enhanced turn-taking for multi-participant conversations
- [x] Voice analytics for capturing usage patterns
- [x] Integrated voice-based authentication features
- [x] Implemented advanced voice commands for UI control
- [x] Enhanced signal chain logging for all data flows
- [x] Updated message display component with expandable signal chain details 

### In Progress
- [ ] Unified text output system encompassing voice transcripts and tool results
- [ ] Signal chain visualization in debug panel
- [ ] Tool execution logging with detailed steps
- [ ] Pre/post processing visualization
- [ ] Implement default single-bot experience with latest OpenAI models
- [ ] Query system for latest model versions from OpenAI
- [ ] LiveKit integration with OpenAI MultimodalAgent and LLM classes
- [ ] Improve voice command recognition accuracy with machine learning models
- [ ] Add multi-language support for voice commands
- [ ] Implement voice emotion detection for more natural responses
- [ ] Create user-customizable voice command system

## Next Implementation Steps

1. **Single Bot Experience**:
   - Update bot initialization to use a single latest-model bot
   - Remove multi-bot UI/UX elements not relevant to single-bot experience
   - Ensure all messages (text and voice) route to the same bot

2. **OpenAI Model Version Management**:
   - Create a service to query and cache latest model versions
   - Implement version fallback mechanism if preferred version unavailable
   - Add model capability detection to match features with supported models

3. **LiveKit Integration Enhancement**:
   - Update MultimodalAgent implementation for latest model versions
   - Ensure proper audio streaming and transcription with latest models
   - Optimize latency for realtime voice interactions

## Directory Structure

```
/app/usergroupchatcontext/
  ├── components/
  │   ├── chat/
  │   │   ├── MessageItem.tsx      # Needs updating for expandable signal chain
  │   │   └── MessageBubble.tsx    # Needs updating for expandable signal chain
  │   ├── settings/
  │   ├── tools/
  │   ├── voice/
  │   ├── debug/
  │   │   ├── DebugInfo.tsx        # Shows detailed signal chain
  │   │   └── ProcessingInfo.tsx   # Shows processing details
  │   └── bots/
  ├── hooks/
  ├── context/
  ├── services/
  │   ├── livekit/
  │   ├── tools/
  │   ├── voiceToolRegistry.ts
  │   ├── openaiRealtimeService.ts
  │   ├── voiceTranscriptionService.ts
  │   ├── voiceSynthesisService.ts
  │   ├── voiceToolCallingService.ts
  │   ├── toolCallService.ts
  │   ├── toolProcessorService.ts
  │   ├── prompt-processor-service.ts
  │   └── mockBotService.ts
  ├── types/
  ├── utils/
  ├── api/
  ├── data/
  ├── page.tsx
  ├── layout.tsx
  ├── mobile.css
  └── types.ts
```

## Architectural Advantages

- **WebRTC Benefits**: Lower latency, global edge network, simplified implementation
- **Voice Activity Detection**: Natural conversation flow, efficient audio transmission
- **Multi-modal Integration**: Unified context across text and voice interactions
- **Mobile-First Design**: Responsive design, touch-friendly interface, efficient resource usage
- **Voice Tool Optimization**: Natural language tool calling, format responses for speech 
- **Unified Signal Chain**: Complete visibility into all processing steps with expandable UI 