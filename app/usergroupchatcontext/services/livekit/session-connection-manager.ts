import { Room, ConnectionState, ConnectionQuality, RoomEvent } from 'livekit-client';
import livekitService from './livekit-service';

export interface SessionConnectionOptions {
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface SessionConnection {
  roomName: string;
  connectionState: ConnectionState;
  reconnectAttempts: number;
}

export class SessionConnectionManager {
  private sessions: Map<string, SessionConnection> = new Map();
  private activeRoomName: string | null = null;
  private maxReconnectAttempts: number = 3;
  private reconnectInterval: number = 2000; // 2 seconds between reconnect attempts
  private lastTokens: Map<string, string> = new Map(); // Store tokens for reconnection
  private lastUrls: Map<string, string> = new Map(); // Store URLs for reconnection
  private voiceModeActive: boolean = false; // Track if user is in voice mode

  /**
   * Creates a new room connection with retry logic
   */
  public async createConnection(
    roomName: string, 
    token: string | {token: string},
    livekitUrl: string
  ): Promise<SessionConnection> {
    console.log(`Creating LiveKit connection for room ${roomName}`);
    
    // Set voice mode as active when creating a connection
    this.voiceModeActive = true;
    
    // Extract token string if it's an object
    const tokenString = typeof token === 'object' && token !== null && 'token' in token 
      ? token.token 
      : token;
    
    // Validate token
    if (!tokenString || typeof tokenString !== 'string') {
      console.error('Invalid token format received:', token);
      throw new Error('Invalid token format. Token must be a non-empty string.');
    }
    
    // Store token and URL for potential reconnection
    this.lastTokens.set(roomName, tokenString);
    this.lastUrls.set(roomName, livekitUrl);

    try {
      // Initialize the LiveKit service with the room details
      livekitService.initialize({
        url: livekitUrl,
        token: tokenString, 
        roomName: roomName
      });

      // Connect to the room with retries built in to the service
      const room = await livekitService.connect(livekitUrl, tokenString, {
        maxRetries: this.maxReconnectAttempts,
        retryDelayMs: this.reconnectInterval
      });
      
      console.log(`Successfully connected to LiveKit room ${roomName}`);
      
      // Create a new session connection
      const connection: SessionConnection = {
        roomName,
        connectionState: room.state,
        reconnectAttempts: 0
      };

      // Set up room event listeners for connection status
      this.setupConnectionListeners(room, connection);

      // Store the session
      this.sessions.set(roomName, connection);
      this.activeRoomName = roomName;

      return connection;
    } catch (error) {
      console.error(`Failed to create LiveKit connection for room ${roomName}:`, error);
      
      // Create a disconnected session to indicate failure
      const failedConnection: SessionConnection = {
        roomName,
        connectionState: ConnectionState.Disconnected,
        reconnectAttempts: 0
      };
      
      this.sessions.set(roomName, failedConnection);
      
      // Return the failed connection so caller can handle appropriately
      return failedConnection;
    }
  }

  /**
   * Add connection status monitoring and reconnection logic
   */
  private setupConnectionListeners(room: Room, connection: SessionConnection): void {
    // Monitor connection state changes
    room.on(RoomEvent.ConnectionStateChanged, async (state: ConnectionState) => {
      console.log(`LiveKit connection state changed for room ${connection.roomName}: ${state}`);
      connection.connectionState = state;
      
      // Handle disconnection with automatic reconnection attempts - only if voice mode is still active
      if (state === ConnectionState.Disconnected) {
        // Skip reconnection if voice mode is no longer active
        if (!this.voiceModeActive) {
          console.log(`Not attempting reconnection because voice mode is inactive for room ${connection.roomName}`);
          return;
        }
        
        // Initialize reconnection attempts tracking if needed
        connection.reconnectAttempts = typeof connection.reconnectAttempts === 'number' ? connection.reconnectAttempts : 0;
        
        // Get stored token and URL
        const token = this.lastTokens.get(connection.roomName);
        const url = this.lastUrls.get(connection.roomName);
        
        // Only attempt reconnection if we have the token and URL
        if (token && url && connection.reconnectAttempts < this.maxReconnectAttempts) {
          connection.reconnectAttempts += 1;
          console.log(`Attempting to reconnect to room ${connection.roomName} (attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          try {
            // Wait a bit before attempting reconnection (with increasing delay)
            await new Promise(resolve => setTimeout(resolve, this.reconnectInterval * connection.reconnectAttempts));
            
            // Try to reconnect using the LiveKit service
            await livekitService.connect(url, token);
            console.log(`Successfully reconnected to room ${connection.roomName}`);
            
            // Reset the attempt counter on success
            connection.reconnectAttempts = 0;
          } catch (error) {
            console.error(`Failed to reconnect to room ${connection.roomName}:`, error);
            
            // If we've reached max attempts, emit a disconnected event
            if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
              console.warn(`Maximum reconnection attempts reached for room ${connection.roomName}`);
              connection.connectionState = ConnectionState.Disconnected;
              
              // Emit an event so UI can handle this
              if (typeof document !== 'undefined') {
                document.dispatchEvent(new CustomEvent('livekit-permanent-disconnect', {
                  detail: { roomName: connection.roomName }
                }));
              }
            }
          }
        }
      }
    });
    
    // Monitor connection quality
    room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality) => {
      console.log(`LiveKit connection quality changed for room ${connection.roomName}: ${quality}`);
      
      // Emit an event so UI can handle this
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('livekit-connection-quality', {
          detail: { roomName: connection.roomName, quality }
        }));
      }
    });
  }

  /**
   * Gets an existing connection by room name
   */
  public getConnection(roomName: string): SessionConnection | undefined {
    return this.sessions.get(roomName);
  }

  /**
   * Gets the active connection
   */
  public getActiveConnection(): SessionConnection | undefined {
    if (!this.activeRoomName) return undefined;
    return this.sessions.get(this.activeRoomName);
  }

  /**
   * Closes a connection and disconnects from the room
   */
  public async closeConnection(roomName: string): Promise<void> {
    const connection = this.sessions.get(roomName);
    if (!connection) return;

    // Set voice mode to inactive when closing the connection
    this.voiceModeActive = false;
    
    // Clean up token and URL storage
    this.lastTokens.delete(roomName);
    this.lastUrls.delete(roomName);

    try {
      // Disconnect from the room
      await livekitService.disconnect();
      console.log(`Successfully closed LiveKit connection for room ${roomName}`);
    } catch (error) {
      console.error(`Error closing LiveKit connection for room ${roomName}:`, error);
    } finally {
      // Always clean up local state even if disconnect fails
      this.sessions.delete(roomName);
      
      if (this.activeRoomName === roomName) {
        this.activeRoomName = null;
      }
    }
  }

  /**
   * Set voice mode active state
   */
  public setVoiceModeActive(active: boolean): void {
    console.log(`Setting voice mode active: ${active}`);
    this.voiceModeActive = active;
    
    // If voice mode is turned off, disconnect immediately
    if (!active && this.activeRoomName) {
      console.log(`Voice mode deactivated, closing connection for ${this.activeRoomName}`);
      this.closeConnection(this.activeRoomName);
    }
  }

  /**
   * Get the active room name
   */
  public getActiveRoomName(): string | null {
    return this.activeRoomName;
  }
}

// Create a singleton instance
const sessionConnectionManager = new SessionConnectionManager();
export default sessionConnectionManager; 