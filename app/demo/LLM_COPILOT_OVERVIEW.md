# Mobile AI Toolbox Chat Architecture

## Overview

The Mobile AI Toolbox Chat (currently in the `/demo` directory) is a feature-rich, customizable group chat environment that enables users to interact with multiple AI companions through text and voice. The application integrates various AI capabilities including real-time speech transcription, text chat, voice interaction, and tool usage within a unified interface.

## Core Architecture

```
┌────────────────────────────────────────────────────────┐
│                  Mobile AI Toolbox Chat                │
│                                                        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │    Voice    │   │    Chat     │   │    Tools    │  │
│  │ Transcription│──▶│  Interface  │◀──│   System    │  │
│  └─────────────┘   └──────┬──────┘   └─────────────┘  │
│         ▲                 │                  ▲         │
│         │                 ▼                  │         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │   Audio     │   │  Companion  │──▶│   Service   │  │
│  │ Processing  │◀──│   System    │   │    Layer    │  │
│  └─────────────┘   └─────────────┘   └─────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Key Components and Their Relationships

### UI Layer Components

1. **GroupChatDemo.tsx**: The main orchestrator component that integrates all features
   - Renders the chat interface
   - Manages state for transcription, companions, and tools
   - Coordinates communication between user input and AI responses

2. **Chat Components**:
   - `ChatMessages.tsx`: Renders the message thread
   - `ChatInput.tsx`: Handles text input and submission
   - `ChatMessage.tsx`: Individual message display with support for text, audio, and tool call results
   - `Message.tsx`: Simpler message renderer for basic text content

3. **Audio Components**:
   - `AudioWaveform.tsx`: Visual representation of audio input/output
   - `AudioPlayer.tsx`: Playback controls for audio messages
   - `AudioControls.tsx`: Interface for recording and managing audio
   - `TranscriptionStatus.tsx`: Displays real-time transcription status

4. **Settings Components**:
   - `DemoSettingsDialog.tsx`: Main settings dialog
   - `CompanionSettingsModal.tsx`: Configuration for companion AI behaviors
   - Various settings sub-components in `settings/` directory

5. **Debug Components**:
   - `DebugInfo.tsx`: Displays technical information for debugging
   - `DebugPanel.tsx`: Comprehensive debug interface

### State Management Layer

1. **Custom Hooks**:
   - `useGroupChat.ts`: Manages chat state and message operations
   - `useAudioTranscription.ts`: Handles audio transcription state and operations
   - `useToolCalling.ts`: Manages tool integration and execution
   - `useCompanions.ts`: Manages AI companion configurations and state

2. **Types System**:
   - `companions.ts`: Defines companion interfaces and message structures
   - `settings.ts`: Configurable settings for the application
   - `tools.ts`: Tool calling interface definitions

### Service Layer

1. **AI Services**:
   - `companions-service.ts`: Predefined companions and companion management
   - `openai-service.ts`: Integration with OpenAI services

2. **Audio Processing Services**:
   - `webrtc-transcription-service.ts`: Real-time audio transcription using WebRTC
   - `whisper-service.ts`: Integration with OpenAI Whisper for transcription
   - `realtime-transcription-service.ts`: Enhanced real-time transcription capabilities

3. **Tool Services**:
   - `brave-search-service.ts`: Web search capabilities for companions

## Data Flow Diagram

```
┌───────────┐         ┌───────────┐         ┌───────────┐
│  User     │         │  Chat     │         │  Service  │
│  Input    │────────▶│  System   │────────▶│  Layer    │
└───────────┘         └───────────┘         └───────────┘
                           │  ▲                   │
                           │  │                   │
                           ▼  │                   ▼
┌───────────┐         ┌───────────┐         ┌───────────┐
│  Audio    │         │  Message  │◀────────│  AI       │
│  System   │────────▶│  Display  │         │  Response │
└───────────┘         └───────────┘         └───────────┘
```

1. **User Input Flow**:
   - Text input → `ChatInput` → `useGroupChat` → Message display
   - Voice input → `AudioControls` → `useAudioTranscription` → Transcription → Message display

2. **AI Response Flow**:
   - User message → `companions-service` → OpenAI API → AI response → Message display
   - With tools: AI response → `useToolCalling` → Tool execution → Result → Message display

3. **Audio Output Flow**:
   - AI response → Text-to-speech → `AudioPlayer` → Audio playback

## Type System and Domain Model

### Companion System

The companion system is built around the `Companion` interface, which defines:

```typescript
export interface Companion {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  interests: string[];
  effort?: number;        // How much the companion contributes to conversation
  temperature?: number;   // Controls randomness in responses
  maxResponseTokens?: number;
  toolCalling?: boolean;  // Whether this companion can use tools
  voice?: string;         // TTS voice settings
  vadMode?: string;       // Voice activity detection mode
  modality?: string;      // Text, voice, or both
  turnDetection?: {       // Conversation turn detection settings
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    createResponse?: boolean;
  };
  audioFormat?: string;
  voiceConfig?: VoiceConfig;
}
```

### Message System

Messages are structured through the `Message` interface:

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  senderName: string;
  senderAvatar: string;
  timestamp: string | Date;
  senderId?: string;
  isUser?: boolean;
  isInterim?: boolean;    // For in-progress transcriptions
  messageType?: 'text' | 'tool_call' | 'audio';
  metadata?: {            // Additional data for audio messages
    transcriptionType?: 'user-audio' | 'assistant-audio';
    duration?: number;
    language?: string;
    segments?: Array<{ /*...*/ }>;
    words?: Array<{ /*...*/ }>;
  };
  debugInfo?: {           // Tool call information and debugging
    toolsCalled?: { /*...*/ };
    [key: string]: any;
  };
}
```

### Settings System

The application uses a multi-layered settings system:

1. **Global Settings**: `DemoSettings` interface that includes:
   - Real-time API configuration
   - Voice chat settings
   - Tool calling settings
   - General AI parameters

2. **Per-Companion Settings**: Individual configurations for each AI companion

3. **UI Configuration**: Settings exposed through the UI for user customization

## Component Separation Rationale

1. **Feature-Based Separation**:
   - Audio components are separated to isolate the complex audio processing logic
   - Tool-calling components are separated to maintain clean boundaries between features
   - Settings components are modularized to allow easy addition of new configuration options

2. **Stateful vs. Presentational**:
   - Core state management is handled through custom hooks (e.g., `useGroupChat`)
   - UI components focus on rendering and user interaction
   - Service layer handles external API communication

3. **Reusability Considerations**:
   - Common UI elements like `Message.tsx` are designed for reuse
   - The transcription services are designed to be used independently

4. **Testing and Maintenance**:
   - Clear separation makes it easier to test individual components
   - Service layer abstractions allow for mocking external dependencies

## Development Areas

1. **Refactoring Opportunities**:
   - `GroupChatDemo.tsx` is currently too large (966 lines) and should be broken down
   - Audio transcription logic should be further extracted into dedicated hooks
   - State management could benefit from React Context or similar pattern

2. **Type System Improvements**:
   - More comprehensive typing for tool calling interfaces
   - Better documentation of complex types

3. **Performance Considerations**:
   - Message rendering optimization for long conversations
   - Audio processing efficiency

## Planned Enhancements

1. **Renaming**: From "demo" to "mobileaitoolboxchat" for clarity
2. **Enhanced Accessibility**: Improved support for screen readers and keyboard navigation
3. **Expanded Tooling**: Additional tool integrations for companions
4. **Test Coverage**: Comprehensive test suite for critical components

## Integration Points

The Mobile AI Toolbox Chat integrates with:

1. OpenAI API for:
   - Text generation (GPT models)
   - Audio transcription (Whisper)
   - Voice generation (TTS)

2. WebRTC for real-time audio processing
3. External tool APIs (e.g., Brave Search)

This architecture provides a flexible, extensible framework for building complex AI chat applications with voice capabilities and tool integration. 