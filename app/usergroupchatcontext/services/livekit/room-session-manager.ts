import { Room, RemoteParticipant, LocalParticipant, ParticipantEvent, Track, LocalTrack, LocalAudioTrack, AudioTrack, ConnectionState, RoomEvent, ConnectionQuality, RemoteTrack, RemoteTrackPublication, createLocalTracks } from 'livekit-client';
import livekitService from './livekit-service';

export interface RoomSession {
  roomName: string;
  participants: Map<string, RemoteParticipant | LocalParticipant>;
  audioTracks: Map<string, AudioTrack>;
  connectionState: ConnectionState;
  reconnectAttempts: number;
}

export class RoomSessionManager {
  private sessions: Map<string, RoomSession> = new Map();
  private activeRoomName: string | null = null;
  private maxReconnectAttempts: number = 3;
  private reconnectInterval: number = 2000; // 2 seconds between reconnect attempts
  private lastTokens: Map<string, string> = new Map(); // Store tokens for reconnection
  private lastUrls: Map<string, string> = new Map(); // Store URLs for reconnection
  private voiceModeActive: boolean = false; // Track if user is in voice mode

  /**
   * Creates a new room session with retry logic
   */
  public async createSession(roomName: string, token: string | {token: string}, livekitUrl: string): Promise<RoomSession> {
    console.log(`Creating LiveKit session for room ${roomName}`);
    
    // Set voice mode as active when creating a session
    this.voiceModeActive = true;
    
    // Extract token string if it's an object
    const tokenString = typeof token === 'object' && token !== null && 'token' in token 
      ? token.token 
      : token;
    
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
      
      // Create a new session
      const session: RoomSession = {
        roomName,
        participants: new Map(),
        audioTracks: new Map(),
        connectionState: room.state,
        reconnectAttempts: 0
      };

      // Store the local participant
      if (room.localParticipant) {
        session.participants.set(room.localParticipant.identity, room.localParticipant);
        this.setupLocalParticipantListeners(room.localParticipant, session);
      }

      // Store remote participants
      room.participants.forEach((participant) => {
        session.participants.set(participant.identity, participant);
        this.setupRemoteParticipantListeners(participant, session);
      });

      // Set up room event listeners
      this.setupRoomListeners(room, session);
      this.setupConnectionListeners(room, session);

      // Store the session
      this.sessions.set(roomName, session);
      this.activeRoomName = roomName;

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
      
      this.sessions.set(roomName, failedSession);
      
      // Return the failed session so caller can handle appropriately
      return failedSession;
    }
  }

  /**
   * Add connection status monitoring and reconnection logic
   */
  private setupConnectionListeners(room: Room, session: RoomSession): void {
    // Monitor connection state changes
    room.on(RoomEvent.ConnectionStateChanged, async (state: ConnectionState) => {
      console.log(`LiveKit connection state changed for room ${session.roomName}: ${state}`);
      session.connectionState = state;
      
      // Handle disconnection with automatic reconnection attempts - only if voice mode is still active
      if (state === ConnectionState.Disconnected) {
        // Skip reconnection if voice mode is no longer active
        if (!this.voiceModeActive) {
          console.log(`Not attempting reconnection because voice mode is inactive for room ${session.roomName}`);
          return;
        }
        
        // Initialize reconnection attempts tracking if needed
        session.reconnectAttempts = typeof session.reconnectAttempts === 'number' ? session.reconnectAttempts : 0;
        
        // Get stored token and URL
        const token = this.lastTokens.get(session.roomName);
        const url = this.lastUrls.get(session.roomName);
        
        // Only attempt reconnection if we have the token and URL
        if (token && url && session.reconnectAttempts < this.maxReconnectAttempts) {
          session.reconnectAttempts += 1;
          console.log(`Attempting to reconnect to room ${session.roomName} (attempt ${session.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          try {
            // Wait a bit before attempting reconnection (with increasing delay)
            await new Promise(resolve => setTimeout(resolve, this.reconnectInterval * session.reconnectAttempts));
            
            // Try to reconnect using the LiveKit service
            await livekitService.connect(url, token);
            console.log(`Successfully reconnected to room ${session.roomName}`);
            
            // Reset the attempt counter on success
            session.reconnectAttempts = 0;
          } catch (error) {
            console.error(`Failed to reconnect to room ${session.roomName}:`, error);
            
            // If we've reached max attempts, emit a disconnected event
            if (session.reconnectAttempts >= this.maxReconnectAttempts) {
              console.warn(`Maximum reconnection attempts reached for room ${session.roomName}`);
              session.connectionState = ConnectionState.Disconnected;
              
              // Remove the session if permanently disconnected
              // this.sessions.delete(session.roomName);
              
              // Emit an event so UI can handle this
              if (typeof document !== 'undefined') {
                document.dispatchEvent(new CustomEvent('livekit-permanent-disconnect', {
                  detail: { roomName: session.roomName }
                }));
              }
            }
          }
        }
      }
    });
    
    // Monitor connection quality
    room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality) => {
      console.log(`LiveKit connection quality changed for room ${session.roomName}: ${quality}`);
      
      // Emit an event so UI can handle this
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('livekit-connection-quality', {
          detail: { roomName: session.roomName, quality }
        }));
      }
    });
  }

  /**
   * Gets an existing session by room name
   */
  public getSession(roomName: string): RoomSession | undefined {
    return this.sessions.get(roomName);
  }

  /**
   * Gets the active session
   */
  public getActiveSession(): RoomSession | undefined {
    if (!this.activeRoomName) return undefined;
    return this.sessions.get(this.activeRoomName);
  }

  /**
   * Closes a session and disconnects from the room
   */
  public async closeSession(roomName: string): Promise<void> {
    const session = this.sessions.get(roomName);
    if (!session) return;

    // Set voice mode to inactive when closing the session
    this.voiceModeActive = false;
    
    // Clean up token and URL storage
    this.lastTokens.delete(roomName);
    this.lastUrls.delete(roomName);

    await livekitService.disconnect();
    this.sessions.delete(roomName);

    if (this.activeRoomName === roomName) {
      this.activeRoomName = null;
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
      console.log(`Voice mode deactivated, closing session for ${this.activeRoomName}`);
      this.closeSession(this.activeRoomName);
    }
  }

  /**
   * Enables local audio publication with enhanced error handling
   */
  public async enableLocalAudio(): Promise<LocalAudioTrack | undefined> {
    // Set voice mode active when enabling audio
    this.voiceModeActive = true;
    
    const room = livekitService.getRoom();
    if (!room || !this.activeRoomName) {
      console.warn('Cannot enable local audio: no active room');
      return undefined;
    }

    const localParticipant = room.localParticipant;
    if (!localParticipant) {
      console.warn('Cannot enable local audio: no local participant');
      return undefined;
    }

    try {
      // First check if there's already a published audio track
      const existingAudioTracks = localParticipant.getTracks().filter(
        (trackPublication) => trackPublication.track?.kind === Track.Kind.Audio
      );
      
      if (existingAudioTracks.length > 0) {
        console.log('Audio track already exists, returning existing track');
        const track = existingAudioTracks[0].track as LocalAudioTrack;
        
        // Update the session just in case
        const session = this.sessions.get(this.activeRoomName);
        if (session) {
          session.audioTracks.set(localParticipant.identity, track);
        }
        
        return track;
      }
      
      // Check if we have enhanced audio constraints set
      const audioConstraints = typeof window !== 'undefined' ? 
        (window as any).__enhancedAudioConstraints || true : true;
      
      console.log('Creating local audio track with constraints:', audioConstraints);
      
      // Create a local audio track using the createLocalTracks function
      const localTracks = await createLocalTracks({
        audio: {
          // Set specific audio constraints to improve WebRTC connection stability
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,  // Use mono for better bandwidth/stability
          sampleRate: 44100 // CD quality is sufficient and more stable
        },
        video: false
      });
      
      if (localTracks.length === 0 || !localTracks[0].kind.includes('audio')) {
        throw new Error('Failed to create audio track');
      }
      
      const audioTrack = localTracks[0] as LocalAudioTrack;
      
      // Publish the track with retry logic
      let publishSuccess = false;
      let publishAttempts = 0;
      const maxPublishAttempts = 3;
      
      while (!publishSuccess && publishAttempts < maxPublishAttempts) {
        try {
          // Add a slight delay before publishing to allow WebRTC connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // First ensure we have a stable ICE connection
          if (room.state !== 'connected') {
            console.log('Room not fully connected, waiting before publishing track...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Now try to publish with lower bitrate for better stability
          await localParticipant.publishTrack(audioTrack, {
            simulcast: false,  // Disable simulcast for audio (not needed)
            audioBitrate: 32000, // Use 32 kbps for voice (good quality, better stability)
            dtx: true  // Enable discontinuous transmission for better bandwidth
          });
          
          publishSuccess = true;
          console.log('Successfully published audio track');
        } catch (publishError) {
          publishAttempts++;
          console.error(`Failed to publish audio track (attempt ${publishAttempts}):`, publishError);
          
          if (publishAttempts >= maxPublishAttempts) {
            throw publishError;
          }
          
          // Wait longer before retrying (increasing delay)
          await new Promise(resolve => setTimeout(resolve, 1000 * publishAttempts));
        }
      }

      // Update the session
      const session = this.sessions.get(this.activeRoomName);
      if (session) {
        session.audioTracks.set(localParticipant.identity, audioTrack);
      }

      return audioTrack;
    } catch (error) {
      console.error('Failed to enable local audio:', error);
      
      // Try to provide more helpful error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for common issues
        if (errorMessage.includes('Permission') || errorMessage.includes('denied')) {
          console.error('Microphone permission denied by user or browser');
        } else if (errorMessage.includes('already in use')) {
          console.error('Microphone is already in use by another application');
        }
      }
      
      // Dispatch event to notify UI
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('livekit-audio-error', {
          detail: { error: errorMessage }
        }));
      }
      
      return undefined;
    }
  }

  /**
   * Disables local audio publication with graceful failure
   */
  public async disableLocalAudio(): Promise<void> {
    const room = livekitService.getRoom();
    if (!room || !this.activeRoomName) return;

    const localParticipant = room.localParticipant;
    if (!localParticipant) return;

    try {
      // Unpublish audio tracks
      const audioTracks = localParticipant.getTracks().filter(
        (trackPublication) => trackPublication.track?.kind === Track.Kind.Audio
      );

      for (const trackPublication of audioTracks) {
        if (trackPublication.track) {
          try {
            await localParticipant.unpublishTrack(trackPublication.track as LocalTrack);
            console.log('Unpublished audio track');
          } catch (unpublishError) {
            console.warn('Error unpublishing audio track:', unpublishError);
            // Continue with other tracks even if one fails
          }
        }
      }

      // Update the session
      const session = this.sessions.get(this.activeRoomName);
      if (session) {
        session.audioTracks.delete(localParticipant.identity);
      }
    } catch (error) {
      console.error('Failed to disable local audio:', error);
      // Don't throw error from this function as it's often called during cleanup
    }
  }

  /**
   * Sets up listeners for the LiveKit room
   */
  private setupRoomListeners(room: Room, session: RoomSession): void {
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`Participant connected: ${participant.identity}`);
      session.participants.set(participant.identity, participant);
      this.setupRemoteParticipantListeners(participant, session);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`Participant disconnected: ${participant.identity}`);
      session.participants.delete(participant.identity);
      session.audioTracks.delete(participant.identity);
    });
    
    // Add error handling for common room events
    room.on(RoomEvent.MediaDevicesError, (error: Error) => {
      console.error('Media devices error:', error);
      
      // Emit an event for the UI to handle
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('livekit-media-error', {
          detail: { 
            error: error.message,
            roomName: session.roomName
          }
        }));
      }
    });
  }

  /**
   * Sets up listeners for remote participants
   */
  private setupRemoteParticipantListeners(participant: RemoteParticipant, session: RoomSession): void {
    participant.on(ParticipantEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Audio) {
        session.audioTracks.set(participant.identity, track as AudioTrack);
        console.log(`Subscribed to audio track from ${participant.identity}`);
      }
    });

    participant.on(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Audio) {
        session.audioTracks.delete(participant.identity);
        console.log(`Unsubscribed from audio track from ${participant.identity}`);
      }
    });
  }

  /**
   * Sets up listeners for the local participant
   */
  private setupLocalParticipantListeners(participant: LocalParticipant, session: RoomSession): void {
    participant.on(ParticipantEvent.TrackPublished, (publication) => {
      const track = publication.track;
      if (track && track.kind === Track.Kind.Audio) {
        session.audioTracks.set(participant.identity, track as AudioTrack);
        console.log(`Published local audio track`);
      }
    });

    participant.on(ParticipantEvent.TrackUnpublished, (publication) => {
      if (publication.kind === Track.Kind.Audio) {
        session.audioTracks.delete(participant.identity);
        console.log(`Unpublished local audio track`);
      }
    });
  }
}

// Create a singleton instance
const roomSessionManager = new RoomSessionManager();
export default roomSessionManager;