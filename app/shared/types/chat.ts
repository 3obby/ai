/**
 * Simplified Chat Data Models
 * 
 * These models implement the unified approach described in the restructuring plan:
 * 1. Unified Chat Model with type discriminator
 * 2. Config-as-Extension approach
 * 3. Role-Based Participants standardization
 */

export enum ChatType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
}

export enum ParticipantType {
  USER = 'user',
  COMPANION = 'companion',
}

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  OBSERVER = 'observer',
}

/**
 * Unified Chat model that works for both individual and group chats
 */
export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  config: ChatConfig; // Embed config in the chat record
  participants: ChatParticipant[];
  messages: ChatMessage[];
}

/**
 * Chat configuration as an extension to the chat model
 */
export interface ChatConfig {
  id: string;
  chatId: string;
  systemPrompt?: string;
  temperature?: number;
  modelName?: string;
  maxTokens?: number;
  contextWindow?: number;
  customSettings?: Record<string, any>; // For additional flexible settings
}

/**
 * Unified participant model that works for both users and companions
 */
export interface ChatParticipant {
  id: string;
  chatId: string;
  participantId: string;
  participantType: ParticipantType;
  role: ParticipantRole;
  joinedAt: Date;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Simplified message model
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: ParticipantType;
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>; // For additional message data like attachments, etc.
}

/**
 * Factory function to create a new individual chat
 */
export function createIndividualChat(creatorId: string, companionId: string): Omit<Chat, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: ChatType.INDIVIDUAL,
    name: 'Individual Chat', // Will be updated with companion name
    creatorId,
    config: {
      id: '', // Will be generated
      chatId: '', // Will be linked
      systemPrompt: '',
      temperature: 0.7,
      modelName: 'default',
    },
    participants: [],
    messages: [],
  };
}

/**
 * Factory function to create a new group chat
 */
export function createGroupChat(creatorId: string, name: string): Omit<Chat, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: ChatType.GROUP,
    name,
    creatorId,
    config: {
      id: '', // Will be generated
      chatId: '', // Will be linked
      systemPrompt: '',
      temperature: 0.7,
      modelName: 'default',
    },
    participants: [],
    messages: [],
  };
} 