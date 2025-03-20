'use client';

import { useEffect, useState, useRef } from 'react';

export interface VoiceSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  model?: string;
  speed?: number;
}

export interface VoiceSynthesisState {
  isPlaying: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  utterance: SpeechSynthesisUtterance | null;
  error: string | null;
  availableVoices: SpeechSynthesisVoice[];
  audioElement: HTMLAudioElement | null;
}

export class VoiceSynthesisService {
  private options: VoiceSynthesisOptions;
  private utterance: SpeechSynthesisUtterance | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onBoundaryCallback: ((boundary: { name: string, charIndex: number, charLength: number }) => void) | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;

  constructor(options: VoiceSynthesisOptions = {}) {
    this.options = {
      rate: 1,
      pitch: 1,
      volume: 1,
      model: 'gpt-4o-realtime-preview',
      voice: 'coral',
      ...options,
    };
  }

  public async speak(text: string, options?: VoiceSynthesisOptions): Promise<void> {
    const mergedOptions = { ...this.options, ...options };

    console.log('VoiceSynthesisService.speak called with text:', text.substring(0, 50) + '...', 'options:', mergedOptions);

    try {
      // First clean up any previous audio resources
      this.cleanup();
      
      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('Fetching speech synthesis from API...');
      const response = await fetch('/usergroupchatcontext/api/synthesize-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          options: {
            model: mergedOptions.model || 'gpt-4o-realtime-preview',
            voice: mergedOptions.voice || 'coral',
            speed: mergedOptions.rate || 1.0,
          }
        }),
      });

      // Check both for !ok response and for fallback flag in JSON response
      if (!response.ok) {
        // Try to get the response body to check for fallback flag
        try {
          const errorData = await response.json();
          if (errorData && errorData.fallback) {
            console.log('Server indicated we should use fallback TTS');
            throw new Error('Fallback to browser TTS requested by server');
          }
        } catch (parseError) {
          // If we can't parse the response, just use the original error
        }
        
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Check content type to ensure we received audio
      const contentType = response.headers.get('Content-Type');
      if (!contentType || !contentType.includes('audio/')) {
        console.warn('Response may not be audio, content-type:', contentType);
      }

      console.log('Speech synthesis response received, converting to blob...');
      const audioBlob = await response.blob();
      
      // Make sure we actually got audio data
      if (audioBlob.size < 100) {
        console.warn('Audio blob is suspiciously small:', audioBlob.size, 'bytes');
        throw new Error('Received audio file is too small to be valid');
      }
      
      console.log('Audio blob created, size:', audioBlob.size);
      
      this.audioUrl = URL.createObjectURL(audioBlob);
      
      this.audioElement = new Audio(this.audioUrl);
      this.audioElement.volume = mergedOptions.volume || 1.0;
      
      // Listen for errors during loading
      const loadPromise = new Promise<void>((resolve, reject) => {
        if (!this.audioElement) {
          reject(new Error('Audio element not created'));
          return;
        }
        
        this.audioElement.oncanplaythrough = () => {
          console.log('Audio is ready to play through without buffering');
          resolve();
        };
        this.audioElement.onerror = (e) => {
          console.error('Error loading audio:', e);
          reject(new Error(`Error loading audio: ${e}`));
        };

        // Add safety timeout in case oncanplaythrough never fires
        setTimeout(() => {
          const audioEl = this.audioElement;
          if (audioEl && audioEl.readyState >= 3) {
            console.log('Audio seems ready to play (timeout check)');
            resolve();
          } else {
            reject(new Error('Audio loading timed out'));
          }
        }, 3000);
      });
      
      // Wait for audio to be ready to play
      console.log('Waiting for audio to be ready to play...');
      await loadPromise;
      
      if (this.onStartCallback) {
        this.audioElement.onplay = () => {
          console.log('Audio playback started');
          if (this.onStartCallback) this.onStartCallback();
        };
      }
      
      if (this.onEndCallback) {
        this.audioElement.onended = () => {
          console.log('Audio playback ended');
          this.cleanup();
          if (this.onEndCallback) this.onEndCallback();
        };
      }
      
      this.audioElement.onerror = (event) => {
        console.error('Audio playback error:', event);
        this.cleanup();
        if (this.onErrorCallback) {
          this.onErrorCallback(`Audio playback error: ${event}`);
        }
      };
      
      // Use a try-catch block specifically for the play() operation
      try {
        console.log('Attempting to play audio...');
        await this.audioElement.play();
        console.log('Audio playback started successfully');
      } catch (playError) {
        console.error('Error during audio playback:', playError);
        // Fall back to browser speech synthesis only on play errors
        this.fallbackToSpeechSynthesis(text, mergedOptions);
      }
      
    } catch (error) {
      console.error('Error using OpenAI API for speech synthesis:', error);
      
      // Use fallback
      console.log('Falling back to browser speech synthesis');
      this.fallbackToSpeechSynthesis(text, mergedOptions);
    }
  }

  private fallbackToSpeechSynthesis(text: string, options: VoiceSynthesisOptions): void {
    if (!this.isSupported()) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Speech synthesis not supported in this browser');
      }
      return;
    }

    console.warn('Falling back to browser speech synthesis');
    
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);

    if (options.rate !== undefined) {
      this.utterance.rate = options.rate;
    }
    if (options.pitch !== undefined) {
      this.utterance.pitch = options.pitch;
    }
    if (options.volume !== undefined) {
      this.utterance.volume = options.volume;
    }

    if (options.voice) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === options.voice);
      if (voice) {
        this.utterance.voice = voice;
      }
    }

    this.utterance.onstart = () => {
      if (this.onStartCallback) this.onStartCallback();
    };

    this.utterance.onend = () => {
      if (this.onEndCallback) this.onEndCallback();
    };

    this.utterance.onerror = (event) => {
      if (this.onErrorCallback) this.onErrorCallback(event.error);
    };

    this.utterance.onboundary = (event) => {
      if (this.onBoundaryCallback && event.name === 'word') {
        this.onBoundaryCallback({
          name: event.name,
          charIndex: event.charIndex,
          charLength: event.charLength || 0,
        });
      }
    };

    window.speechSynthesis.speak(this.utterance);
  }

  private cleanup(): void {
    if (this.audioElement) {
      try {
        // Remove all event listeners
        this.audioElement.onplay = null;
        this.audioElement.onended = null;
        this.audioElement.onerror = null;
        this.audioElement.oncanplaythrough = null;
        
        // Stop playback
        this.audioElement.pause();
        
        // Reset src and reload to clear buffer
        this.audioElement.src = '';
        this.audioElement.load();
        this.audioElement = null;
      } catch (e) {
        console.warn('Error during audio cleanup:', e);
      }
    }
    
    if (this.audioUrl) {
      try {
        URL.revokeObjectURL(this.audioUrl);
      } catch (e) {
        console.warn('Error revoking object URL:', e);
      }
      this.audioUrl = null;
    }
    
    // Also cancel any browser speech synthesis
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Error canceling speech synthesis:', e);
      }
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    } else if (this.isSupported()) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.audioElement) {
      this.audioElement.play().catch(e => {
        console.error('Error resuming audio:', e);
      });
    } else if (this.isSupported()) {
      window.speechSynthesis.resume();
    }
  }

  public stop(): void {
    this.cleanup();
    
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  public onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  public onBoundary(callback: (boundary: { name: string, charIndex: number, charLength: number }) => void): void {
    this.onBoundaryCallback = callback;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.isSupported()) {
      return window.speechSynthesis.getVoices();
    }
    return [];
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}

export function useVoiceSynthesis(options?: VoiceSynthesisOptions) {
  const [state, setState] = useState<VoiceSynthesisState>({
    isPlaying: false,
    isPaused: false,
    isSpeaking: false,
    utterance: null,
    error: null,
    availableVoices: [],
    audioElement: null,
  });

  const serviceRef = useRef<VoiceSynthesisService | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const synthesisService = new VoiceSynthesisService(options);
      
      synthesisService.onStart(() => {
        setState(prev => ({
          ...prev,
          isPlaying: true,
          isPaused: false,
          isSpeaking: true,
        }));
      });

      synthesisService.onEnd(() => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          isSpeaking: false,
        }));
      });

      synthesisService.onError((error) => {
        setState(prev => ({
          ...prev,
          error,
          isPlaying: false,
          isPaused: false,
          isSpeaking: false,
        }));
      });

      const updateVoices = () => {
        const voices = synthesisService.getVoices();
        setState(prev => ({
          ...prev,
          availableVoices: voices,
        }));
      };

      if (window.speechSynthesis) {
        updateVoices();
        
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }

      serviceRef.current = synthesisService;
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.stop();
      }
    };
  }, []);

  const speak = (text: string, speakOptions?: VoiceSynthesisOptions) => {
    if (serviceRef.current) {
      serviceRef.current.speak(text, speakOptions).catch(error => {
        console.error('Error in speak:', error);
        setState(prev => ({
          ...prev,
          error: error.message,
          isPlaying: false,
          isPaused: false,
          isSpeaking: false,
        }));
      });
    }
  };

  const pause = () => {
    if (serviceRef.current) {
      serviceRef.current.pause();
      setState(prev => ({
        ...prev,
        isPaused: true,
        isSpeaking: false,
      }));
    }
  };

  const resume = () => {
    if (serviceRef.current) {
      serviceRef.current.resume();
      setState(prev => ({
        ...prev,
        isPaused: false,
        isSpeaking: true,
      }));
    }
  };

  const stop = () => {
    if (serviceRef.current) {
      serviceRef.current.stop();
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        isSpeaking: false,
      }));
    }
  };

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    isSupported: serviceRef.current?.isSupported() ?? false,
  };
} 