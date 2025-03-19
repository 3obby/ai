import { EventEmitter } from 'events';

export interface SpeechSynthesisOptions {
  voice?: string;
  speed?: number;
  quality?: 'standard' | 'high-quality';
  preferredVoices?: string[];
}

/**
 * SpeechSynthesisService handles text-to-speech functionality
 * using the OpenAI API for high-quality speech synthesis
 */
export class SpeechSynthesisService {
  private emitter: EventEmitter = new EventEmitter();
  private isSynthesizing: boolean = false;
  private synthQueue: Array<{ 
    text: string; 
    options: SpeechSynthesisOptions 
  }> = [];
  private options: SpeechSynthesisOptions = {
    voice: 'alloy',
    speed: 1.0,
    quality: 'high-quality',
    preferredVoices: ['ash', 'coral']
  };
  private isSpeakingState: boolean = false;

  /**
   * Initialize the speech synthesis service
   */
  public initialize(options: Partial<SpeechSynthesisOptions> = {}): void {
    this.options = { ...this.options, ...options };
    console.log('Speech synthesis service initialized with options:', this.options);
  }

  /**
   * Synthesize speech from text
   */
  public async synthesizeSpeech(text: string, options: Partial<SpeechSynthesisOptions> = {}): Promise<void> {
    // Add to synthesis queue
    this.synthQueue.push({
      text,
      options: {
        voice: options.voice || this.getNextVoice(),
        speed: options.speed || this.options.speed,
        quality: options.quality || this.options.quality
      }
    });
    
    // Start processing if not already in progress
    if (!this.isSynthesizing) {
      await this.processNextSynthesisItem();
    }
  }

  /**
   * Get the next voice in the rotation
   */
  private getNextVoice(): string {
    // If we have preferred voices, alternate between them
    if (this.options.preferredVoices && this.options.preferredVoices.length > 0) {
      const nextVoiceIndex = Math.floor(Math.random() * this.options.preferredVoices.length);
      return this.options.preferredVoices[nextVoiceIndex];
    }
    
    // Otherwise, use the default voice
    return this.options.voice || 'alloy';
  }

  /**
   * Process the next item in the synthesis queue
   */
  private processNextSynthesisItem = async (): Promise<void> => {
    if (this.synthQueue.length === 0) {
      this.isSynthesizing = false;
      return;
    }
    
    const next = this.synthQueue.shift();
    if (!next) {
      this.isSynthesizing = false;
      return;
    }
    
    this.isSynthesizing = true;
    this.emitter.emit('synthesis:start', { text: next.text });
    
    try {
      // Set speaking state before audio starts
      this.setSpeaking(true);
      
      // Configure synthesis options based on quality setting
      const synthesisOptions: any = {
        voice: next.options.voice || this.options.voice,
        speed: next.options.speed || this.options.speed,
        model: next.options.quality === 'high-quality' ? 'tts-1-hd' : 'tts-1'
      };
      
      // Request speech synthesis with high quality settings
      const response = await fetch('/api/synthesize-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: next.text,
          options: synthesisOptions
        })
      });
      
      if (!response.ok) {
        throw new Error(`Speech synthesis failed: ${response.status} ${response.statusText}`);
      }
      
      // Get audio data and notify handlers
      const audioData = await response.arrayBuffer();
      this.notifyAudioOutputHandlers(audioData);
      
      this.emitter.emit('synthesis:complete', { text: next.text });
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      this.emitter.emit('synthesis:error', { 
        text: next.text, 
        error 
      });
    } finally {
      // Reset speaking state
      this.setSpeaking(false);
      
      // Process next item in queue
      await this.processNextSynthesisItem();
    }
  };

  /**
   * Notify all audio output handlers
   */
  private notifyAudioOutputHandlers(audioChunk: ArrayBuffer): void {
    this.emitter.emit('audio:output', audioChunk);
  }

  /**
   * Check if currently speaking
   */
  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  /**
   * Set the speaking state
   */
  public setSpeaking(isSpeaking: boolean): void {
    this.isSpeakingState = isSpeaking;
    this.emitter.emit('speaking-state-change', isSpeaking);
  }

  /**
   * Listen for speaking state changes
   */
  public onSpeakingStateChange(callback: (isSpeaking: boolean) => void): void {
    this.emitter.on('speaking-state-change', callback);
  }

  /**
   * Stop listening for speaking state changes
   */
  public offSpeakingStateChange(callback: (isSpeaking: boolean) => void): void {
    this.emitter.off('speaking-state-change', callback);
  }

  /**
   * Register a handler for audio output
   */
  public onAudioOutput(callback: (audioChunk: ArrayBuffer) => void): void {
    this.emitter.on('audio:output', callback);
  }

  /**
   * Remove an audio output handler
   */
  public offAudioOutput(callback: (audioChunk: ArrayBuffer) => void): void {
    this.emitter.off('audio:output', callback);
  }

  /**
   * Subscribe to speech synthesis events
   */
  public onSynthesisEvent(event: 'synthesis:start' | 'synthesis:complete' | 'synthesis:error', listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from speech synthesis events
   */
  public offSynthesisEvent(event: 'synthesis:start' | 'synthesis:complete' | 'synthesis:error', listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Update speech synthesis options
   */
  public updateOptions(options: Partial<SpeechSynthesisOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('Updated speech synthesis options:', this.options);
  }

  /**
   * Clear the synthesis queue
   */
  public clearQueue(): void {
    this.synthQueue = [];
    console.log('Speech synthesis queue cleared');
  }

  /**
   * Get the current queue length
   */
  public getQueueLength(): number {
    return this.synthQueue.length;
  }
}

// Create a singleton instance
const speechSynthesisService = new SpeechSynthesisService();
export default speechSynthesisService; 