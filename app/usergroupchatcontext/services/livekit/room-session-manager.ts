import { Room, RemoteParticipant, LocalParticipant, ParticipantEvent, Track, LocalTrack, LocalAudioTrack, AudioTrack, ConnectionState, RoomEvent, ConnectionQuality, RemoteTrack, RemoteTrackPublication, createLocalTracks } from 'livekit-client';
import livekitService from './livekit-service';
import sessionConnectionManager from './session-connection-manager';
import audioTrackManager from './audio-track-manager';
import participantManager from './participant-manager';

export interface RoomSession {
  roomName: string;
  participants: Map<string, RemoteParticipant | LocalParticipant>;
  audioTracks: Map<string, AudioTrack>;
  connectionState: ConnectionState;
  reconnectAttempts: number;
}

/**
 * Orchestrates the LiveKit room management by delegating to specialized services
 */
export class RoomSessionManager {
  /**
   * Creates a new room session with retry logic
   */
  public async createSession(roomName: string, token: string | {token: string}, livekitUrl: string): Promise<RoomSession> {
    console.log(`Creating LiveKit session for room ${roomName}`);
    
    try {
      // Use SessionConnectionManager to create the connection
      const connection = await sessionConnectionManager.createConnection(roomName, token, livekitUrl);
      
      // Get the room from LiveKit service
      const room = livekitService.getRoom();
      if (!room) {
        throw new Error('Failed to get room after connection');
      }
      
      // Use ParticipantManager to initialize participant tracking
      participantManager.initializeForRoom(roomName, room);
      
      // Create session object using the managers
      const session: RoomSession = {
        roomName,
        participants: participantManager.getParticipantsForRoom(roomName),
        audioTracks: participantManager.getAudioTracksForRoom(roomName),
        connectionState: connection.connectionState,
        reconnectAttempts: connection.reconnectAttempts
      };
      
      return session;
    } catch (error) {
      console.error(`Failed to create LiveKit session for room ${roomName}:`, error);
      
      // Create a disconnected session to indicate failure
      const failedSession: RoomSession = {
        roomName,
        participants: new Map(),
        audioTracks: new Map(),
        connectionState: ConnectionState.Disconnected,
        reconnectAttempts: 0
      };
      
      return failedSession;
    }
  }

  /**
   * Gets a session by room name
   */
  public getSession(roomName: string): RoomSession | undefined {
    const connection = sessionConnectionManager.getConnection(roomName);
    if (!connection) return undefined;
    
    // Create session object from the specialized services
    return {
      roomName,
      participants: participantManager.getParticipantsForRoom(roomName),
      audioTracks: participantManager.getAudioTracksForRoom(roomName),
      connectionState: connection.connectionState,
      reconnectAttempts: connection.reconnectAttempts
    };
  }

  /**
   * Gets the active session
   */
  public getActiveSession(): RoomSession | undefined {
    const activeRoomName = sessionConnectionManager.getActiveRoomName();
    if (!activeRoomName) return undefined;
    
    return this.getSession(activeRoomName);
  }

  /**
   * Closes a session and disconnects from the room
   */
  public async closeSession(roomName: string): Promise<void> {
    // First clean up audio tracks
    await audioTrackManager.cleanupAudioTracks();
    
    // Clean up participant tracking
    participantManager.cleanupRoom(roomName);
    
    // Close the connection
    await sessionConnectionManager.closeConnection(roomName);
  }

  /**
   * Set voice mode active state
   */
  public setVoiceModeActive(active: boolean): void {
    sessionConnectionManager.setVoiceModeActive(active);
  }

  /**
   * Enables local audio publication with enhanced error handling
   */
  public async enableLocalAudio(): Promise<LocalAudioTrack | undefined> {
    // Set voice mode as active when enabling audio
    this.setVoiceModeActive(true);
    
    // Delegate to AudioTrackManager
    return audioTrackManager.enableLocalAudio();
  }

  /**
   * Disables local audio publication with graceful failure
   */
  public async disableLocalAudio(): Promise<void> {
    return audioTrackManager.disableLocalAudio();
  }
}

// Create a singleton instance
const roomSessionManager = new RoomSessionManager();
export default roomSessionManager;