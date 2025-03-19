import { useEffect, useState } from 'react';

// Define the SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

// Declare the SpeechRecognition constructor
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

// Declare global SpeechRecognition types to address TypeScript errors
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export interface VoiceTranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface VoiceTranscriptionState {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  error: string | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export class VoiceTranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private options: VoiceTranscriptionOptions;
  private onTranscriptCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private isListening = false;

  constructor(options: VoiceTranscriptionOptions = {}) {
    this.options = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ...options,
    };
    
    if (typeof window !== 'undefined') {
      this.initRecognition();
    }
  }

  private initRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      if (this.onErrorCallback) {
        this.onErrorCallback('Speech recognition not supported in this browser');
      }
      return;
    }

    // Use the appropriate speech recognition API
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionAPI();

    if (this.recognition) {
      this.recognition.lang = this.options.language || 'en-US';
      this.recognition.continuous = this.options.continuous ?? true;
      this.recognition.interimResults = this.options.interimResults ?? true;
      this.recognition.maxAlternatives = this.options.maxAlternatives ?? 1;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript && this.onTranscriptCallback) {
          this.onTranscriptCallback({
            transcript: finalTranscript,
            isFinal: true,
            confidence: event.results[0][0].confidence,
          });
        } else if (interimTranscript && this.onTranscriptCallback) {
          this.onTranscriptCallback({
            transcript: interimTranscript,
            isFinal: false,
          });
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };
    }
  }

  public start(): boolean {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }

  public onTranscript(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    );
  }
}

// React hook for using voice transcription
export function useVoiceTranscription(options?: VoiceTranscriptionOptions) {
  const [state, setState] = useState<VoiceTranscriptionState>({
    isRecording: false,
    transcript: '',
    interimTranscript: '',
    isListening: false,
    error: null,
  });

  const [service, setService] = useState<VoiceTranscriptionService | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const transcriptionService = new VoiceTranscriptionService(options);
      
      transcriptionService.onTranscript((result) => {
        if (result.isFinal) {
          setState(prev => ({
            ...prev,
            transcript: prev.transcript + ' ' + result.transcript,
            interimTranscript: '',
          }));
        } else {
          setState(prev => ({
            ...prev,
            interimTranscript: result.transcript,
          }));
        }
      });

      transcriptionService.onError((error) => {
        setState(prev => ({
          ...prev,
          error,
          isRecording: false,
          isListening: false,
        }));
      });

      setService(transcriptionService);
    }

    return () => {
      if (service) {
        service.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (service) {
      const success = service.start();
      if (success) {
        setState(prev => ({
          ...prev,
          isRecording: true,
          isListening: true,
          error: null,
        }));
      }
    }
  };

  const stopRecording = () => {
    if (service) {
      service.stop();
      setState(prev => ({
        ...prev,
        isRecording: false,
        isListening: false,
      }));
    }
  };

  const resetTranscript = () => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
    }));
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    resetTranscript,
    isSupported: service?.isSupported() ?? false,
  };
} 