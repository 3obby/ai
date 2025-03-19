import { Room, RemoteParticipant, LocalParticipant, ParticipantEvent, Track, AudioTrack, RoomEvent, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import livekitService from './livekit-service';
import sessionConnectionManager from './session-connection-manager';

export class ParticipantManager {
  private participants: Map<string, Map<string, RemoteParticipant | LocalParticipant>> = new Map();
  private audioTracks: Map<string, Map<string, AudioTrack>> = new Map();

  /**
   * Initialize participant tracking for a room
   */
  public initializeForRoom(roomName: string, room: Room): void {
    // Create maps for this room if they don't exist
    if (!this.participants.has(roomName)) {
      this.participants.set(roomName, new Map());
    }
    
    if (!this.audioTracks.has(roomName)) {
      this.audioTracks.set(roomName, new Map());
    }

    // Store the local participant
    if (room.localParticipant) {
      this.getParticipantsForRoom(roomName).set(room.localParticipant.identity, room.localParticipant);
      this.setupLocalParticipantListeners(room.localParticipant, roomName);
    }

    // Store remote participants
    room.participants.forEach((participant) => {
      this.getParticipantsForRoom(roomName).set(participant.identity, participant);
      this.setupRemoteParticipantListeners(participant, roomName);
    });

    // Set up room event listeners
    this.setupRoomListeners(room, roomName);
  }

  /**
   * Get all participants for a room
   */
  public getParticipantsForRoom(roomName: string): Map<string, RemoteParticipant | LocalParticipant> {
    if (!this.participants.has(roomName)) {
      this.participants.set(roomName, new Map());
    }
    return this.participants.get(roomName)!;
  }

  /**
   * Get all audio tracks for a room
   */
  public getAudioTracksForRoom(roomName: string): Map<string, AudioTrack> {
    if (!this.audioTracks.has(roomName)) {
      this.audioTracks.set(roomName, new Map());
    }
    return this.audioTracks.get(roomName)!;
  }

  /**
   * Get a participant by identity
   */
  public getParticipant(roomName: string, identity: string): RemoteParticipant | LocalParticipant | undefined {
    return this.getParticipantsForRoom(roomName).get(identity);
  }

  /**
   * Get an audio track by participant identity
   */
  public getAudioTrack(roomName: string, identity: string): AudioTrack | undefined {
    return this.getAudioTracksForRoom(roomName).get(identity);
  }

  /**
   * Clean up tracking for a room
   */
  public cleanupRoom(roomName: string): void {
    this.participants.delete(roomName);
    this.audioTracks.delete(roomName);
  }

  /**
   * Sets up listeners for the LiveKit room
   */
  private setupRoomListeners(room: Room, roomName: string): void {
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`Participant connected: ${participant.identity}`);
      this.getParticipantsForRoom(roomName).set(participant.identity, participant);
      this.setupRemoteParticipantListeners(participant, roomName);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`Participant disconnected: ${participant.identity}`);
      this.getParticipantsForRoom(roomName).delete(participant.identity);
      this.getAudioTracksForRoom(roomName).delete(participant.identity);
    });
    
    // Add error handling for common room events
    room.on(RoomEvent.MediaDevicesError, (error: Error) => {
      console.error('Media devices error:', error);
      
      // Emit an event for the UI to handle
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('livekit-media-error', {
          detail: { 
            error: error.message,
            roomName: roomName
          }
        }));
      }
    });
  }

  /**
   * Sets up listeners for remote participants
   */
  private setupRemoteParticipantListeners(participant: RemoteParticipant, roomName: string): void {
    participant.on(ParticipantEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Audio) {
        this.getAudioTracksForRoom(roomName).set(participant.identity, track as AudioTrack);
        console.log(`Subscribed to audio track from ${participant.identity}`);
      }
    });

    participant.on(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Audio) {
        this.getAudioTracksForRoom(roomName).delete(participant.identity);
        console.log(`Unsubscribed from audio track from ${participant.identity}`);
      }
    });
  }

  /**
   * Sets up listeners for the local participant
   */
  private setupLocalParticipantListeners(participant: LocalParticipant, roomName: string): void {
    participant.on(ParticipantEvent.TrackPublished, (publication) => {
      const track = publication.track;
      if (track && track.kind === Track.Kind.Audio) {
        this.getAudioTracksForRoom(roomName).set(participant.identity, track as AudioTrack);
        console.log(`Published local audio track`);
      }
    });

    participant.on(ParticipantEvent.TrackUnpublished, (publication) => {
      if (publication.kind === Track.Kind.Audio) {
        this.getAudioTracksForRoom(roomName).delete(participant.identity);
        console.log(`Unpublished local audio track`);
      }
    });
  }
}

// Create a singleton instance
const participantManager = new ParticipantManager();
export default participantManager; 