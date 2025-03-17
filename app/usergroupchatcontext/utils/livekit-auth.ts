import { AccessToken } from 'livekit-server-sdk';
import { LiveKitTokenOptions } from '../types/livekit';

/**
 * Generates a LiveKit token for authenticating with LiveKit services
 */
export const generateToken = (
  apiKey: string,
  apiSecret: string,
  options: LiveKitTokenOptions
): string => {
  // Create the access token with our api key and secret
  const token = new AccessToken(apiKey, apiSecret, {
    identity: options.identity,
    name: options.name,
    ttl: options.ttl || 3600, // 1 hour default
  });

  // Add grants to the token based on permissions
  const grants = token.video;
  
  // Set participant permissions
  grants.canPublish = options.permissions?.canPublish ?? true;
  grants.canSubscribe = options.permissions?.canSubscribe ?? true;
  grants.canPublishData = options.permissions?.canPublishData ?? true;

  // Add metadata if provided
  if (options.metadata) {
    grants.metadata = options.metadata;
  }

  // Return the signed token
  return token.toJwt();
};

/**
 * Creates a token for a participant in a specific room
 */
export const createRoomToken = (
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantId: string,
  participantName?: string
): string => {
  return generateToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName || participantId,
    ttl: 24 * 60 * 60, // 24 hours
    permissions: {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  });
};

/**
 * Creates a token for an AI assistant in a specific room
 */
export const createAssistantToken = (
  apiKey: string,
  apiSecret: string,
  roomName: string,
  assistantId: string
): string => {
  return generateToken(apiKey, apiSecret, {
    identity: `assistant-${assistantId}`,
    name: `AI Assistant (${assistantId})`,
    metadata: JSON.stringify({ type: 'assistant', id: assistantId }),
    permissions: {
      // Assistants can subscribe to audio but can't publish directly
      canPublish: false,
      canSubscribe: true,
      canPublishData: true,
    },
  });
};

/**
 * Creates a token for a user in a specific room
 */
export const createUserToken = (
  apiKey: string,
  apiSecret: string,
  roomName: string,
  userId: string,
  userName?: string
): string => {
  return generateToken(apiKey, apiSecret, {
    identity: `user-${userId}`,
    name: userName || `User (${userId})`,
    metadata: JSON.stringify({ type: 'user', id: userId }),
    permissions: {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  });
}; 