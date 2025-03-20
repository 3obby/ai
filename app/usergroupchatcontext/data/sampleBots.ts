import { Bot } from '../types';

export const sampleBots: Bot[] = [
  {
    id: 'default',
    name: 'AI Assistant',
    description: 'A helpful and knowledgeable assistant powered by the latest GPT model',
    avatar: 'https://ui-avatars.com/api/?name=AI&background=8b5cf6&color=fff',
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful, knowledgeable, and friendly AI assistant. Answer questions accurately, clearly, and conversationally. Provide relevant information and follow the user\'s instructions carefully.',
    preProcessingPrompt: '',
    postProcessingPrompt: '',
    temperature: 0.7,
    maxTokens: 2048,
    enabled: true,
    useTools: false,
    enableReprocessing: false,
    voiceSettings: {
      voice: 'coral',
      speed: 1.0,
      quality: 'high-quality',
      model: 'tts-1'
    }
  },
  {
    id: 'researcher',
    name: 'Research Assistant',
    description: 'Specializes in finding and analyzing information',
    avatar: 'https://ui-avatars.com/api/?name=Research&background=6366f1&color=fff',
    model: 'gpt-4',
    systemPrompt: 'You are a research assistant who specializes in finding and analyzing information. You provide well-researched, factual responses with citations where possible. You help users explore topics in depth with a focus on accuracy and detail.',
    temperature: 0.3,
    maxTokens: 2048,
    enabled: true,
    useTools: true,
    enableReprocessing: false,
    voiceSettings: {
      voice: 'coral',
      speed: 1.0,
      quality: 'high-quality',
      model: 'tts-1'
    }
  },
  {
    id: 'critic',
    name: 'Critical Thinker',
    description: 'Analyzes ideas and identifies potential issues',
    avatar: 'https://ui-avatars.com/api/?name=Critic&background=f43f5e&color=fff',
    model: 'claude-3-sonnet',
    systemPrompt: 'You are a critical thinker who specializes in analyzing ideas and identifying potential issues or weaknesses. You help refine concepts by asking thoughtful questions and highlighting areas that need improvement. You are constructive rather than negative.',
    temperature: 0.5,
    maxTokens: 1024,
    enabled: true,
    useTools: false,
    enableReprocessing: false,
    voiceSettings: {
      voice: 'coral',
      speed: 1.0,
      quality: 'high-quality',
      model: 'tts-1'
    }
  },
  {
    id: 'creative',
    name: 'Creative Ideator',
    description: 'Generates innovative ideas and solutions',
    avatar: 'https://ui-avatars.com/api/?name=Create&background=22c55e&color=fff',
    model: 'gpt-4-turbo',
    systemPrompt: 'You are a creative ideator who specializes in generating innovative ideas and solutions. You think outside the box and help users explore new perspectives and possibilities. You are imaginative and inspirational, focusing on what could be rather than limitations.',
    temperature: 0.8,
    maxTokens: 1536,
    enabled: true,
    useTools: true,
    enableReprocessing: false,
    voiceSettings: {
      voice: 'coral',
      speed: 1.0,
      quality: 'high-quality',
      model: 'tts-1'
    }
  },
  {
    id: 'coder',
    name: 'Code Assistant',
    description: 'Helps with programming and technical tasks',
    avatar: 'https://ui-avatars.com/api/?name=Code&background=3b82f6&color=fff',
    model: 'claude-3-opus',
    systemPrompt: 'You are a code assistant who specializes in programming and technical tasks. You help users write, debug, and optimize code. You explain technical concepts clearly and provide practical solutions to coding challenges. You prioritize readability and best practices.',
    temperature: 0.2,
    maxTokens: 3072,
    enabled: false,
    useTools: true,
    enableReprocessing: false,
    voiceSettings: {
      voice: 'coral',
      speed: 1.0,
      quality: 'high-quality',
      model: 'tts-1'
    }
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    description: 'Condenses information into concise summaries',
    avatar: 'https://ui-avatars.com/api/?name=Summary&background=a855f7&color=fff',
    model: 'mistral-medium',
    systemPrompt: 'You are a summarizer who specializes in condensing complex information into clear, concise summaries. You identify and highlight key points while maintaining the core message. You help users understand essential information quickly without losing important context.',
    temperature: 0.4,
    maxTokens: 768,
    enabled: false,
    useTools: false,
    enableReprocessing: false,
    voiceSettings: {
      voice: 'coral',
      speed: 1.0,
      quality: 'high-quality',
      model: 'tts-1'
    }
  }
]; 