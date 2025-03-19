import { EventEmitter } from 'events';
import voiceActivityService, { VoiceActivityState } from '../livekit/voice-activity-service';

// Speaker identification/verification status
export type AuthStatus = 'unverified' | 'verifying' | 'verified' | 'failed';

// Speaker enrollment status
export type EnrollmentStatus = 'not_enrolled' | 'enrolling' | 'enrolled' | 'failed';

// Voice biometric data
export interface VoiceBiometricData {
  userId: string;
  voiceprintId: string;
  confidenceScore: number;
  enrollmentDate: number;
  lastVerificationDate: number;
  enrollmentSamples: number;
  isEnrolled: boolean;
}

// Voice auth service options
export interface VoiceAuthOptions {
  minEnrollmentSamples: number;
  minVerificationSamples: number;
  verificationThreshold: number;
  sampleDurationMs: number;
  storageKey: string;
}

/**
 * Service for voice-based authentication
 * Provides speaker identification and verification
 */
export class VoiceAuthService extends EventEmitter {
  private options: VoiceAuthOptions = {
    minEnrollmentSamples: 3,
    minVerificationSamples: 1,
    verificationThreshold: 0.7,
    sampleDurationMs: 5000,
    storageKey: 'voice-biometric-data'
  };
  
  private isInitialized: boolean = false;
  private authStatus: AuthStatus = 'unverified';
  private enrollmentStatus: EnrollmentStatus = 'not_enrolled';
  private currentUserId: string | null = null;
  private audioSamples: Float32Array[] = [];
  private biometricData: Map<string, VoiceBiometricData> = new Map();
  private recordingTimeout: NodeJS.Timeout | null = null;
  private isRecordingEnrollment: boolean = false;
  private isRecordingVerification: boolean = false;
  
  constructor() {
    super();
  }
  
  /**
   * Initialize the voice auth service
   */
  public initialize(options?: Partial<VoiceAuthOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Set up event listeners
    voiceActivityService.onVoiceActivity(this.handleVoiceActivity);
    
    // Try to load previous biometric data
    this.loadBiometricData();
    
    this.isInitialized = true;
    console.log('Voice auth service initialized with options:', this.options);
  }
  
  /**
   * Start enrollment process for a user
   */
  public async startEnrollment(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('Voice auth service not initialized');
      return false;
    }
    
    if (this.isRecordingEnrollment || this.isRecordingVerification) {
      console.error('Already recording samples');
      return false;
    }
    
    // Reset samples
    this.audioSamples = [];
    this.enrollmentStatus = 'enrolling';
    this.currentUserId = userId;
    this.isRecordingEnrollment = true;
    
    this.emit('enrollment:started', userId);
    
    // Set timeout to capture enrollment sample
    this.recordingTimeout = setTimeout(() => {
      this.captureEnrollmentSample();
    }, this.options.sampleDurationMs);
    
    return true;
  }
  
  /**
   * Capture an enrollment sample
   */
  private async captureEnrollmentSample(): Promise<void> {
    // Stop recording
    this.isRecordingEnrollment = false;
    
    if (this.audioSamples.length === 0) {
      this.enrollmentStatus = 'failed';
      this.emit('enrollment:failed', 'No audio samples captured');
      return;
    }
    
    try {
      // In a real implementation, we would send the audio data to a voice biometrics service
      // Here we'll simulate enrollment with a "fake" voiceprint
      const existingData = this.biometricData.get(this.currentUserId || '');
      const sampleCount = existingData?.enrollmentSamples || 0;
      const newSampleCount = sampleCount + 1;
      
      // Create or update biometric data
      const voiceprintId = existingData?.voiceprintId || `vp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const biometricData: VoiceBiometricData = {
        userId: this.currentUserId || '',
        voiceprintId,
        confidenceScore: 0,
        enrollmentDate: Date.now(),
        lastVerificationDate: 0,
        enrollmentSamples: newSampleCount,
        isEnrolled: newSampleCount >= this.options.minEnrollmentSamples
      };
      
      this.biometricData.set(this.currentUserId || '', biometricData);
      this.saveBiometricData();
      
      // Check if we need more samples
      if (newSampleCount < this.options.minEnrollmentSamples) {
        this.emit('enrollment:progress', {
          userId: this.currentUserId,
          progress: newSampleCount / this.options.minEnrollmentSamples,
          samplesRequired: this.options.minEnrollmentSamples,
          samplesCollected: newSampleCount
        });
        
        this.enrollmentStatus = 'enrolling';
      } else {
        this.enrollmentStatus = 'enrolled';
        this.emit('enrollment:completed', biometricData);
      }
    } catch (error) {
      console.error('Error in enrollment:', error);
      this.enrollmentStatus = 'failed';
      this.emit('enrollment:failed', error);
    }
    
    // Reset
    this.audioSamples = [];
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
  }
  
  /**
   * Start verification process for a user
   */
  public async startVerification(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('Voice auth service not initialized');
      return false;
    }
    
    if (this.isRecordingEnrollment || this.isRecordingVerification) {
      console.error('Already recording samples');
      return false;
    }
    
    // Check if user is enrolled
    const userData = this.biometricData.get(userId);
    if (!userData || !userData.isEnrolled) {
      console.error('User not enrolled');
      this.emit('verification:failed', { userId, error: 'User not enrolled' });
      return false;
    }
    
    // Reset samples
    this.audioSamples = [];
    this.authStatus = 'verifying';
    this.currentUserId = userId;
    this.isRecordingVerification = true;
    
    this.emit('verification:started', userId);
    
    // Set timeout to capture verification sample
    this.recordingTimeout = setTimeout(() => {
      this.captureVerificationSample();
    }, this.options.sampleDurationMs);
    
    return true;
  }
  
  /**
   * Capture a verification sample
   */
  private async captureVerificationSample(): Promise<void> {
    // Stop recording
    this.isRecordingVerification = false;
    
    if (this.audioSamples.length === 0) {
      this.authStatus = 'failed';
      this.emit('verification:failed', { userId: this.currentUserId, error: 'No audio samples captured' });
      return;
    }
    
    try {
      // In a real implementation, we would send the audio data to a voice biometrics service
      // and compare with the enrolled voiceprint
      // Here we'll simulate verification with a random confidence score
      
      const userData = this.biometricData.get(this.currentUserId || '');
      if (!userData) {
        this.authStatus = 'failed';
        this.emit('verification:failed', { userId: this.currentUserId, error: 'User data not found' });
        return;
      }
      
      // Simulate verification with a random confidence score weighted toward success
      // In a real implementation, this would be the result of a voice biometric comparison
      const confidenceScore = Math.random() * 0.3 + 0.6; // 0.6 to 0.9
      
      // Update user data
      userData.confidenceScore = confidenceScore;
      userData.lastVerificationDate = Date.now();
      this.biometricData.set(this.currentUserId || '', userData);
      this.saveBiometricData();
      
      // Check if verification passed
      if (confidenceScore >= this.options.verificationThreshold) {
        this.authStatus = 'verified';
        this.emit('verification:succeeded', {
          userId: this.currentUserId,
          confidenceScore,
          threshold: this.options.verificationThreshold
        });
      } else {
        this.authStatus = 'failed';
        this.emit('verification:failed', {
          userId: this.currentUserId,
          confidenceScore,
          threshold: this.options.verificationThreshold,
          error: 'Confidence score below threshold'
        });
      }
    } catch (error) {
      console.error('Error in verification:', error);
      this.authStatus = 'failed';
      this.emit('verification:failed', { userId: this.currentUserId, error });
    }
    
    // Reset
    this.audioSamples = [];
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
  }
  
  /**
   * Cancel current enrollment or verification
   */
  public cancelAuthentication(): void {
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    
    this.isRecordingEnrollment = false;
    this.isRecordingVerification = false;
    this.audioSamples = [];
    
    if (this.authStatus === 'verifying') {
      this.authStatus = 'unverified';
      this.emit('verification:cancelled');
    }
    
    if (this.enrollmentStatus === 'enrolling') {
      this.enrollmentStatus = 'not_enrolled';
      this.emit('enrollment:cancelled');
    }
  }
  
  /**
   * Get enrollment status for a user
   */
  public getEnrollmentStatus(userId: string): { 
    isEnrolled: boolean; 
    sampleCount: number; 
    requiredSamples: number;
  } {
    const userData = this.biometricData.get(userId);
    
    return {
      isEnrolled: userData?.isEnrolled || false,
      sampleCount: userData?.enrollmentSamples || 0,
      requiredSamples: this.options.minEnrollmentSamples
    };
  }
  
  /**
   * Delete enrollment data for a user
   */
  public deleteEnrollment(userId: string): boolean {
    const wasDeleted = this.biometricData.delete(userId);
    if (wasDeleted) {
      this.saveBiometricData();
      this.emit('enrollment:deleted', userId);
    }
    return wasDeleted;
  }
  
  /**
   * Get current authentication status
   */
  public getAuthStatus(): AuthStatus {
    return this.authStatus;
  }
  
  /**
   * Handle voice activity
   */
  private handleVoiceActivity = (state: VoiceActivityState): void => {
    // Only collect samples when we're actively recording
    if ((this.isRecordingEnrollment || this.isRecordingVerification) && state.isSpeaking) {
      // In a real implementation, we would collect audio samples here
      // For simulation, we'll just create random audio data
      const sampleLength = 1024;
      const audioData = new Float32Array(sampleLength);
      
      // Generate random audio data (for simulation only)
      for (let i = 0; i < sampleLength; i++) {
        audioData[i] = (Math.random() * 2 - 1) * state.level;
      }
      
      this.audioSamples.push(audioData);
    }
  };
  
  /**
   * Save biometric data to localStorage
   */
  private saveBiometricData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const dataObj: Record<string, VoiceBiometricData> = {};
        for (const [userId, data] of Array.from(this.biometricData.entries())) {
          dataObj[userId] = data;
        }
        
        localStorage.setItem(this.options.storageKey, JSON.stringify(dataObj));
      }
    } catch (error) {
      console.error('Failed to save voice biometric data:', error);
    }
  }
  
  /**
   * Load biometric data from localStorage
   */
  private loadBiometricData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedData = localStorage.getItem(this.options.storageKey);
        if (savedData) {
          const dataObj = JSON.parse(savedData) as Record<string, VoiceBiometricData>;
          
          for (const [userId, data] of Object.entries(dataObj)) {
            this.biometricData.set(userId, data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load voice biometric data:', error);
    }
  }
  
  /**
   * Dispose the service
   */
  public dispose(): void {
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    
    voiceActivityService.offVoiceActivity(this.handleVoiceActivity);
    this.isInitialized = false;
  }
}

// Create a singleton instance
const voiceAuthService = new VoiceAuthService();
export default voiceAuthService; 