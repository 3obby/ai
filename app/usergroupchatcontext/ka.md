# UserGroupChatContext: Auto-Generated Test README

## Directory Structure
```
- ./api/livekit/room/route.ts
- ./api/livekit/token/route.ts
- ./api/openai/chat/route.ts
- ./components/bots/BotCard.tsx
- ./components/chat/ChatContainer.tsx
- ./components/chat/ChatHeader.tsx
- ./components/chat/ChatInput.tsx
- ./components/chat/ChatInterface.tsx
- ./components/chat/MessageBubble.tsx
- ./components/chat/MessageInput.tsx
- ./components/chat/MessageItem.tsx
- ./components/chat/MessageList.tsx
- ./components/chat/MessageSpeaker.tsx
- ./components/chat/OpenAIVoiceButton.tsx
- ./components/chat/TypingIndicator.tsx
- ./components/chat/VoiceInputButton.tsx
- ./components/debug/DebugInfo.tsx
- ./components/debug/ProcessingInfo.tsx
- ./components/settings/BotConfigPanel.tsx
- ./components/settings/BotSettingsModal.tsx
- ./components/settings/GroupSettingsPanel.tsx
- ./components/settings/PromptEditor.tsx
- ./components/settings/SettingsModal.tsx
- ./components/settings/SettingsPanel.tsx
- ./components/settings/VoiceSettingsPanel.tsx
- ./components/tools/ToolCallWrapper.tsx
- ./components/tools/ToolIntegrationProvider.tsx
- ./components/tools/ToolPanel.tsx
- ./components/tools/VoiceToolConfirmation.tsx
- ./components/voice/AudioVisualizer.tsx
- ./components/voice/VoiceActivityIndicator.tsx
- ./components/voice/VoiceAnalytics.tsx
- ./components/voice/VoiceCommandController.tsx
- ./components/voice/VoiceConversationController.tsx
- ./components/voice/VoiceInputButton.tsx
- ./components/voice/VoiceIntegration.tsx
- ./components/voice/VoicePlaybackControls.tsx
- ./components/voice/VoiceResponseManager.tsx
- ./context/BotRegistryContext.tsx
- ./context/BotRegistryProvider.tsx
- ./context/GroupChatContext.tsx
- ./context/GroupChatProvider.tsx
- ./context/LiveKitIntegrationProvider.tsx
- ./context/LiveKitProvider.tsx
- ./context/ToolCallProvider.tsx
- ./data/defaultSettings.ts
- ./data/sampleBots.ts
- ./hooks/useGroupChat.ts
- ./hooks/useLiveKit.ts
- ./hooks/usePromptProcessor.ts
- ./hooks/useRealGroupChat.ts
- ./hooks/useToolIntegration.ts
- ./hooks/useTurnTaking.ts
- ./hooks/useVoiceActivity.ts
- ./hooks/useVoiceSettings.ts
- ./hooks/useVoiceToolConfirmation.ts
- ./layout.tsx
- ./llm_copilot_overview_and_todo.md
- ./mobile.css
- ./page.tsx
- ./scripts/generate-test-readme.js
- ./scripts/generate-test.js
- ./scripts/update-readme.js
- ./services/.DS_Store
- ./services/livekit/livekit-api-client.ts
- ./services/livekit/livekit-service.ts
- ./services/livekit/multimodal-agent-service.ts
- ./services/livekit/room-session-manager.ts
- ./services/livekit/turn-taking-service.ts
- ./services/livekit/voice-activity-service.ts
- ./services/mockBotService.ts
- ./services/openaiChatService.ts
- ./services/openaiRealtimeService.ts
- ./services/prompt-processor-service.ts
- ./services/toolCallService.ts
- ./services/toolProcessorService.ts
- ./services/tools/voiceTimerTool.ts
- ./services/tools/voiceWeatherTool.ts
- ./services/voice/voice-analytics-service.ts
- ./services/voice/voice-auth-service.ts
- ./services/voiceSynthesisService.ts
- ./services/voiceToolCallingService.ts
- ./services/voiceToolRegistry.ts
- ./services/voiceTranscriptionService.ts
- ./types.ts
- ./types/bots.ts
- ./types/index.ts
- ./types/livekit.ts
- ./types/messages.ts
- ./types/settings.ts
- ./types/voice.ts
- ./utils/generateReadme.ts
- ./utils/generateTestReadme.ts
- ./utils/livekit-auth.ts
- ./utils/toolResponseFormatter.ts
```

## Type Definitions
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

This is a test README generated automatically to demonstrate the auto-generation capability.
The real README generator would include:

1. Complete directory structure with comments
2. Extracted type definitions directly from the codebase
3. Current implementation status
4. Architecture diagrams
5. Next implementation steps

## Generated on
2025-03-18T06:26:43.382Z
