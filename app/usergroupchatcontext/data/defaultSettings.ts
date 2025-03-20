import { GroupChatSettings } from '../types';

export const defaultGroupChatSettings: GroupChatSettings = {
  name: 'AI Assistant Chat',
  activeBotIds: ['default'],
  responseMode: 'sequential',
  maxReprocessingDepth: 3,
  systemPrompt: 'This is a chat with an AI assistant powered by the latest GPT model.',
  processing: {
    enablePreProcessing: true,
    enablePostProcessing: true,
    preProcessingPrompt: 'Analyze this user message and clarify any ambiguities. If the message seems incomplete, unclear, or could benefit from more context, suggest ways to improve it.',
    postProcessingPrompt: 'Improve this response by: 1) Ensuring accuracy and clarity 2) Removing repetition 3) Adding relevant context when needed 4) Making the tone consistent and professional 5) Formatting for readability.',
  },
  ui: {
    theme: 'dark',
    messageBubbleStyle: 'modern',
    enableVoice: true,
    enableTyping: true,
    showTimestamps: true,
    showAvatars: true,
    showDebugInfo: true
  }
}; 