# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice. The system features a unified text chat that serves as the central communication hub, capturing all interactions regardless of input method.

## Key Terminology

- **Voice Ghost**: A temporary clone of a text-based bot created when transitioning to voice mode. Voice ghosts maintain conversation context but have specialized voice-optimized settings.
- **Voice Mode**: The interactive state activated by the "voice mode" button at the bottom of the chat interface. In this mode, users converse with bots through speech rather than typing.
- **Unified Text Chat**: The central conversation thread that captures all interactions, whether they originated as text input or transcribed voice.

## Text-Voice Transition System

The system is designed to provide a seamless transition between text and voice interactions:

1. **Text-to-Voice Transition**
   - When a user activates voice mode, a "voice ghost" is created for each active bot
   - Voice ghosts inherit the full conversation context from their text-based counterparts
   - Pre-processing, post-processing, and rework hooks are disabled for voice ghosts
   - The latest OpenAI realtime voice model is automatically selected and initialized with context
   - User speech is captured through WebRTC and streamed to the voice model

2. **Voice-to-Text Transition**
   - When a user deactivates voice mode, the system returns to the text-based model
   - All voice interactions (both user and bot responses) remain in the unified text chat
   - Text-based model regains access to the complete conversation history, including voice exchanges
   - Pre-processing, post-processing, and rework hooks are re-enabled for the text model

All interactions, whether text or voice, are transcribed and stored in the unified text chat, ensuring a consistent conversation thread that maintains full context regardless of the input method.

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
   - Manages voice ghost creation and destruction

3. **Settings System**
   - Connected to Bot Manager (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Stores voice mode configurations

4. **LiveKit Integration**
   - Connected to User I/O  
   - Connected to Bot Instance Registry (bidirectional)  
   - Handles real-time audio streaming and transcription

5. **Bot Instance Registry**
   - Controlled by Bot Manager  
   - Connected to LiveKit Integration (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Manages the Bot Response Pipeline  
   - Tracks both standard bots and their voice ghosts

6. **Prompt Processor (Pre/Post Hooks)**
   - Connected to Bot Instance Registry (bidirectional)  
   - Connected to Settings System (bidirectional)  
   - Connected to Reprocessing Control System (bidirectional)  
   - Disabled for voice ghosts during voice mode

7. **Tool Calling System**
   - Connected to Bot Response Pipeline (bidirectional)  

8. **Bot Response Pipeline**
   - Controlled by Bot Instance Registry  
   - Connected to Tool Calling System (bidirectional)  
   - Connected to Reprocessing Control System (bidirectional)  
   - Routes responses to unified text chat

9. **Reprocessing Control System**
   - Connected to Bot Response Pipeline (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Disabled for voice ghosts during voice mode

## Key Components

### Core Components
1. **GroupChatProvider**  
   - Top-level context provider managing global state, including user and bot data
2. **BotRegistry**  
   - Manages the set of available bots and their configurations  
   - Handles voice ghost registration and lifecycle
3. **MessageProcessor**  
   - Central message-handling pipeline for routing and sequencing  
   - Ensures all messages (text and voice) are recorded in unified text chat

### Input/Output Components
1. **ChatInterface**  
   - Minimal, mobile-first UI supporting text input and a "voice mode" toggle  
   - Displays unified text chat with all interactions
2. **LiveKitService**  
   - Wraps LiveKit's WebRTC functionalities for high-quality voice streaming and automatic transcription  
   - Handles voice activity detection and audio segmentation
3. **BotResponseRenderer**  
   - Displays bot responses with a collapsible view for advanced debugging and signal chain exploration  
   - Shows transcribed voice interactions in the unified text format

### Configuration Components
1. **GroupSettingsPanel**  
   - Global chat settings panel controlling bot selections, response configurations, and advanced processing  
   - Includes voice mode settings and voice ghost behavior options
2. **BotConfigPanel**  
   - Per-bot configuration, including prompts, tools, and pre/post-processing rules  
   - Configures which hooks are disabled during voice mode
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


## TODO

### Completed
- ✅ Voice Detection and Processing
  - Implemented robust voice activity detection
  - Fixed transcription handling via Web Speech API
  - Connected voice transcriptions to unified text chat
  - Added voice mode state management
  - Added visual feedback for microphone levels

### In Progress
- Voice Ghost Implementation
  - Create logic to clone text bots when entering voice mode
  - Implement specialized settings for voice-optimized interactions

- Text-to-Voice Transition
  - Refactor mechanism to automatically disable pre/post/rework hooks on voice ghosts
  - Improve context inheritance from text bot to voice ghost

- Voice-to-Text Transition
  - Enhance system to re-enable processing hooks when returning to text mode
  - Ensure conversation history is properly maintained across transitions

- BotRegistry Voice Ghost Management
  - Add tracking of both standard bots and their voice ghost counterparts
  - Implement voice ghost lifecycle management

- Voice Mode Settings Configuration
  - Add UI controls for voice mode settings in GroupSettingsPanel
  - Create settings storage for voice ghost behavior options

- Bot Manager Voice Ghost Controls
  - Implement creation/destruction methods for voice ghosts
  - Add state tracking for active voice mode sessions

## Type System

```typescript
// Bot types
export type BotId = string;

export interface VoiceSettings {
  voice?: string;
  speed?: number;
  quality?: 'standard' | 'high-quality';
  model?: string;
}

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
  voiceSettings?: VoiceSettings;
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

## Directory Structure

```
/app/usergroupchatcontext/
├── README.md (4.1KB)
├── api/
  ├── latest-openai-models/
    ├── route.ts (1.9KB)
  ├── livekit/
    ├── room/
      ├── route.ts (5.6KB)
    ├── token/
      ├── route.ts (5.4KB)
  ├── livekit-token/
    ├── route.ts (3.8KB)
  ├── openai/
    ├── chat/
      ├── route.ts (2.2KB)
  ├── synthesize-speech/
    ├── route.ts (1.9KB)
├── components/
  ├── bots/
    ├── BotCard.tsx (3.5KB)
  ├── chat/
    ├── ChatContainer.tsx (0.4KB)
    ├── ChatHeader.tsx (1KB)
    ├── ChatInput.tsx (3.7KB)
    ├── ChatInterface.tsx (7.9KB)
    ├── MessageBubble.tsx (3.5KB)
    ├── MessageInput.tsx (2.7KB)
    ├── MessageItem.tsx (22.4KB)
    ├── MessageList.tsx (1.2KB)
    ├── MessageSpeaker.tsx (2.2KB)
    ├── OpenAIVoiceButton.tsx (3.6KB)
    ├── TypingIndicator.tsx (1.5KB)
    ├── VoiceInputButton.tsx (19.8KB)
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
    ├── VoiceBotSelector.tsx (4.7KB)
    ├── VoiceCommandController.tsx (19.8KB)
    ├── VoiceConversationController.tsx (12.8KB)
    ├── VoiceInputButton.tsx (3.1KB)
    ├── VoiceIntegration.tsx (3.1KB)
    ├── VoiceOverlay.tsx (15KB)
    ├── VoicePlaybackControls.tsx (3.4KB)
    ├── VoiceResponseManager.tsx (6KB)
    ├── WebSpeechTest.tsx (8.9KB)
├── context/
  ├── BotRegistryContext.tsx (1.7KB) # Context definition
  ├── BotRegistryProvider.tsx (5.7KB) # State/service provider
  ├── GroupChatContext.tsx (3.4KB) # Context definition
  ├── GroupChatProvider.tsx (6.5KB) # State/service provider
  ├── LiveKitIntegrationProvider.tsx (33.1KB) # State/service provider
  ├── LiveKitProvider.tsx (6.4KB) # State/service provider
  ├── ToolCallProvider.tsx (5.4KB) # State/service provider
├── data/
  ├── defaultSettings.ts (1KB)
  ├── sampleBots.ts (3.7KB)
├── docs/
  ├── pinecone-integration.md (2.8KB)
├── hooks/
  ├── useGroupChat.ts (3.2KB)
  ├── useLiveKit.ts (4KB)
  ├── usePromptProcessor.ts (3.3KB)
  ├── useRealGroupChat.ts (5.9KB)
  ├── useToolIntegration.ts (6.9KB)
  ├── useTurnTaking.ts (4.2KB)
  ├── useVoiceActivity.ts (2.5KB)
  ├── useVoiceSettings.ts (5.7KB)
  ├── useVoiceToolConfirmation.ts (2.1KB)
├── layout.tsx (0.4KB)
├── llm_copilot_overview_and_todo.md (19.2KB)
├── llm_copilot_overview_and_todo.md.bak (17.9KB)
├── mobile.css (2.3KB)
├── page.tsx (9.5KB)
├── scripts/
├── services/
  ├── livekit/
    ├── README.md (3.3KB)
    ├── REFACTORING.md (2.5KB)
    ├── audio-publishing-service.ts (9.4KB)
    ├── audio-track-manager.ts (9.3KB)
    ├── index.ts (1.5KB)
    ├── livekit-api-client.ts (3.8KB)
    ├── livekit-service.ts (8.6KB)
    ├── multimodal-agent-service.ts (17.7KB)
    ├── participant-manager.ts (5.5KB)
    ├── room-session-manager.ts (4.4KB)
    ├── session-connection-manager.ts (8.6KB)
    ├── speech-synthesis-service.ts (6.2KB)
    ├── tool-detection-service.ts (6.2KB)
    ├── transcription-manager.ts (6.6KB)
    ├── turn-taking-service.ts (20.3KB)
    ├── voice-activity-service.ts (16.4KB)
  ├── mockBotService.ts (8.1KB) # Service implementation
  ├── openaiChatService.ts (2.7KB) # Service implementation
  ├── openaiRealtimeService.ts (12.8KB) # Service implementation
  ├── pineconeService.ts (1.6KB) # Service implementation
  ├── prompt-processor-service.ts (11.9KB)
  ├── toolCallService.ts (5.8KB) # Service implementation
  ├── toolProcessorService.ts (4.7KB) # Service implementation
  ├── tools/
    ├── voiceTimerTool.ts (8.8KB)
    ├── voiceWeatherTool.ts (6.9KB)
  ├── voice/
    ├── voice-analytics-service.ts (13KB)
    ├── voice-auth-service.ts (12.1KB)
  ├── voiceSynthesisService.ts (11.2KB) # Service implementation
  ├── voiceToolCallingService.ts (11.7KB) # Service implementation
  ├── voiceToolRegistry.ts (2.9KB)
  ├── voiceTranscriptionService.ts (7.3KB) # Service implementation
├── speech-test/
  ├── page.tsx (0.9KB)
├── tempfix.ts (0.1KB)
├── types/
  ├── bots.ts (1.5KB)
  ├── index.ts (0.1KB)
  ├── livekit.ts (2.4KB)
  ├── messages.ts (2.7KB)
  ├── settings.ts (3.1KB)
  ├── voice.ts (2.9KB)
├── types.ts (4.2KB) # Type definitions
├── utils/
  ├── generateReadme.js (4.6KB)
  ├── livekit-auth.ts (2.9KB)
  ├── llm_copilot_part1.md (9.4KB)
  ├── llm_copilot_todo.txt (1.5KB)
  ├── toolResponseFormatter.ts (3.7KB)
```

