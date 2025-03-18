import { Room, RoomEvent, RemoteParticipant, ConnectionState, ConnectionQuality, AudioPresets } from 'livekit-client';

interface LiveKitConnectionOptions {
  url: string;
  token: string;
  roomName: string;
  connectOptions?: {
    autoSubscribe?: boolean;
    adaptiveStream?: boolean;
    dynacast?: boolean;
  };
}

export class LiveKitService {
  private room: Room | null = null;
  private options: LiveKitConnectionOptions | null = null;
  private _currentUrl: string | null = null;

  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        audioPreset: AudioPresets.music,
      },
    });
  }

  /**
   * Initializes the LiveKit connection with the provided options
   */
  public initialize(options: LiveKitConnectionOptions): void {
    this.options = options;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Connect to a LiveKit room with automatic retries
   * 
   * @param url LiveKit server URL
   * @param token LiveKit auth token
   * @param options Connection options
   * @returns Promise resolving when connected
   */
  public async connect(
    url: string, 
    token: string, 
    options?: {
      maxRetries?: number;
      retryDelayMs?: number;
    }
  ): Promise<Room> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelayMs = options?.retryDelayMs || 1000;
    
    // Enhanced debugging
    console.log('LiveKit connect attempt:', {
      url: url,
      tokenLength: token ? token.length : 'token is undefined',
      existingRoomState: this.room ? this.room.state : 'no room',
      hasRoom: !!this.room
    });
    
    // Validate inputs
    if (!url) {
      throw new Error('LiveKit URL is required for connection');
    }
    
    if (!token) {
      throw new Error('LiveKit token is required for connection');
    }
    
    // Try to reconnect if we already have a room
    if (this.room) {
      try {
        // If already connected to the same URL, just return the room
        if (this.room.state === 'connected' && this._currentUrl === url) {
          console.log('Already connected to LiveKit room');
          return this.room;
        }
        
        // If connected to a different URL or not connected, disconnect first
        if (this.room.state === 'connected') {
          console.log('Disconnecting from existing LiveKit room before connecting to new one');
          await this.room.disconnect();
        }
      } catch (disconnectError) {
        console.warn('Error disconnecting from existing LiveKit room:', disconnectError);
        // Continue with the connection process anyway
      }
    }
    
    // Create a new room if we don't have one
    if (!this.room) {
      this.room = new Room();
      
      // Set up event listeners using proper RoomEvent enum values
      this.room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
      });
      
      this.room.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
      });
      
      this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('LiveKit connection state changed:', state);
      });
      
      this.room.on(RoomEvent.MediaDevicesError, (error) => {
        console.error('LiveKit media devices error:', error);
      });
    }
    
    // Try to connect with retries
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`LiveKit connection retry ${attempt+1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
        }
        
        console.log('Connecting to LiveKit room...');
        await this.room.connect(url, token);
        console.log('Successfully connected to LiveKit room');
        
        // Store the current URL
        this._currentUrl = url;
        
        return this.room;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`LiveKit connection attempt ${attempt+1} failed:`, error);
        
        // If it's a token error, don't retry
        if (error instanceof Error && error.message.includes('token')) {
          console.error('Token error detected, not retrying LiveKit connection');
          break;
        }
      }
    }
    
    // If we reached here, all attempts failed
    throw lastError || new Error('Failed to connect to LiveKit after multiple attempts');
  }

  /**
   * Disconnect from the LiveKit room
   */
  public async disconnect(): Promise<void> {
    if (this.room && this.room.state === ConnectionState.Connected) {
      await this.room.disconnect();
      console.log('Disconnected from LiveKit room');
    }
  }

  /**
   * Get the current room instance
   */
  public getRoom(): Room | null {
    return this.room;
  }

  /**
   * Setup event listeners for the room
   */
  private setupEventListeners(): void {
    if (!this.room) return;

    this.room
      .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log(`Participant connected: ${participant.identity}`);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log(`Participant disconnected: ${participant.identity}`);
      })
      .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log(`Connection state changed: ${state}`);
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality) => {
        console.log(`Connection quality changed: ${quality}`);
      })
      .on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
      })
      .on(RoomEvent.Reconnecting, () => {
        console.log('Reconnecting to room...');
      })
      .on(RoomEvent.Reconnected, () => {
        console.log('Reconnected to room');
      });
  }
}

// Create a singleton instance
const livekitService = new LiveKitService();
export default livekitService; 