import { LocalAudioTrack, LocalTrack, Track, createLocalTracks } from 'livekit-client';
import livekitService from './livekit-service';
import sessionConnectionManager from './session-connection-manager';

export class AudioTrackManager {
  private audioTracks: Map<string, LocalAudioTrack> = new Map();
  private publishTimeoutMs: number = 15000; // 15 seconds publishing timeout
  private maxPublishAttempts: number = 5; // Maximum number of publish attempts

  /**
   * Enables local audio publication with enhanced error handling
   */
  public async enableLocalAudio(): Promise<LocalAudioTrack | undefined> {
    const room = livekitService.getRoom();
    const activeRoomName = sessionConnectionManager.getActiveRoomName();
    
    if (!room || !activeRoomName) {
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
        const track = existingAudioTracks[0].track as LocalAudioTrack;
        this.audioTracks.set(localParticipant.identity, track);
        return track;
      }
      
      // We need to create and publish a new audio track
      console.log('Creating and publishing new audio track');
      
      // Set up retry variables
      let audioTrack: LocalAudioTrack | undefined;
      
      // Try multiple times to create and publish the track
      for (let attempts = 1; attempts <= this.maxPublishAttempts; attempts++) {
        try {
          console.log(`Creating audio track attempt ${attempts}/${this.maxPublishAttempts}...`);
          
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
            console.log(`Publishing audio track attempt ${attempts}/${this.maxPublishAttempts}...`);
            // Using a more resilient publish approach with timeout
            const publishPromise = localParticipant.publishTrack(audioTrack);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Publish timeout')), this.publishTimeoutMs)
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
              
              // Store the audio track
              this.audioTracks.set(localParticipant.identity, audioTrack);
              
              // Track published successfully - return it
              return audioTrack;
            } catch (timeoutError) {
              clearInterval(publishTimeoutId);
              throw timeoutError;
            }
          } catch (publishError) {
            console.error(`Failed to publish audio track (attempt ${attempts}/${this.maxPublishAttempts}):`, publishError);
            
            // If this isn't our last attempt, clean up and retry
            if (attempts < this.maxPublishAttempts) {
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
          console.error(`Error creating/publishing audio track (attempt ${attempts}/${this.maxPublishAttempts}):`, err);
          
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
          if (attempts >= this.maxPublishAttempts) {
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
    const activeRoomName = sessionConnectionManager.getActiveRoomName();
    
    if (!room || !activeRoomName) return;

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

      // Remove from local tracking
      this.audioTracks.delete(localParticipant.identity);
    } catch (error) {
      console.error('Failed to disable local audio:', error);
      // Don't throw error from this function as it's often called during cleanup
    }
  }

  /**
   * Clean up all audio tracks before disconnection
   */
  public async cleanupAudioTracks(): Promise<void> {
    const room = livekitService.getRoom();
    if (!room || !room.localParticipant) return;
    
    console.log('Cleaning up local audio tracks before disconnecting...');
    
    try {
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
      
      // Clear local tracking
      this.audioTracks.clear();
      
      // Wait a moment to ensure track cleanup completes
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error in audio track cleanup:', error);
    }
  }

  /**
   * Get an audio track by participant identity
   */
  public getAudioTrack(participantIdentity: string): LocalAudioTrack | undefined {
    return this.audioTracks.get(participantIdentity);
  }
}

// Create a singleton instance
const audioTrackManager = new AudioTrackManager();
export default audioTrackManager; 