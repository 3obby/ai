import { EventEmitter } from 'events';
import { VoiceModeState, VoiceModeTransition } from './VoiceModeManager';
import voiceModeManager from './VoiceModeManager';
import { Bot } from '../../types';

/**
 * VoiceStateManager
 * 
 * A centralized state manager for voice mode that serves as a single source of truth
 * for voice-related state across components. This reduces state duplication and
 * ensures consistent voice state management throughout the application.
 * 
 * Key features:
 * 1. Centralized tracking of voice mode state
 * 2. Events for all state changes that components can subscribe to
 * 3. Methods for controlling voice mode that update all related state
 * 4. Clean integration with VoiceModeManager to prevent duplication
 * 
 * Use this manager instead of directly managing voice state in components
 * to reduce duplication and ensure consistency.
 */
class VoiceStateManager extends EventEmitter {
  // We'll track key voice state here instead of duplicating in multiple components
  private _isRecording: boolean = false;
  private _isProcessing: boolean = false;
  private _activeVoiceBotIds: string[] = [];
  private _currentState: VoiceModeState = VoiceModeState.IDLE;
  private _lastTransitionTime: number = 0;
  private _lastError: Error | null = null;

  constructor() {
    super();
    this.initEventListeners();
  }

  /**
   * Initialize event listeners to keep our state in sync with VoiceModeManager
   */
  private initEventListeners(): void {
    // Subscribe to VoiceModeManager state changes
    voiceModeManager.on('state:changed', ({ prevState, nextState }) => {
      this._currentState = nextState;
      
      // Update isRecording based on voice mode state
      if (nextState === VoiceModeState.ACTIVE || nextState === VoiceModeState.PROCESSING) {
        this._isRecording = true;
      } else if (nextState === VoiceModeState.IDLE || nextState === VoiceModeState.ERROR) {
        this._isRecording = false;
      }
      
      // Update isProcessing based on voice mode state
      this._isProcessing = nextState === VoiceModeState.PROCESSING;
      
      // Track transition time
      this._lastTransitionTime = Date.now();
      
      // Emit our own unified state change event
      this.emit('state:changed', {
        prevState,
        nextState,
        isRecording: this._isRecording,
        isProcessing: this._isProcessing,
        timestamp: this._lastTransitionTime
      });
    });
    
    // Track voice ghosts
    voiceModeManager.on('ghosts:created', (ghosts) => {
      this._activeVoiceBotIds = ghosts.map(ghost => ghost.id);
      this.emit('voiceBots:updated', this._activeVoiceBotIds);
    });
    
    // Track ghost cleanup
    voiceModeManager.on('ghosts:cleared', () => {
      this._activeVoiceBotIds = [];
      this.emit('voiceBots:updated', this._activeVoiceBotIds);
    });
    
    // Track errors
    voiceModeManager.on('state:changed', ({ nextState, data }) => {
      if (nextState === VoiceModeState.ERROR && data?.error) {
        this._lastError = data.error;
        this.emit('error', this._lastError);
      }
    });
  }

  /**
   * Start voice mode with the given bots and message history
   * @param activeBotIds - The IDs of the bots to activate in voice mode
   * @param bots - The bot instances
   * @param messages - Message history for context inheritance
   */
  public startVoiceMode(activeBotIds: string[], bots: Bot[], messages: any[] = []): void {
    if (this._isRecording) {
      console.warn('Voice mode is already active');
      return;
    }
    
    // Use VoiceModeManager to activate voice mode - no need to duplicate logic
    voiceModeManager.activateVoiceMode(activeBotIds, bots, messages);
  }

  /**
   * Stop voice mode and return to text mode
   */
  public stopVoiceMode(): void {
    if (!this._isRecording) {
      console.warn('Voice mode is not active');
      return;
    }
    
    // Use VoiceModeManager to deactivate voice mode
    voiceModeManager.deactivateVoiceMode();
  }

  /**
   * Toggle voice processing state
   * @param isProcessing - Whether voice processing is active
   */
  public setProcessing(isProcessing: boolean): void {
    if (isProcessing) {
      voiceModeManager.transition(VoiceModeTransition.START_PROCESSING);
    } else {
      voiceModeManager.transition(VoiceModeTransition.STOP_PROCESSING);
    }
  }

  /**
   * Reset voice mode state after an error
   */
  public resetVoiceMode(): void {
    voiceModeManager.transition(VoiceModeTransition.RESET);
    this._lastError = null;
  }

  // Getters for state - read-only to prevent direct mutation
  get isRecording(): boolean { return this._isRecording; }
  get isProcessing(): boolean { return this._isProcessing; }
  get activeVoiceBotIds(): string[] { return [...this._activeVoiceBotIds]; }
  get currentState(): VoiceModeState { return this._currentState; }
  get lastTransitionTime(): number { return this._lastTransitionTime; }
  get lastError(): Error | null { return this._lastError; }
}

// Export a singleton instance
const voiceStateManager = new VoiceStateManager();
export default voiceStateManager; 