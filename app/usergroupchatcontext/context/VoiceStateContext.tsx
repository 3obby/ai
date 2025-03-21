'use client';

import { createContext } from 'react';
import { VoiceModeState } from '../services/voice/VoiceModeManager';
import { VoiceGhost, VoiceSettings, VoiceOption } from '../types/voice';

// Voice State Action Types
export enum VoiceStateActionType {
  SET_RECORDING = 'SET_RECORDING',
  SET_PROCESSING = 'SET_PROCESSING',
  SET_VOICE_MODE_STATE = 'SET_VOICE_MODE_STATE',
  SET_ACTIVE_VOICE_BOT_IDS = 'SET_ACTIVE_VOICE_BOT_IDS',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  SET_VOICE_SETTINGS = 'SET_VOICE_SETTINGS',
  UPDATE_VOICE_SETTINGS = 'UPDATE_VOICE_SETTINGS',
  SET_VOICE_GHOSTS = 'SET_VOICE_GHOSTS',
  ADD_VOICE_GHOST = 'ADD_VOICE_GHOST',
  REMOVE_VOICE_GHOST = 'REMOVE_VOICE_GHOST',
  CLEAR_VOICE_GHOSTS = 'CLEAR_VOICE_GHOSTS',
  SET_INTERIM_TRANSCRIPT = 'SET_INTERIM_TRANSCRIPT',
  SET_VOICE_LEVEL = 'SET_VOICE_LEVEL',
  SET_BOT_SPEAKING = 'SET_BOT_SPEAKING',
  SET_TRANSCRIPTION_IN_PROGRESS = 'SET_TRANSCRIPTION_IN_PROGRESS'
}

// Voice State Interface
export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  isBotSpeaking: boolean;
  currentVoiceModeState: VoiceModeState;
  activeVoiceBotIds: string[];
  voiceGhosts: VoiceGhost[];
  voiceSettings: VoiceSettings;
  error: Error | null;
  interimTranscript: string | null;
  voiceLevel: number;
  isTranscribing: boolean;
  speakingBotId: string | null;
  lastTransitionTime: number;
}

// Voice State Actions Interface
export type VoiceStateAction =
  | { type: VoiceStateActionType.SET_RECORDING; payload: boolean }
  | { type: VoiceStateActionType.SET_PROCESSING; payload: boolean }
  | { type: VoiceStateActionType.SET_VOICE_MODE_STATE; payload: VoiceModeState }
  | { type: VoiceStateActionType.SET_ACTIVE_VOICE_BOT_IDS; payload: string[] }
  | { type: VoiceStateActionType.SET_ERROR; payload: Error }
  | { type: VoiceStateActionType.CLEAR_ERROR }
  | { type: VoiceStateActionType.SET_VOICE_SETTINGS; payload: VoiceSettings }
  | { type: VoiceStateActionType.UPDATE_VOICE_SETTINGS; payload: Partial<VoiceSettings> }
  | { type: VoiceStateActionType.SET_VOICE_GHOSTS; payload: VoiceGhost[] }
  | { type: VoiceStateActionType.ADD_VOICE_GHOST; payload: VoiceGhost }
  | { type: VoiceStateActionType.REMOVE_VOICE_GHOST; payload: string }
  | { type: VoiceStateActionType.CLEAR_VOICE_GHOSTS }
  | { type: VoiceStateActionType.SET_INTERIM_TRANSCRIPT; payload: string | null }
  | { type: VoiceStateActionType.SET_VOICE_LEVEL; payload: number }
  | { type: VoiceStateActionType.SET_BOT_SPEAKING; payload: { isSpeaking: boolean; botId: string | null } }
  | { type: VoiceStateActionType.SET_TRANSCRIPTION_IN_PROGRESS; payload: boolean };

// Voice State Context Interface
export interface VoiceStateContextType {
  state: VoiceState;
  dispatch: React.Dispatch<VoiceStateAction>;
}

// Initial Voice State
export const initialVoiceState: VoiceState = {
  isRecording: false,
  isProcessing: false,
  isBotSpeaking: false,
  currentVoiceModeState: VoiceModeState.IDLE,
  activeVoiceBotIds: [],
  voiceGhosts: [],
  voiceSettings: {
    vadMode: 'auto',
    vadThreshold: 0.6,
    silenceDurationMs: 1500,
    prefixPaddingMs: 500,
    defaultVoice: 'coral',
    speed: 1.0,
    quality: 'standard',
    keepPreprocessingHooks: false,
    keepPostprocessingHooks: false,
    preserveVoiceHistory: true,
    automaticVoiceSelection: true,
    modality: 'both',
    preventEchoDetection: true,
    enhancedAudioProcessing: true,
    muteMicDuringPlayback: true
  },
  error: null,
  interimTranscript: null,
  voiceLevel: 0,
  isTranscribing: false,
  speakingBotId: null,
  lastTransitionTime: 0
};

// Create Context
export const VoiceStateContext = createContext<VoiceStateContextType | undefined>(undefined); 