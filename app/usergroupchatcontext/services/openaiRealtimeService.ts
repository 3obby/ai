'use client';

import { useEffect, useState, useRef } from 'react';

// OpenAI Realtime API configuration
export interface OpenAIRealtimeConfig {
  apiKey?: string; // Would be fetched securely from the server in production
  model?: string;
  language?: string;
  voices?: {
    [botId: string]: string; // Map bot IDs to specific OpenAI voice IDs
  };
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface SpeechOptions {
  voice?: string; // alloy, echo, fable, onyx, nova, shimmer
  speed?: number; // 0.25 to 4.0
  model?: string; // tts-1, tts-1-hd, gpt-4o-realtime-preview
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avgLogprob: number;
    compressionRatio: number;
    noSpeechProb: number;
  }>;
  language?: string;
  duration?: number;
  isFinal: boolean;
}

export class OpenAIRealtimeService {
  private config: OpenAIRealtimeConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: HTMLAudioElement[] = [];
  private isPlaying = false;

  // Callbacks
  private onTranscriptionCallback: ((result: TranscriptionResult) => void) | null = null;
  private onTranscriptionErrorCallback: ((error: string) => void) | null = null;
  private onSpeechStartCallback: (() => void) | null = null;
  private onSpeechEndCallback: (() => void) | null = null;
  private onSpeechErrorCallback: ((error: string) => void) | null = null;

  constructor(config: OpenAIRealtimeConfig = {}) {
    this.config = {
      model: 'whisper-1',
      language: 'en',
      ...config,
    };
  }

  // Speech-to-text methods
  public async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second for interim results
      this.isRecording = true;

      // Process chunks as they come in
      this.processInterimResults();
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      if (this.onTranscriptionErrorCallback) {
        this.onTranscriptionErrorCallback('Failed to start recording: ' + (error as Error).message);
      }
      return false;
    }
  }

  public async stopRecording(): Promise<TranscriptionResult | null> {
    if (!this.isRecording || !this.mediaRecorder) {
      return null;
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        try {
          const result = await this.transcribeAudio(audioBlob, { language: this.config.language });
          
          // Stop all tracks in the stream
          const stream = this.mediaRecorder!.stream;
          stream.getTracks().forEach(track => track.stop());
          
          this.isRecording = false;
          resolve(result);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          if (this.onTranscriptionErrorCallback) {
            this.onTranscriptionErrorCallback('Failed to transcribe audio: ' + (error as Error).message);
          }
          this.isRecording = false;
          resolve(null);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  private async processInterimResults(): Promise<void> {
    if (!this.isRecording) return;

    // This would be implemented to send interim audio chunks to OpenAI
    // for real-time transcription, but their current API doesn't support
    // streaming audio input directly from the client side.
    // Instead, we'll simulate interim results locally and send the complete
    // audio for transcription when recording stops.

    setTimeout(() => {
      if (this.isRecording && this.onTranscriptionCallback) {
        // In a real implementation, this would process the current audio chunk
        // Here we just simulate the process
        if (this.audioChunks.length > 0) {
          this.onTranscriptionCallback({
            text: '...',
            isFinal: false
          });
        }
        this.processInterimResults();
      }
    }, 1000);
  }

  private async transcribeAudio(
    audioBlob: Blob, 
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate a response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // IMPORTANT: In production, all API calls should be proxied through your server 
    // to protect your API key. Never expose your OpenAI API key in client-side code.
    
    // Here's how you'd call the API in a server-side function:
    /*
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', this.config.model || 'whisper-1');
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    if (options.responseFormat) {
      formData.append('response_format', options.responseFormat);
    }
    
    if (options.temperature) {
      formData.append('temperature', options.temperature.toString());
    }
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    */
    
    // Simulated response
    return {
      text: "This is a simulated transcription result. In production, this would be the actual transcribed text from OpenAI's Whisper API.",
      isFinal: true,
      duration: 2.5,
    };
  }

  // Text-to-speech methods
  public async speakText(text: string, options: SpeechOptions = {}): Promise<void> {
    if (!text) return;
    
    try {
      // Call onStart callback
      if (this.onSpeechStartCallback) {
        this.onSpeechStartCallback();
      }
      
      // Use the OpenAI realtime model through our server API
      const response = await fetch('/usergroupchatcontext/api/synthesize-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          options: {
            model: options.model || 'gpt-4o-realtime-preview',
            voice: options.voice || 'alloy',
            speed: options.speed || 1.0
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Speech synthesis API error: ${response.status} ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      const audio = new Audio(audioUrl);
      
      // Set up event listeners
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.onSpeechEndCallback) {
          this.onSpeechEndCallback();
        }
      };
      
      audio.onerror = (event) => {
        URL.revokeObjectURL(audioUrl);
        if (this.onSpeechErrorCallback) {
          this.onSpeechErrorCallback(`Audio playback error: ${event}`);
        }
      };
      
      // Start playing
      audio.play().catch(error => {
        if (this.onSpeechErrorCallback) {
          this.onSpeechErrorCallback(`Failed to play audio: ${error.message}`);
        }
      });
      
    } catch (error) {
      console.error('Error generating speech:', error);
      
      // Only fall back to browser's Speech Synthesis as a last resort
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        console.warn('Falling back to browser speech synthesis');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.speed || 1.0;
        
        utterance.onend = () => {
          if (this.onSpeechEndCallback) {
            this.onSpeechEndCallback();
          }
        };
        
        utterance.onerror = (event) => {
          if (this.onSpeechErrorCallback) {
            this.onSpeechErrorCallback(`Speech synthesis error: ${event.error}`);
          }
        };
        
        window.speechSynthesis.speak(utterance);
      } else if (this.onSpeechErrorCallback) {
        this.onSpeechErrorCallback('Failed to generate speech: ' + (error as Error).message);
      }
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Call onEnd callback
    if (this.onSpeechEndCallback) {
      this.onSpeechEndCallback();
    }
  }

  public pauseSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resumeSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  // Callback registration
  public onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  public onTranscriptionError(callback: (error: string) => void): void {
    this.onTranscriptionErrorCallback = callback;
  }

  public onSpeechStart(callback: () => void): void {
    this.onSpeechStartCallback = callback;
  }

  public onSpeechEnd(callback: () => void): void {
    this.onSpeechEndCallback = callback;
  }

  public onSpeechError(callback: (error: string) => void): void {
    this.onSpeechErrorCallback = callback;
  }
}

// React hook for using OpenAI Realtime API
export function useOpenAIRealtime(config: OpenAIRealtimeConfig = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<OpenAIRealtimeService | null>(null);
  
  useEffect(() => {
    const service = new OpenAIRealtimeService(config);
    
    service.onTranscription((result) => {
      if (result.isFinal) {
        setTranscript(prev => (prev ? prev + ' ' + result.text : result.text).trim());
        setInterimTranscript('');
      } else {
        setInterimTranscript(result.text);
      }
    });
    
    service.onTranscriptionError((err) => {
      setError(err);
      setIsRecording(false);
    });
    
    service.onSpeechStart(() => {
      setIsSpeaking(true);
    });
    
    service.onSpeechEnd(() => {
      setIsSpeaking(false);
    });
    
    service.onSpeechError((err) => {
      setError(err);
      setIsSpeaking(false);
    });
    
    serviceRef.current = service;
    
    return () => {
      // Clean up
      if (serviceRef.current) {
        if (isRecording) {
          serviceRef.current.stopRecording();
        }
        if (isSpeaking) {
          serviceRef.current.stopSpeaking();
        }
      }
    };
  }, [config]);
  
  const startRecording = async () => {
    if (serviceRef.current) {
      const success = await serviceRef.current.startRecording();
      if (success) {
        setIsRecording(true);
        setError(null);
      }
    }
  };
  
  const stopRecording = async () => {
    if (serviceRef.current) {
      await serviceRef.current.stopRecording();
      setIsRecording(false);
    }
  };
  
  const speak = (text: string, options: SpeechOptions = {}) => {
    if (serviceRef.current) {
      serviceRef.current.speakText(text, options);
    }
  };
  
  const stopSpeaking = () => {
    if (serviceRef.current) {
      serviceRef.current.stopSpeaking();
    }
  };
  
  const pauseSpeaking = () => {
    if (serviceRef.current) {
      serviceRef.current.pauseSpeaking();
    }
  };
  
  const resumeSpeaking = () => {
    if (serviceRef.current) {
      serviceRef.current.resumeSpeaking();
    }
  };
  
  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };
  
  return {
    isRecording,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    resetTranscript,
  };
} 