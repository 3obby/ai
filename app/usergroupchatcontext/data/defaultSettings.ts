import { GroupChatSettings } from '../types';

export const defaultGroupChatSettings: GroupChatSettings = {
  name: 'AI Group Chat',
  activeBotIds: ['researcher', 'critic', 'creative'],
  responseMode: 'sequential',
  maxRecursionDepth: 3,
  systemPrompt: `You are participating in a group chat with multiple AI assistants and a human user. 
  Each assistant has different expertise and personalities. 
  Respond in a helpful, concise manner staying within your defined role.
  The user's name is {{userName}}.
  Current active assistants: {{activeBots}}.
  Current date and time: {{datetime}}.`,
  processing: {
    enablePreProcessing: true,
    enablePostProcessing: true,
    preprocessingPrompt: 'Analyze this user message and clarify any ambiguities. If the message seems incomplete, unclear, or could benefit from more context, suggest ways to improve it.',
    postprocessingPrompt: 'Review this response for accuracy, relevance, and helpfulness. Ensure it directly addresses the user\'s query in a clear and concise manner. Correct any factual errors and improve clarity where needed.'
  },
  ui: {
    theme: 'dark',
    messageBubbleStyle: 'modern',
    enabledFeatures: {
      voice: true,
      debugInfo: true,
      metadata: false,
      typing: true
    }
  }
}; 