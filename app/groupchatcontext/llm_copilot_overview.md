# GroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can interact with multiple AI bots through text and voice. The system enables seamless transitions between text and voice inputs, with full transcription capabilities powered by OpenAI Whisper. Each bot can be individually configured with custom prompts, processing rules, and tool capabilities.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GroupChatContext                       │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  User I/O   │    │ Bot Manager │    │ Settings System │  │
│  │ Text & Voice│◄──►│             │◄──►│                 │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│                            │                    ▲            │
│                            ▼                    │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ Transcription│   │ Bot Instance│    │ Prompt Processor │  │
│  │   Service   │◄──►│  Registry   │◄──►│ Pre/Post Hooks   │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│                            │                    ▲            │
│                            ▼                    │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ Tool Calling│◄──►│ Bot Response│◄──►│ Recursion Control│  │
│  │   System    │    │  Pipeline   │    │     System      │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### Core Components

1. **GroupChatProvider**
   - Top-level context provider
   - Manages global state and configuration
   - Handles synchronous/asynchronous response modes
   - Provides chat history and session management

2. **BotRegistry**
   - Manages available and active bots
   - Handles bot activation/deactivation
   - Stores bot configurations

3. **MessageProcessor**
   - Central message handling pipeline
   - Routes messages to appropriate bots
   - Manages message sequencing and threading

### Input/Output Components

1. **ChatInterface**
   - Minimal, mobile-first UI component
   - Text input with microphone toggle
   - Message thread display with typing indicators
   - Settings access button

2. **TranscriptionService**
   - Wraps OpenAI Whisper realtime API
   - Manages voice capture and streaming
   - Handles interim and final transcriptions

3. **BotResponseRenderer**
   - Renders bot responses with appropriate styling
   - Handles different response types (text, tool results)
   - Manages response animations and transitions

### Configuration Components

1. **GroupSettingsPanel**
   - Global chat settings UI
   - Bot selection and ordering
   - Response mode configuration (sync/async)
   - Global parameters (temperature, etc.)

2. **BotConfigPanel**
   - Per-bot configuration interface
   - Custom prompt editing
   - Tool enabling/disabling
   - Response characteristics adjustment

3. **PromptEditor**
   - Advanced prompt editing interface
   - Pre-processing and post-processing prompt inputs
   - Syntax highlighting and validation
   - Template variable support

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
  voiceConfig?: VoiceConfig;
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
  };
}

export interface TranscriptionMetadata {
  duration: number;
  confidence: number;
  interim: boolean;
}

export interface ToolResultMetadata {
  toolName: string;
  executionTime: number;
  success: boolean;
  result: any;
}

export interface ProcessingMetadata {
  preProcessed: boolean;
  postProcessed: boolean;
  recursionDepth: number;
  processingTime: number;
}

// Prompt Processing
export interface PromptProcessor {
  preProcess(message: Message, bot: Bot, context: GroupChatContext): Promise<string>;
  postProcess(botResponse: string, originalMessage: Message, bot: Bot, context: GroupChatContext): Promise<string>;
}
```

## Data Flow

### Message Flow Diagram

```
┌──────────┐         ┌─────────────┐         ┌───────────┐         ┌───────────────┐
│  User    │         │ GroupChat   │         │  Bot      │         │ External      │
│  Input   │────────▶│ Context     │────────▶│  Manager  │────────▶│ API/Services  │
└──────────┘         └─────────────┘         └───────────┘         └───────────────┘
                            │                       ▲                       │
                            │                       │                       │
                            ▼                       │                       ▼
┌──────────┐         ┌─────────────┐         ┌───────────┐         ┌───────────────┐
│ Display  │◀────────│ Message     │◀────────│ Processing │◀────────│ Tool Execution │
│ Layer    │         │ Processor   │         │ Pipeline   │         │ Service       │
└──────────┘         └─────────────┘         └───────────┘         └───────────────┘
```

### User Input Flow

1. User enters text or activates voice input
2. Voice input is streamed to Whisper for real-time transcription
3. Transcribed text (or direct text input) is formatted as a Message
4. Message is passed to GroupChatContext
5. GroupChatContext dispatches message to BotManager

### Bot Processing Flow

1. BotManager determines which bots should respond based on settings
2. For each responding bot:
   - Message is pre-processed using bot's preProcessingPrompt
   - Processed message is sent to LLM API with bot's parameters
   - Response is post-processed using bot's postProcessingPrompt
   - Response is checked for tool calls and executed if necessary
   - Final response is added to message thread

### Recursive Processing Flow

1. Post-processed responses may trigger recursive handling
2. System checks current recursion depth against maxRecursionDepth
3. If allowed, response is sent back through the processing pipeline
4. Recursion metadata is tracked and displayed in debug mode

## Implementation Plan

### Phase 1: Core Structure

1. Create base `GroupChatContext` and provider
2. Implement `BotRegistry` and `MessageProcessor`
3. Build minimal UI components
4. Migrate existing components from `/demo` directory

### Phase 2: Bot Configuration

1. Implement `GroupSettingsPanel` and `BotConfigPanel`
2. Create prompt editing interface
3. Develop pre/post processing pipeline
4. Implement recursion control system

### Phase 3: Tool Integration

1. Enhance tool calling system
2. Create tool registry and discovery mechanism
3. Implement tool execution pipeline
4. Add tool result rendering components

### Phase 4: Voice Integration

1. Refine transcription service
2. Optimize voice input/output handling
3. Implement voice configuration options
4. Add voice feedback indicators

## Directory Structure

```
/app/groupchatcontext/
  ├── components/
  │   ├── chat/
  │   │   ├── ChatInterface.tsx
  │   │   ├── MessageList.tsx
  │   │   ├── MessageItem.tsx
  │   │   └── InputBar.tsx
  │   ├── settings/
  │   │   ├── GroupSettingsPanel.tsx
  │   │   ├── BotConfigPanel.tsx
  │   │   └── PromptEditor.tsx
  │   └── tools/
  │       ├── ToolResultDisplay.tsx
  │       └── ToolCallIndicator.tsx
  ├── hooks/
  │   ├── useGroupChat.ts
  │   ├── useBotRegistry.ts
  │   ├── useMessageProcessor.ts
  │   └── useVoiceTranscription.ts
  ├── context/
  │   ├── GroupChatProvider.tsx
  │   ├── BotRegistryProvider.tsx
  │   └── ToolRegistryProvider.tsx
  ├── services/
  │   ├── transcription-service.ts
  │   ├── bot-service.ts
  │   ├── tool-execution-service.ts
  │   └── prompt-processor-service.ts
  ├── types/
  │   ├── bots.ts
  │   ├── messages.ts
  │   ├── tools.ts
  │   └── settings.ts
  ├── utils/
  │   ├── prompt-helpers.ts
  │   ├── recursion-controller.ts
  │   └── message-formatter.ts
  ├── page.tsx
  └── layout.tsx
```

## Migration Strategy

### From Demo to GroupChatContext

1. Copy core functionality from `/demo` into new structure
2. Rename "companions" to "bots" throughout the codebase
3. Refactor `GroupChatDemo.tsx` into smaller components
4. Implement new features (prompt processing, recursion control)
5. Add comprehensive typing throughout
6. Create new tests for core components

### Refactoring Large Components

1. Extract stateful logic from `GroupChatDemo.tsx` to hooks
2. Break UI into smaller, focused components
3. Implement context providers for state management
4. Create utility functions for common operations

## Architectural Decisions

### Why Context-Based Architecture?

1. **Cleaner State Management**: React Context provides centralized, hierarchical state
2. **Reduced Prop Drilling**: Components can access state without passing through intermediaries
3. **Separation of Concerns**: Clear boundaries between UI, state, and business logic
4. **Improved Testing**: Easier to test isolated components with mock contexts

### Pre/Post Processing Design

The pre/post processing system allows for flexible bot behavior modification:

1. **Pre-processing**: Modifies user messages before they reach the bot
   - Can add context, format input, or inject specific instructions
   - Allows for specialized bot behaviors without changing base prompts

2. **Post-processing**: Transforms bot responses before display
   - Can format outputs, filter content, or trigger additional actions
   - Enables recursive handling for complex interactions

### Recursion Control

The recursion control system prevents infinite loops while allowing for complex interactions:

1. **Depth Tracking**: Each message tracks its recursion depth
2. **Configurable Limits**: Users can set maximum recursion depth
3. **Transparency**: UI indicates when recursion is occurring
4. **Exit Conditions**: Clear rules for when recursion should terminate

## Integration Points

1. **OpenAI API Integration**:
   - Text generation (GPT models)
   - Voice transcription (Whisper)
   - Text-to-speech

2. **Tool Services**:
   - Web search
   - Data visualization
   - External API connections

3. **Mobile Integration**:
   - Responsive design for mobile-first experience
   - Touch-friendly interface
   - Efficient handling of limited screen space

This architecture provides a clean, extensible framework for building a powerful yet minimal group chat interface with sophisticated AI capabilities. 