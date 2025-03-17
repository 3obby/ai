'use client';

import { useEffect, useState, useRef } from 'react';

export interface VoiceSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceSynthesisState {
  isPlaying: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  utterance: SpeechSynthesisUtterance | null;
  error: string | null;
  availableVoices: SpeechSynthesisVoice[];
}

export class VoiceSynthesisService {
  private options: VoiceSynthesisOptions;
  private utterance: SpeechSynthesisUtterance | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onBoundaryCallback: ((boundary: { name: string, charIndex: number, charLength: number }) => void) | null = null;

  constructor(options: VoiceSynthesisOptions = {}) {
    this.options = {
      rate: 1,
      pitch: 1,
      volume: 1,
      ...options,
    };
  }

  public speak(text: string): void {
    if (!this.isSupported()) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Speech synthesis not supported in this browser');
      }
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    // Create a new utterance
    this.utterance = new SpeechSynthesisUtterance(text);

    // Set options
    if (this.options.rate !== undefined) {
      this.utterance.rate = this.options.rate;
    }
    if (this.options.pitch !== undefined) {
      this.utterance.pitch = this.options.pitch;
    }
    if (this.options.volume !== undefined) {
      this.utterance.volume = this.options.volume;
    }

    // Set voice if specified
    if (this.options.voice) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === this.options.voice);
      if (voice) {
        this.utterance.voice = voice;
      }
    }

    // Set event handlers
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

    // Start speaking
    window.speechSynthesis.speak(this.utterance);
  }

  public pause(): void {
    if (this.isSupported()) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported()) {
      window.speechSynthesis.resume();
    }
  }

  public stop(): void {
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

// React hook for using voice synthesis
export function useVoiceSynthesis(options?: VoiceSynthesisOptions) {
  const [state, setState] = useState<VoiceSynthesisState>({
    isPlaying: false,
    isPaused: false,
    isSpeaking: false,
    utterance: null,
    error: null,
    availableVoices: [],
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

      // Update available voices
      const updateVoices = () => {
        const voices = synthesisService.getVoices();
        setState(prev => ({
          ...prev,
          availableVoices: voices,
        }));
      };

      // Some browsers load voices asynchronously
      if (window.speechSynthesis) {
        // Initial load of voices
        updateVoices();
        
        // Chrome needs this event to get all voices
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

  const speak = (text: string) => {
    if (serviceRef.current) {
      serviceRef.current.speak(text);
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