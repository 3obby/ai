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


## Type System

```typescript
// Bot types
export type BotId = string;

export interface Bot {
  id: string;
  name: string;
  description: string;
  avatar: string;
  model: string;
  systemPrompt: string;
  preProcessingPrompt?: string;
  postProcessingPrompt?: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  useTools: boolean;
  enableReprocessing?: boolean;
}

// Message types
export type MessageId = string;
export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  processingInfo?: {
    preprocessedContent?: string;
    postprocessedContent?: string;
    processingTime?: number;
    reprocessingDepth?: number;
  };
  toolResults?: {
    toolName: string;
    result: any;
    timestamp: number;
  }[];
}

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
  reprocessingDepth?: number;
  processingTime?: number;
  originalContent?: string;
  modifiedContent?: string;
  preprocessedContent?: string;
  postprocessedContent?: string;
  usedMockService?: boolean;
}

// Voice-related settings
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

// Settings types
export type ResponseMode = 'sequential' | 'roundRobin' | 'all';

export interface GroupChatSettings {
  name: string;
  activeBotIds: string[];
  responseMode: 'sequential' | 'parallel';
  maxReprocessingDepth: number;
  systemPrompt: string;
  voiceSettings?: VoiceSettings;
  processing: {
    enablePreProcessing: boolean;
    enablePostProcessing: boolean;
    preProcessingPrompt: string;
    postProcessingPrompt: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    messageBubbleStyle: 'modern' | 'classic';
    enableVoice: boolean;
    enableTyping: boolean;
    showTimestamps: boolean;
    showAvatars: boolean;
    showDebugInfo: boolean;
  };
}

// Context types
export interface GroupChatState {
  settings: GroupChatSettings;
  messages: Message[];
  isRecording: boolean;
  isProcessing: boolean;
  settingsOpen: boolean;
  activeSettingsTab: string;
  selectedBotId: string | null;
  typingBotIds: string[];
  isLoading: boolean;
  error?: string;
}

export type GroupChatAction =
  | { type: 'SET_SETTINGS'; payload: Partial<GroupChatSettings> }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGES'; messages: Message[] }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_BOTS'; bots: Bot[] }
  | { type: 'ADD_BOT'; bot: Bot }
  | { type: 'REMOVE_BOT'; botId: BotId }
  | { type: 'UPDATE_BOT'; botId: BotId; updates: Partial<Bot> }
  | { type: 'UPDATE_VOICE_SETTINGS'; payload: Partial<VoiceSettings> }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_TYPING_BOTS'; botIds: BotId[] }
  | { type: 'ADD_TYPING_BOT'; botId: BotId }
  | { type: 'REMOVE_TYPING_BOT'; botId: BotId }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'TOGGLE_RECORDING' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_ACTIVE_SETTINGS_TAB'; payload: string }
  | { type: 'SET_SELECTED_BOT'; payload: string | null }
  | { type: 'SET_TYPING_BOT_IDS'; payload: string[] }
  | { type: 'RESET_CHAT' }; 
```

## Implementation Status

### Completed
- [x] No previous completion data found

### In Progress
- [ ] No previous in-progress data found

## Directory Structure

```
/app/usergroupchatcontext/
├── api/
  ├── companion-response/
  ├── livekit/
    ├── room/
      ├── route.ts (5.6KB)
    ├── token/
      ├── route.ts (5.4KB)
  ├── openai/
    ├── chat/
      ├── route.ts (2.2KB)
├── components/
  ├── bots/
    ├── BotCard.tsx (3.5KB)
  ├── chat/
    ├── ChatContainer.tsx (0.4KB)
    ├── ChatHeader.tsx (1KB)
    ├── ChatInput.tsx (3.5KB)
    ├── ChatInterface.tsx (4.5KB)
    ├── MessageBubble.tsx (3.5KB)
    ├── MessageInput.tsx (2.7KB)
    ├── MessageItem.tsx (22.4KB)
    ├── MessageList.tsx (1.2KB)
    ├── MessageSpeaker.tsx (2.2KB)
    ├── OpenAIVoiceButton.tsx (3.6KB)
    ├── TypingIndicator.tsx (1.5KB)
    ├── VoiceInputButton.tsx (5.8KB)
  ├── debug/
    ├── DebugInfo.tsx (5.3KB)
    ├── ProcessingInfo.tsx (3.5KB)
  ├── settings/
    ├── BotConfigPanel.tsx (21.8KB)
    ├── BotSettingsModal.tsx (1KB)
    ├── GroupSettingsPanel.tsx (13.3KB)
    ├── PromptEditor.tsx (4.8KB)
    ├── SettingsModal.tsx (2.5KB)
    ├── SettingsPanel.tsx (10.4KB)
    ├── VoiceSettingsPanel.tsx (15.8KB)
  ├── tools/
    ├── ToolCallWrapper.tsx (3.4KB)
    ├── ToolIntegrationProvider.tsx (0.5KB) # State/service provider
    ├── ToolPanel.tsx (5KB)
    ├── VoiceToolConfirmation.tsx (4.7KB)
  ├── voice/
    ├── AudioVisualizer.tsx (2.2KB)
    ├── VoiceActivityIndicator.tsx (0.7KB)
    ├── VoiceAnalytics.tsx (7.2KB)
    ├── VoiceCommandController.tsx (14.4KB)
    ├── VoiceConversationController.tsx (12.8KB)
    ├── VoiceInputButton.tsx (3.1KB)
    ├── VoiceIntegration.tsx (3.1KB)
    ├── VoicePlaybackControls.tsx (3.4KB)
    ├── VoiceResponseManager.tsx (6KB)
├── context/
  ├── BotRegistryContext.tsx (1.7KB) # Context definition
  ├── BotRegistryProvider.tsx (3.4KB) # State/service provider
  ├── GroupChatContext.tsx (3.1KB) # Context definition
  ├── GroupChatProvider.tsx (6.5KB) # State/service provider
  ├── LiveKitIntegrationProvider.tsx (19.4KB) # State/service provider
  ├── LiveKitProvider.tsx (6.2KB) # State/service provider
  ├── ToolCallProvider.tsx (5.4KB) # State/service provider
├── data/
  ├── defaultSettings.ts (1KB)
  ├── sampleBots.ts (3.7KB)
├── hooks/
  ├── useGroupChat.ts (3.2KB)
  ├── useLiveKit.ts (4KB)
  ├── usePromptProcessor.ts (3.3KB)
  ├── useRealGroupChat.ts (4KB)
  ├── useToolIntegration.ts (6.9KB)
  ├── useTurnTaking.ts (4.2KB)
  ├── useVoiceActivity.ts (2.5KB)
  ├── useVoiceSettings.ts (4.4KB)
  ├── useVoiceToolConfirmation.ts (2.1KB)
├── k.bak (15.9KB)
├── k.md (21.1KB)
├── ka.md (7.8KB)
├── layout.tsx (0.4KB)
├── llm_copilot_overview_and_todo.md (15.6KB)
├── mobile.css (1.7KB)
├── page.tsx (5.2KB)
├── scripts/
  ├── generate-test.js (1.9KB)
  ├── update-readme.js (1.7KB)
├── services/
  ├── livekit/
    ├── livekit-api-client.ts (3.8KB)
    ├── livekit-service.ts (3.3KB)
    ├── multimodal-agent-service.ts (14KB)
    ├── room-session-manager.ts (6.4KB)
    ├── turn-taking-service.ts (20.3KB)
    ├── voice-activity-service.ts (9.5KB)
  ├── mockBotService.ts (8.1KB) # Service implementation
  ├── openaiChatService.ts (2.7KB) # Service implementation
  ├── openaiRealtimeService.ts (13.1KB) # Service implementation
  ├── prompt-processor-service.ts (8.5KB)
  ├── toolCallService.ts (5.8KB) # Service implementation
  ├── toolProcessorService.ts (4.7KB) # Service implementation
  ├── tools/
    ├── voiceTimerTool.ts (8.8KB)
    ├── voiceWeatherTool.ts (6.9KB)
  ├── voice/
    ├── voice-analytics-service.ts (13KB)
    ├── voice-auth-service.ts (12.1KB)
  ├── voiceSynthesisService.ts (6.2KB) # Service implementation
  ├── voiceToolCallingService.ts (11.7KB) # Service implementation
  ├── voiceToolRegistry.ts (2.9KB)
  ├── voiceTranscriptionService.ts (7.3KB) # Service implementation
├── types/
  ├── bots.ts (1.5KB)
  ├── index.ts (0.1KB)
  ├── livekit.ts (2.4KB)
  ├── messages.ts (2.7KB)
  ├── settings.ts (3.1KB)
  ├── voice.ts (2.8KB)
├── types.ts (4KB) # Type definitions
├── utils/
  ├── generateReadme.js (5.2KB)
  ├── livekit-auth.ts (2.9KB)
  ├── llm_copilot_part1.md (6.8KB)
  ├── toolResponseFormatter.ts (3.7KB)
```

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