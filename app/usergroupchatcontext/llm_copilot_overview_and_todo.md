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
  bots: Bot[];
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
├── README.md (4.1KB)
├── api/
  ├── companion-response/
  ├── latest-openai-models/
    ├── route.ts (1.9KB)
  ├── livekit/
    ├── room/
      ├── route.ts (5.6KB)
    ├── token/
      ├── route.ts (5.4KB)
  ├── livekit-token/
    ├── route.ts (2.1KB)
  ├── openai/
    ├── chat/
      ├── route.ts (2.2KB)
  ├── synthesize-speech/
    ├── route.ts (2.4KB)
├── components/
  ├── bots/
    ├── BotCard.tsx (3.5KB)
  ├── chat/
    ├── ChatContainer.tsx (0.4KB)
    ├── ChatHeader.tsx (1KB)
    ├── ChatInput.tsx (3.7KB)
    ├── ChatInterface.tsx (4.5KB)
    ├── MessageBubble.tsx (3.5KB)
    ├── MessageInput.tsx (2.7KB)
    ├── MessageItem.tsx (22.4KB)
    ├── MessageList.tsx (1.2KB)
    ├── MessageSpeaker.tsx (2.2KB)
    ├── OpenAIVoiceButton.tsx (3.6KB)
    ├── TypingIndicator.tsx (1.5KB)
    ├── VoiceInputButton.tsx (11KB)
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
    ├── AudioVisualizer.tsx (1.7KB)
    ├── VoiceActivityIndicator.tsx (0.7KB)
    ├── VoiceAnalytics.tsx (7.2KB)
    ├── VoiceCommandController.tsx (14.4KB)
    ├── VoiceConversationController.tsx (12.8KB)
    ├── VoiceInputButton.tsx (3.1KB)
    ├── VoiceIntegration.tsx (3.1KB)
    ├── VoiceOverlay.tsx (14.9KB)
    ├── VoicePlaybackControls.tsx (3.4KB)
    ├── VoiceResponseManager.tsx (6KB)
    ├── WebSpeechTest.tsx (8.9KB)
├── context/
  ├── BotRegistryContext.tsx (1.7KB) # Context definition
  ├── BotRegistryProvider.tsx (3.4KB) # State/service provider
  ├── GroupChatContext.tsx (3.4KB) # Context definition
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
├── llm_copilot_overview_and_todo.md (17.1KB)
├── mobile.css (2.3KB)
├── page.tsx (5.3KB)
├── scripts/
  ├── generate-test.js (1.9KB)
  ├── update-readme.js (1.7KB)
├── services/
  ├── livekit/
    ├── livekit-api-client.ts (3.8KB)
    ├── livekit-service.ts (6KB)
    ├── multimodal-agent-service.ts (29.6KB)
    ├── room-session-manager.ts (15KB)
    ├── turn-taking-service.ts (20.3KB)
    ├── voice-activity-service.ts (16.4KB)
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
├── speech-test/
  ├── page.tsx (0.9KB)
├── types/
  ├── bots.ts (1.5KB)
  ├── index.ts (0.1KB)
  ├── livekit.ts (2.4KB)
  ├── messages.ts (2.7KB)
  ├── settings.ts (3.1KB)
  ├── voice.ts (2.9KB)
├── types.ts (4KB) # Type definitions
├── utils/
  ├── generateReadme.js (5.2KB)
  ├── livekit-auth.ts (2.9KB)
  ├── llm_copilot_part1.md (8.2KB)
  ├── toolResponseFormatter.ts (3.7KB)
```

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