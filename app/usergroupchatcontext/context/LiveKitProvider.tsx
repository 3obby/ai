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

  // Default connection to LiveKit for OpenAI integration
  const createDefaultSession = async () => {
    try {
      // Check if LiveKit credentials are configured
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      
      if (!livekitUrl) {
        console.error('LiveKit URL not configured. Please add NEXT_PUBLIC_LIVEKIT_URL to your .env.local file');
        setError(new Error('LiveKit credentials missing. Please configure NEXT_PUBLIC_LIVEKIT_URL in your environment.'));
        return;
      }
      
      console.log('Attempting to connect to LiveKit using URL:', livekitUrl);
      
      // Fetch token from the API endpoint within the usergroupchatcontext directory
      const response = await fetch('/usergroupchatcontext/api/livekit/token?type=user&roomName=default-room&id=default-user');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get LiveKit token: ${response.status} ${response.statusText}${errorData.details ? ` - ${errorData.details}` : ''}`);
      }
      
      const data = await response.json();
      
      if (data.token) {
        console.log('Connecting to LiveKit with URL:', livekitUrl);
        
        // Initialize multimodal agent service before connecting to ensure proper setup
        multimodalAgentService.initialize({
          model: 'gpt-4o',
          voice: 'nova',
          voiceSpeed: 1.0
        });
        
        await connect('default-room', data.token, livekitUrl);
        console.log('Connected to default LiveKit room');
      } else {
        console.error('No token received from LiveKit token API');
        setError(new Error('Failed to get LiveKit token - no token in response'));
      }
    } catch (err) {
      console.error('Failed to create default LiveKit session:', err);
      setError(err instanceof Error ? err : new Error('Unable to connect to LiveKit services'));
    }
  };

  // Effect to handle auto-connect if credentials are provided
  useEffect(() => {
    if (autoConnect && initialRoomName && initialToken && initialUrl) {
      connect(initialRoomName, initialToken, initialUrl);
    } else {
      // Call the default session creation if no credentials provided
      createDefaultSession();
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