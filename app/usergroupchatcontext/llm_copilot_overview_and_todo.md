# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can interact with multiple AI bots through text and voice. The system enables seamless transitions between text and voice inputs, with full transcription capabilities powered by OpenAI Whisper and LiveKit's WebRTC infrastructure. Each bot can be individually configured with custom prompts, processing rules, and tool capabilities.

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

## LiveKit Integration

LiveKit provides WebRTC-based real-time communication with superior voice quality and lower latency than traditional WebSocket approaches.

```
┌─────────────────────────────────────────────────────────────┐
│                     LiveKit Integration                     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ WebRTC      │    │ Room        │    │ OpenAI Realtime │  │
│  │ Connection  │◄──►│ Management  │◄──►│ API Bridge      │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│         ▲                  │                    ▲            │
│         │                  ▼                    │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ Audio Track │    │ Participant │    │ Voice Activity   │  │
│  │ Management  │◄──►│ Management  │◄──►│ Detection (VAD)  │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│         ▲                  │                    ▲            │
│         │                  ▼                    │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ Multi-modal │    │ Speech-to-  │    │ Text-to-Speech  │  │
│  │ Support     │◄──►│ Text Service│◄──►│ Service         │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Key Components:
1. **LiveKitProvider** - Manages WebRTC connections and room sessions
2. **MultimodalAgentService** - Handles voice interactions and audio routing
3. **RoomSessionManager** - Creates and manages room sessions and participant tracking
4. **VoiceActivityService** - Implements Voice Activity Detection for natural conversations
5. **OpenAIRealtimeService** - Connects to OpenAI's Realtime API for transcription and synthesis

## Type System

```typescript
// Core Types
export interface GroupChatConfig {
  responseMode: 'sync' | 'async';
  defaultBotParams: BotParameters;
  activeBots: string[];  // IDs of active bots
  botOrder: string[];   // Order for sync responses
  maxRecursionDepth: number;
  globalSystemPrompt?: string;
  voiceSettings: VoiceSettings;
}

export interface BotParameters {
  temperature: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  topP?: number;
  enabledTools: string[];
}

// Bot Definition
export interface Bot {
  id: string;
  name: string;
  avatar: string;
  description: string;
  basePrompt: string;
  preProcessingPrompt?: string;
  postProcessingPrompt?: string;
  parameters: BotParameters;
  tools: ToolDefinition[];
  voiceConfig: VoiceConfig;
}

// Voice Configuration
export interface VoiceConfig {
  voice: string;  // alloy, echo, fable, onyx, nova, shimmer
  speed: number;  // 0.25 to 4.0
  enabled: boolean;
  useCustomVoice: boolean;
  customVoiceId?: string;
}

// LiveKit Voice Settings
export interface VoiceSettings {
  vadMode: 'auto' | 'sensitive' | 'manual';
  vadThreshold?: number; // 0.1-0.9
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: number;
  turnDetection?: {
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    createResponse?: boolean;
  };
  defaultVoice?: string;
  modality?: 'both' | 'text' | 'audio';
}

// Message Types
export interface Message {
  id: string;
  content: string;
  sender: 'user' | BotId;
  timestamp: Date;
  type: 'text' | 'voice' | 'tool_result';
  metadata?: {
    transcription?: TranscriptionMetadata;
    toolResults?: ToolResultMetadata[];
    processingInfo?: ProcessingMetadata;
    audioTrack?: AudioTrackMetadata;
  };
}

export interface TranscriptionMetadata {
  duration: number;
  confidence: number;
  interim: boolean;
  segments?: Array<TranscriptionSegment>;
}

export interface AudioTrackMetadata {
  trackId: string;
  roomId: string;
  duration: number;
}

export interface ToolResultMetadata {
  toolName: string;
  executionTime: number;
  success: boolean;
  result: any;
}

export interface LiveKitRoomConfig {
  roomName: string;
  token: string;
  serverUrl: string;
  connectOptions?: {
    autoSubscribe: boolean;
    adaptiveStream: boolean;
    dynacast: boolean;
  };
}

export interface MultimodalAgentConfig {
  model: string;
  voice: string;
  voiceSpeed?: number;
  vadOptions?: {
    mode: 'auto' | 'sensitive' | 'manual';
    threshold?: number;
    silenceDuration?: number;
  };
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
- [x] Develop turn-taking management system

### In Progress
- [ ] Integrate LiveKit voice services with existing bot response system
- [ ] Verify tool calling functionality with voice inputs
- [ ] Ensure context maintenance across text and voice modalities

### Upcoming
- [ ] Create test suite for LiveKit integration
- [ ] Test multi-user voice scenarios and cross-device compatibility
- [ ] Optimize voice performance for mobile environments
- [ ] Implement progressive enhancement for slower connections

## Directory Structure

```
/app/usergroupchatcontext/
  ├── components/
  │   ├── chat/
  │   ├── settings/
  │   ├── tools/
  │   └── voice/
  ├── hooks/
  ├── context/
  ├── services/
  │   ├── livekit/
  │   ├── openai/
  │   └── core/
  ├── types/
  ├── utils/
  ├── page.tsx
  └── layout.tsx
```

## Architectural Advantages

- **WebRTC Benefits**: Lower latency, global edge network, simplified implementation
- **Voice Activity Detection**: Natural conversation flow, efficient audio transmission
- **Multi-modal Integration**: Unified context across text and voice interactions
- **Mobile-First Design**: Responsive design, touch-friendly interface, efficient resource usage

## Next Steps
1. Complete the turn-taking management system
2. Integrate LiveKit voice services with the bot response system
3. Create test cases for voice-based tool calling
4. Set up cross-device testing environment 