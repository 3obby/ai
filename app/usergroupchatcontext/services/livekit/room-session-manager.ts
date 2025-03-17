import { Room, RemoteParticipant, LocalParticipant, ParticipantEvent, Track, LocalTrack, LocalAudioTrack, AudioTrack } from 'livekit-client';
import livekitService from './livekit-service';

export interface RoomSession {
  roomName: string;
  participants: Map<string, RemoteParticipant | LocalParticipant>;
  audioTracks: Map<string, AudioTrack>;
}

export class RoomSessionManager {
  private sessions: Map<string, RoomSession> = new Map();
  private activeRoomName: string | null = null;

  /**
   * Creates a new room session
   */
  public async createSession(roomName: string, token: string, livekitUrl: string): Promise<RoomSession> {
    // Initialize the LiveKit service with the room details
    livekitService.initialize({
      url: livekitUrl,
      token: token, 
      roomName: roomName
    });

    // Connect to the room
    const room = await livekitService.connect();
    
    // Create a new session
    const session: RoomSession = {
      roomName,
      participants: new Map(),
      audioTracks: new Map(),
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

    // Store the session
    this.sessions.set(roomName, session);
    this.activeRoomName = roomName;

    return session;
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

    await livekitService.disconnect();
    this.sessions.delete(roomName);

    if (this.activeRoomName === roomName) {
      this.activeRoomName = null;
    }
  }

  /**
   * Enables local audio publication
   */
  public async enableLocalAudio(): Promise<LocalAudioTrack | undefined> {
    const room = livekitService.getRoom();
    if (!room || !this.activeRoomName) return;

    const localParticipant = room.localParticipant;
    if (!localParticipant) return;

    try {
      // Create a local audio track
      const audioTrack = await LocalAudioTrack.create();
      
      // Publish the track
      await localParticipant.publishTrack(audioTrack);

      // Update the session
      const session = this.sessions.get(this.activeRoomName);
      if (session) {
        session.audioTracks.set(localParticipant.identity, audioTrack);
      }

      return audioTrack;
    } catch (error) {
      console.error('Failed to enable local audio:', error);
      return undefined;
    }
  }

  /**
   * Disables local audio publication
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
        await localParticipant.unpublishTrack(trackPublication.track!);
      }

      // Update the session
      const session = this.sessions.get(this.activeRoomName);
      if (session) {
        session.audioTracks.delete(localParticipant.identity);
      }
    } catch (error) {
      console.error('Failed to disable local audio:', error);
    }
  }

  /**
   * Sets up listeners for the LiveKit room
   */
  private setupRoomListeners(room: Room, session: RoomSession): void {
    room.on(ParticipantEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      session.participants.set(participant.identity, participant);
      this.setupRemoteParticipantListeners(participant, session);
    });

    room.on(ParticipantEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      session.participants.delete(participant.identity);
      session.audioTracks.delete(participant.identity);
    });
  }

  /**
   * Sets up listeners for remote participants
   */
  private setupRemoteParticipantListeners(participant: RemoteParticipant, session: RoomSession): void {
    participant.on(ParticipantEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        session.audioTracks.set(participant.identity, track as AudioTrack);
      }
    });

    participant.on(ParticipantEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        session.audioTracks.delete(participant.identity);
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
      }
    });

    participant.on(ParticipantEvent.TrackUnpublished, (publication) => {
      if (publication.kind === Track.Kind.Audio) {
        session.audioTracks.delete(participant.identity);
      }
    });
  }
}

// Create a singleton instance
const roomSessionManager = new RoomSessionManager();
export default roomSessionManager; 