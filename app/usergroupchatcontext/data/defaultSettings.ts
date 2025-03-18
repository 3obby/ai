import { GroupChatSettings } from '../types';

export const defaultGroupChatSettings: GroupChatSettings = {
  name: 'AI Assistant Chat',
  activeBotIds: ['default'],
  responseMode: 'sequential',
  maxRecursionDepth: 3,
  systemPrompt: 'This is a chat with an AI assistant powered by the latest GPT model.',
  processing: {
    enablePreProcessing: true,
    enablePostProcessing: true,
    preProcessingPrompt: 'Analyze this user message and clarify any ambiguities. If the message seems incomplete, unclear, or could benefit from more context, suggest ways to improve it.',
    postProcessingPrompt: 'Analyze the assistant response and ensure it is helpful, accurate, and appropriately formatted. Add information where necessary. Remove repetition.',
  },
  ui: {
    theme: 'dark',
    messageBubbleStyle: 'modern',
    enableVoice: false,
    enableTyping: true,
    showTimestamps: true,
    showAvatars: true,
    showDebugInfo: true
  }
}; 