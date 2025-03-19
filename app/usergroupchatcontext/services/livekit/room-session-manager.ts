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

    try {
      // First try to clean up all audio tracks
      const room = livekitService.getRoom();
      if (room && room.localParticipant) {
        console.log('Cleaning up local audio tracks before disconnecting...');
        
        // Get all audio tracks published by local participant
        const audioTracks = room.localParticipant.getTracks().filter(
          (trackPublication) => trackPublication.track?.kind === Track.Kind.Audio
        );
        
        // Unpublish and stop each audio track with proper cleanup
        for (const trackPublication of audioTracks) {
          try {
            if (trackPublication.track) {
              console.log(`Stopping audio track: ${trackPublication.trackSid}`);
              
              // First stop the track
              const track = trackPublication.track as LocalTrack;
              track.stop();
              
              // Then unpublish it
              await room.localParticipant.unpublishTrack(track);
            }
          } catch (trackError) {
            console.warn('Error cleaning up audio track:', trackError);
            // Continue with cleanup even if one track fails
          }
        }
        
        // Wait a moment to ensure track cleanup completes
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Now disconnect from the room
      await livekitService.disconnect();
      console.log(`Successfully closed LiveKit session for room ${roomName}`);
    } catch (error) {
      console.error(`Error closing LiveKit session for room ${roomName}:`, error);
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
        // If we already have an audio track, just return it
        console.log('Using existing published audio track');
        return existingAudioTracks[0].track as LocalAudioTrack;
      }
      
      // We need to create and publish a new audio track
      console.log('Creating and publishing new audio track');
      
      // Set up retry variables with more attempts and longer timeouts
      let audioTrack: LocalAudioTrack | undefined;
      const maxAttempts = 5; // Increased from the default
      const publishTimeoutMs = 15000; // Increased from 5000ms to 15000ms
      
      // Try multiple times to create and publish the track
      for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        try {
          console.log(`Creating audio track attempt ${attempts}/${maxAttempts}...`);
          
          // Create audio track with quality options
          const tracks = await createLocalTracks({
            audio: true,
            video: false,
          });
          
          audioTrack = tracks.find(track => track.kind === Track.Kind.Audio) as LocalAudioTrack;
          
          if (!audioTrack) {
            throw new Error('Audio track not created');
          }
          
          // Try to publish with timeout
          try {
            console.log(`Publishing audio track attempt ${attempts}/${maxAttempts}...`);
            // Using a more resilient publish approach with timeout
            const publishPromise = localParticipant.publishTrack(audioTrack);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Publish timeout')), publishTimeoutMs)
            );
            
            // Add additional logging
            const startTime = Date.now();
            const publishTimeoutId = setInterval(() => {
              const elapsed = Date.now() - startTime;
              console.log(`Still trying to publish audio track after ${Math.round(elapsed/1000)}s...`);
            }, 3000); // Log every 3 seconds
            
            try {
              await Promise.race([publishPromise, timeoutPromise]);
              console.log('Successfully published audio track');
              clearInterval(publishTimeoutId);
              
              // Verify the track was actually published
              const freshTracks = localParticipant.getTracks().filter(
                (pub) => pub.track?.kind === Track.Kind.Audio
              );
              
              if (freshTracks.length === 0) {
                console.warn('Track appeared to publish but is not found in participant tracks');
                throw new Error('Track not found after publish');
              }
              
              // Update the session with the new audio track
              const session = this.sessions.get(this.activeRoomName);
              if (session) {
                session.audioTracks.set(localParticipant.identity, audioTrack);
              }
              
              // Track published successfully - return it
              return audioTrack;
            } catch (timeoutError) {
              clearInterval(publishTimeoutId);
              throw timeoutError;
            }
          } catch (publishError) {
            console.error(`Failed to publish audio track (attempt ${attempts}/${maxAttempts}):`, publishError);
            
            // If this isn't our last attempt, clean up and retry
            if (attempts < maxAttempts) {
              // Clean up the failed track
              try {
                if (audioTrack) {
                  audioTrack.stop();
                  audioTrack = undefined;
                }
              } catch (stopError) {
                console.warn('Error stopping failed audio track:', stopError);
              }
              
              // Wait before retry with exponential backoff
              const delay = Math.min(1000 * Math.pow(1.5, attempts-1), 10000);
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              throw publishError;
            }
          }
        } catch (err) {
          console.error(`Error creating/publishing audio track (attempt ${attempts}/${maxAttempts}):`, err);
          
          // Clean up any created track before retrying
          if (audioTrack) {
            try {
              audioTrack.stop();
            } catch (stopError) {
              console.warn('Error stopping failed audio track:', stopError);
            }
            audioTrack = undefined;
          }
          
          // If this is our last attempt, rethrow
          if (attempts >= maxAttempts) {
            throw err;
          }
          
          // Wait before retry with increasing delay
          const delay = Math.min(1000 * Math.pow(1.5, attempts-1), 10000);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      return audioTrack;
    } catch (error) {
      console.error('Failed to enable local audio:', error);
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