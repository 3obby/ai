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
        console.log('[DEBUG] Browser supports SpeechRecognition API, initializing...');
        
        // Clean up any previous instance first
        if (this.speechRecognition) {
          try {
            this.speechRecognition.onresult = null;
            this.speechRecognition.onerror = null;
            this.speechRecognition.onend = null;
            this.speechRecognition.stop();
          } catch (e) {
            // Ignore - may not be active
          }
        }
        
        // Create fresh instance
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = this.options.continuous;
        this.speechRecognition.interimResults = this.options.interimResults;
        this.speechRecognition.lang = this.options.lang;
        
        // Set up event handlers
        this.speechRecognition.onresult = (event: any) => {
          try {
            if (!event || !event.results || event.results.length === 0) {
              console.warn('[DEBUG] Received empty speech recognition result event');
              return;
            }
            
            const lastResult = event.results[event.results.length - 1];
            if (!lastResult || !lastResult[0]) {
              console.warn('[DEBUG] Invalid recognition result structure');
              return;
            }
            
            const transcript = lastResult[0].transcript;
            const isFinal = lastResult.isFinal;
            const confidence = lastResult[0].confidence;
            
            console.log('[DEBUG SPEECH] Recognition result:', { 
              transcript, 
              isFinal, 
              confidence,
              handlerCount: this.transcriptionHandlers.length,
              isActive: this.recognitionActive
            });
            
            this.recognitionTranscript = transcript;
            
            // Notify handlers with the transcription
            this.notifyTranscriptionHandlers(transcript, isFinal);
          } catch (error) {
            console.error('[DEBUG] Error processing speech recognition result:', error);
          }
        };
        
        this.speechRecognition.onerror = (event: any) => {
          this.speechRecognitionErrorCount++;
          console.error('[DEBUG] Speech recognition error:', event.error, `(Count: ${this.speechRecognitionErrorCount})`);
          
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
              console.warn('[DEBUG] Too many speech recognition errors, stopping auto-restart');
              this.recognitionActive = false;
              this.emitter.emit('speech-recognition-failed', {
                errorCount: this.speechRecognitionErrorCount,
                lastError: event.error
              });
            }
          }
        };
        
        this.speechRecognition.onend = () => {
          console.log('[DEBUG] SpeechRecognition onend fired');
          
          if (this.recognitionActive) {
            // Restart recognition if it ends unexpectedly
            // But only if we haven't had too many errors
            if (this.speechRecognitionErrorCount < 5) {
              console.log('[DEBUG] Speech recognition ended unexpectedly, restarting...');
              
              // Give a small delay before restarting
              setTimeout(() => {
                if (this.recognitionActive) {
                  try {
                    this.speechRecognition.start();
                    console.log('[DEBUG] Successfully restarted speech recognition');
                  } catch (e) {
                    console.error('[DEBUG] Failed to restart speech recognition:', e);
                  }
                }
              }, 100);
            }
          }
        };
        
        console.log('[DEBUG] Speech recognition initialized successfully');
      } else {
        console.warn('[DEBUG] Speech recognition not supported in this browser');
      }
    } else {
      console.warn('[DEBUG] Window is undefined - likely running in SSR context');
    }
  }
  
  /**
   * Start speech recognition
   */
  public startRecognition(): boolean {
    if (!this.speechRecognition) {
      console.warn('[DEBUG] Speech recognition not initialized, attempting to initialize now');
      this.initialize({
        lang: 'en-US',
        continuous: true,
        interimResults: true,
      });
      
      // If still not available after initialization attempt, give up
      if (!this.speechRecognition) {
        console.error('[DEBUG] Failed to initialize speech recognition after attempt');
        return false;
      }
    }
    
    // If recognition is already active, don't try to start it again
    if (this.recognitionActive) {
      console.log('[DEBUG] Speech recognition is already active, not starting again');
      return true;
    }
    
    try {
      console.log('[DEBUG] Starting speech recognition with Web Speech API');
      
      // Reset error count on fresh start
      this.speechRecognitionErrorCount = 0;
      
      // First stop any existing recognition
      try {
        this.speechRecognition.stop();
        // Wait a moment to ensure it's fully stopped
        setTimeout(() => {
          if (!this.recognitionActive) {
            try {
              this.speechRecognition.start();
              this.recognitionActive = true;
              console.log('[DEBUG] Speech recognition started successfully');
              
              // Emit an event for successful start
              this.emitter.emit('recognition-started', {
                timestamp: Date.now(),
                availableVoices: typeof window !== 'undefined' && window.speechSynthesis ? 
                  window.speechSynthesis.getVoices() : []
              });
            } catch (startError) {
              console.error('[DEBUG] Error starting speech recognition after delay:', startError);
              return false;
            }
          }
        }, 50);
        
        return true;
      } catch (e) {
        // Ignore errors when stopping - it may not be active
        // Continue with starting the recognition
        this.speechRecognition.start();
        this.recognitionActive = true;
        console.log('[DEBUG] Speech recognition started successfully');
        
        // Emit an event for successful start
        this.emitter.emit('recognition-started', {
          timestamp: Date.now(),
          availableVoices: typeof window !== 'undefined' && window.speechSynthesis ? 
            window.speechSynthesis.getVoices() : []
        });
        
        return true;
      }
    } catch (error) {
      console.error('[DEBUG] Error starting speech recognition:', error);
      this.recognitionActive = false;
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
    console.log(`[DEBUG SPEECH] Notifying ${this.transcriptionHandlers.length} handlers of transcription:`, 
      text.substring(0, 30) + (text.length > 30 ? '...' : ''), 
      `isFinal: ${isFinal}`
    );
    
    // Call all registered transcription handlers
    for (const handler of this.transcriptionHandlers) {
      try {
        handler(text, isFinal);
      } catch (error) {
        console.error('[DEBUG] Error in transcription handler:', error);
      }
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