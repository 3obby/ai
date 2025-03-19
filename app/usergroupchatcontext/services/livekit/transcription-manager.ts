import { EventEmitter } from 'events';

export type TranscriptionHandler = (text: string, isFinal: boolean) => void;

interface TranscriptionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

/**
 * TranscriptionManager handles speech recognition and transcription
 * functionality using the Web Speech API
 */
export class TranscriptionManager {
  private speechRecognition: any = null;
  private recognitionActive: boolean = false;
  private recognitionTranscript: string = '';
  private speechRecognitionErrorCount: number = 0;
  private transcriptionHandlers: TranscriptionHandler[] = [];
  private emitter: EventEmitter = new EventEmitter();
  private options: TranscriptionOptions = {
    lang: 'en-US',
    continuous: true,
    interimResults: true
  };
  
  /**
   * Initialize Web Speech API for speech recognition
   */
  public initialize(options: TranscriptionOptions = {}): void {
    // Apply user options
    this.options = { ...this.options, ...options };
    
    // Reset error count
    this.speechRecognitionErrorCount = 0;
    
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = this.options.continuous;
        this.speechRecognition.interimResults = this.options.interimResults;
        this.speechRecognition.lang = this.options.lang;
        
        // Set up event handlers
        this.speechRecognition.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          const transcript = lastResult[0].transcript;
          const isFinal = lastResult.isFinal;
          
          this.recognitionTranscript = transcript;
          
          // Notify handlers with the transcription
          this.notifyTranscriptionHandlers(transcript, isFinal);
        };
        
        this.speechRecognition.onerror = (event: any) => {
          this.speechRecognitionErrorCount++;
          console.error('Speech recognition error:', event.error, `(Count: ${this.speechRecognitionErrorCount})`);
          
          if (this.recognitionActive) {
            // Only try to restart if we haven't had too many errors
            if (this.speechRecognitionErrorCount < 5) {
              // Try to restart recognition
              this.stopRecognition();
              setTimeout(() => {
                if (this.recognitionActive) {
                  this.startRecognition();
                }
              }, 1000);
            } else {
              // Too many errors, stop trying to restart
              console.warn('Too many speech recognition errors, stopping auto-restart');
              this.recognitionActive = false;
              this.emitter.emit('speech-recognition-failed', {
                errorCount: this.speechRecognitionErrorCount,
                lastError: event.error
              });
            }
          }
        };
        
        this.speechRecognition.onend = () => {
          if (this.recognitionActive) {
            // Restart recognition if it ends unexpectedly
            // But only if we haven't had too many errors
            if (this.speechRecognitionErrorCount < 5) {
              console.log('Speech recognition ended unexpectedly, restarting...');
              this.speechRecognition.start();
            }
          }
        };
        
        console.log('Speech recognition initialized successfully');
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
    }
  }
  
  /**
   * Start speech recognition
   */
  public startRecognition(): boolean {
    if (!this.speechRecognition) {
      console.warn('Speech recognition not initialized');
      return false;
    }
    
    try {
      this.speechRecognition.start();
      this.recognitionActive = true;
      console.log('Speech recognition started');
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  }
  
  /**
   * Stop speech recognition
   */
  public stopRecognition(): boolean {
    if (!this.speechRecognition || !this.recognitionActive) return false;
    
    try {
      this.speechRecognition.stop();
      this.recognitionActive = false;
      console.log('Speech recognition stopped');
      return true;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return false;
    }
  }

  /**
   * Register a handler for transcription results
   */
  public onTranscription(handler: TranscriptionHandler): void {
    this.transcriptionHandlers.push(handler);
  }

  /**
   * Remove a transcription handler
   */
  public offTranscription(handler: TranscriptionHandler): void {
    const index = this.transcriptionHandlers.indexOf(handler);
    if (index !== -1) {
      this.transcriptionHandlers.splice(index, 1);
    }
  }

  /**
   * Notify all transcription handlers
   */
  private notifyTranscriptionHandlers(text: string, isFinal: boolean): void {
    // Call all registered transcription handlers
    for (const handler of this.transcriptionHandlers) {
      handler(text, isFinal);
    }
    
    // Emit event for other listeners
    this.emitter.emit('transcription', { text, isFinal });
  }

  /**
   * Get the current transcription
   */
  public getCurrentTranscription(): string {
    return this.recognitionTranscript;
  }

  /**
   * Reset the current transcription
   */
  public resetTranscription(): void {
    this.recognitionTranscript = '';
  }

  /**
   * Subscribe to transcription events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from transcription events
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Get Web Speech API status
   */
  public getStatus(): { available: boolean, active: boolean, errorCount: number } {
    return {
      available: !!this.speechRecognition,
      active: this.recognitionActive,
      errorCount: this.speechRecognitionErrorCount
    };
  }

  /**
   * Check if the Web Speech API is available
   */
  public isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }
}

// Create a singleton instance
const transcriptionManager = new TranscriptionManager();
export default transcriptionManager; 