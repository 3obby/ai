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
  connect: (roomName: string, token: string | {token: string}, url: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  isSpeaking: boolean;
  ensureConnection: () => Promise<boolean>;
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
  isSpeaking: false,
  ensureConnection: async () => false
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
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Get room and session references
  const activeSession = roomSessionManager.getActiveSession();

  // Connect to a LiveKit room
  const connect = async (roomName: string, token: string | {token: string}, url: string) => {
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
    } else if (process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      // Create a default session when the provider mounts
      // This ensures the LiveKit connection is established early
      createDefaultSession();
    }

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  // Add a method to force reconnection when voice mode is activated
  const ensureConnection = async (): Promise<boolean> => {
    console.log('[DEBUG] Ensuring LiveKit connection is established...');

    // If already connected, just return true
    if (isConnected && room && room.state === 'connected') {
      console.log('[DEBUG] LiveKit already connected');
      return true;
    }

    // Try to create a connection
    try {
      await createDefaultSession();
      
      // Give a little time for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return isConnected;
    } catch (error) {
      console.error('[DEBUG] Failed to ensure LiveKit connection:', error);
      return false;
    }
  };

  // Default connection to LiveKit for OpenAI integration - improved with better error handling
  const createDefaultSession = async () => {
    try {
      // Check if LiveKit credentials are configured
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      
      if (!livekitUrl) {
        console.error('[DEBUG] LiveKit URL not configured. Please add NEXT_PUBLIC_LIVEKIT_URL to your .env.local file');
        setError(new Error('LiveKit credentials missing. Please configure NEXT_PUBLIC_LIVEKIT_URL in your environment.'));
        return;
      }
      
      console.log('[DEBUG] Fetching LiveKit token for default room...');
      
      // Fetch token from the API endpoint with explicit error handling
      let response;
      try {
        console.log('[DEBUG] Attempting to fetch LiveKit token...');
        response = await fetch('/usergroupchatcontext/api/livekit-token/');
        
        if (!response.ok) {
          console.error(`[DEBUG] Failed to get LiveKit token: ${response.status} ${response.statusText}`);
        } else {
          console.log('[DEBUG] Successfully fetched LiveKit token');
        }
      } catch (fetchError) {
        console.error('[DEBUG] Network error fetching LiveKit token:', fetchError);
        throw new Error('Network error fetching LiveKit token');
      }
      
      if (!response || !response.ok) {
        const errorStatus = response ? `${response.status} ${response.statusText}` : 'No response';
        console.error(`[DEBUG] Failed to get LiveKit token: ${errorStatus}`);
        
        let errorDetails = '';
        try {
          const errorData = await response?.json();
          errorDetails = errorData?.details || errorData?.error || '';
        } catch (e) {}
        
        throw new Error(`Failed to get LiveKit token: ${errorStatus}${errorDetails ? ` - ${errorDetails}` : ''}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[DEBUG] Failed to parse LiveKit token response:', parseError);
        throw new Error('Invalid LiveKit token response format');
      }
      
      if (!data || !data.token) {
        console.error('[DEBUG] No token received from LiveKit token API:', data);
        throw new Error('No token in LiveKit API response');
      }
      
      console.log('[DEBUG] Successfully received LiveKit token, connecting...');
      
      // Initialize multimodal agent service before connecting
      multimodalAgentService.initialize({
        model: 'gpt-4o',
        voice: 'nova',
        voiceSpeed: 1.0
      });
      
      const roomName = data.roomName || 'default-room';
      await connect(roomName, data.token, livekitUrl);
      console.log('[DEBUG] Connected to LiveKit room:', roomName);
      
      return true;
    } catch (err) {
      console.error('[DEBUG] Failed to create default LiveKit session:', err);
      setError(err instanceof Error ? err : new Error('Unable to connect to LiveKit services'));
      return false;
    }
  };

  useEffect(() => {
    if (!initialToken || !initialUrl) return;

    console.log('[DEBUG] Creating new LiveKit Room instance with URL:', initialUrl.substring(0, 30) + '...');
    
    // Create new room
    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        audioProcessing: { 
          autoGainControl: false,
          echoCancellation: true,
          noiseSuppression: true
        }
      }
    });

    // Room connection error listener
    const handleError = (error: Error) => {
      console.error('[DEBUG] LiveKit room connection error:', error);
      setError(error.message);
      setConnectionAttempts(prev => prev + 1);
    };
    
    // Room disconnected listener
    const handleDisconnected = () => {
      console.log('[DEBUG] LiveKit room disconnected');
      setIsConnected(false);
    };
    
    // Room connected listener
    const handleConnected = () => {
      console.log('[DEBUG] LiveKit room connected successfully');
      setIsConnected(true);
      setError(null);
      setConnectionAttempts(0);
    };

    // Set up event listeners
    newRoom.once('connected', handleConnected);
    newRoom.on('disconnected', handleDisconnected);
    newRoom.on('reconnecting', () => console.log('[DEBUG] LiveKit reconnecting...'));
    newRoom.on('reconnected', () => {
      console.log('[DEBUG] LiveKit reconnected');
      setIsConnected(true);
    });
    newRoom.on('error', handleError);

    // Set room and connect
    setRoom(newRoom);
    
    console.log('[DEBUG] Connecting to LiveKit room...');
    newRoom.connect(initialUrl, initialToken, {
      autoSubscribe: true,
      maxRetries: 3,
    }).catch(error => {
      console.error('[DEBUG] Initial LiveKit connection failed:', error);
      setError(error.message);
    });

    // Cleanup on unmount
    return () => {
      console.log('[DEBUG] Cleaning up LiveKit room connection');
      newRoom.off('connected', handleConnected);
      newRoom.off('disconnected', handleDisconnected);
      newRoom.off('error', handleError);
      
      if (newRoom.state !== 'disconnected') {
        newRoom.disconnect().catch(err => {
          console.error('[DEBUG] Error disconnecting from LiveKit room:', err);
        });
      }
    };
  }, [initialToken, initialUrl]);

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
    isSpeaking,
    ensureConnection
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