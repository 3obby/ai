import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Room } from 'livekit-client';
import livekitService from '../services/livekit/livekit-service';
import roomSessionManager, { RoomSession } from '../services/livekit/room-session-manager';
import multimodalAgentService from '../services/livekit/multimodal-agent-service';

// Define the shape of our LiveKit context
interface LiveKitContextType {
  isConnected: boolean;
  isConnecting: boolean;
  room: Room | null;
  activeSession: RoomSession | undefined;
  error: Error | null;
  connect: (roomName: string, token: string, url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  isSpeaking: boolean;
}

// Create the context with default values
const LiveKitContext = createContext<LiveKitContextType>({
  isConnected: false,
  isConnecting: false,
  room: null,
  activeSession: undefined,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  startListening: async () => false,
  stopListening: () => {},
  isSpeaking: false
});

// Props for the provider component
interface LiveKitProviderProps {
  children: ReactNode;
  // Optional initial configuration
  initialRoomName?: string;
  initialToken?: string;
  initialUrl?: string;
  autoConnect?: boolean;
}

export const LiveKitProvider: React.FC<LiveKitProviderProps> = ({
  children,
  initialRoomName,
  initialToken,
  initialUrl,
  autoConnect = false
}) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Get room and session references
  const room = livekitService.getRoom();
  const activeSession = roomSessionManager.getActiveSession();

  // Connect to a LiveKit room
  const connect = async (roomName: string, token: string, url: string) => {
    if (isConnected || isConnecting) {
      console.log('Already connected or connecting to LiveKit');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create a session through the room session manager
      await roomSessionManager.createSession(roomName, token, url);
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to connect to LiveKit:', err);
      setError(err instanceof Error ? err : new Error('Unknown error connecting to LiveKit'));
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from LiveKit
  const disconnect = async () => {
    if (!isConnected) return;

    try {
      // Get active room name before disconnecting
      const activeSession = roomSessionManager.getActiveSession();
      if (activeSession) {
        await roomSessionManager.closeSession(activeSession.roomName);
      }
      setIsConnected(false);
    } catch (err) {
      console.error('Error disconnecting from LiveKit:', err);
      setError(err instanceof Error ? err : new Error('Unknown error disconnecting from LiveKit'));
    }
  };

  // Start listening for voice input
  const startListening = async () => {
    if (!isConnected) {
      console.error('Cannot start listening: not connected to LiveKit');
      return false;
    }

    return await multimodalAgentService.startListening();
  };

  // Stop listening for voice input
  const stopListening = () => {
    multimodalAgentService.stopListening();
  };

  // Effect to handle auto-connect if credentials are provided
  useEffect(() => {
    if (autoConnect && initialRoomName && initialToken && initialUrl) {
      connect(initialRoomName, initialToken, initialUrl);
    }

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Context value
  const value: LiveKitContextType = {
    isConnected,
    isConnecting,
    room,
    activeSession,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    isSpeaking
  };

  return (
    <LiveKitContext.Provider value={value}>
      {children}
    </LiveKitContext.Provider>
  );
};

// Hook to use the LiveKit context
export const useLiveKit = () => useContext(LiveKitContext);

export default LiveKitProvider; 