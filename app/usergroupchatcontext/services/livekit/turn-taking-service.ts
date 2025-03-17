import { EventEmitter } from 'events';
import voiceActivityService, { VoiceActivityState } from './voice-activity-service';
import multimodalAgentService from './multimodal-agent-service';
import { BotId } from '../../types';

export interface TurnState {
  currentSpeaker: 'user' | BotId | null;
  queue: Array<BotId | 'user'>;
  isTransitioning: boolean;
  lastTransitionTime: number;
}

export interface TurnTakingOptions {
  minTurnDurationMs?: number; // Minimum duration a speaker holds the turn
  maxTurnDurationMs?: number; // Maximum duration before interruption is allowed
  transitionGapMs?: number; // Gap between turns
  interruptionThreshold?: number; // Volume level that triggers interruption (0-1)
  enableInterruptions?: boolean; // Whether interruptions are allowed at all
  priorityBots?: BotId[]; // Bots that get priority in the queue
}

type TurnEvent = 
  | 'turn:started' 
  | 'turn:ended' 
  | 'turn:interrupted' 
  | 'turn:userSpeaking' 
  | 'turn:botSpeaking' 
  | 'turn:silence' 
  | 'queue:updated';

/**
 * Service to manage turn-taking in multimodal conversations
 */
export class TurnTakingService extends EventEmitter {
  private options: TurnTakingOptions = {
    minTurnDurationMs: 1000,
    maxTurnDurationMs: 30000,
    transitionGapMs: 500,
    interruptionThreshold: 0.7,
    enableInterruptions: true,
    priorityBots: []
  };

  private state: TurnState = {
    currentSpeaker: null,
    queue: [],
    isTransitioning: false,
    lastTransitionTime: 0
  };

  private userSpeakingTimeout: NodeJS.Timeout | null = null;
  private turnMaxDurationTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the turn-taking service
   */
  public initialize(options?: Partial<TurnTakingOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Register for voice activity events to detect user speaking
    voiceActivityService.onVoiceActivity(this.handleVoiceActivity);
    
    this.isInitialized = true;
    console.log('Turn-taking service initialized with options:', this.options);
  }

  /**
   * Request a turn for a bot to speak
   */
  public requestTurn(botId: BotId, immediate: boolean = false): boolean {
    if (!this.isInitialized) {
      console.error('Turn-taking service not initialized');
      return false;
    }

    // If requesting immediate turn and allowed
    if (immediate && this.canInterrupt(botId)) {
      this.interruptCurrentSpeaker();
      this.grantTurn(botId);
      return true;
    }

    // If no one is speaking, grant turn immediately
    if (!this.state.currentSpeaker) {
      this.grantTurn(botId);
      return true;
    }

    // Otherwise add to queue if not already in queue
    if (!this.state.queue.includes(botId)) {
      // Add priority bots to front of queue
      if (this.options.priorityBots?.includes(botId)) {
        this.state.queue.unshift(botId);
      } else {
        this.state.queue.push(botId);
      }
      
      this.emit('queue:updated', this.state.queue);
      return true;
    }

    return false;
  }

  /**
   * Register the user as requesting a turn
   */
  public userRequestsTurn(immediate: boolean = false): boolean {
    if (!this.isInitialized) {
      console.error('Turn-taking service not initialized');
      return false;
    }

    // If user is already speaking, nothing to do
    if (this.state.currentSpeaker === 'user') {
      return true;
    }

    // If requesting immediate turn and allowed
    if (immediate && this.canInterrupt('user')) {
      this.interruptCurrentSpeaker();
      this.grantTurn('user');
      return true;
    }

    // If no one is speaking, grant turn immediately
    if (!this.state.currentSpeaker) {
      this.grantTurn('user');
      return true;
    }

    // Otherwise add to queue if not already in queue
    if (!this.state.queue.includes('user')) {
      // User gets priority in the queue
      this.state.queue.unshift('user');
      this.emit('queue:updated', this.state.queue);
      return true;
    }

    return false;
  }

  /**
   * End the current turn
   */
  public endCurrentTurn(): void {
    if (!this.state.currentSpeaker) return;

    const currentSpeaker = this.state.currentSpeaker;
    this.state.currentSpeaker = null;
    this.state.isTransitioning = true;
    this.state.lastTransitionTime = Date.now();
    
    // Clear any pending timeouts
    if (this.turnMaxDurationTimeout) {
      clearTimeout(this.turnMaxDurationTimeout);
      this.turnMaxDurationTimeout = null;
    }
    
    if (this.userSpeakingTimeout) {
      clearTimeout(this.userSpeakingTimeout);
      this.userSpeakingTimeout = null;
    }
    
    this.emit('turn:ended', currentSpeaker);
    
    // Process next turn after transition gap
    setTimeout(() => {
      this.state.isTransitioning = false;
      this.processNextTurn();
    }, this.options.transitionGapMs);
  }

  /**
   * Get the current turn state
   */
  public getTurnState(): TurnState {
    return { ...this.state };
  }

  /**
   * Update turn-taking options
   */
  public updateOptions(options: Partial<TurnTakingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Register an event listener
   */
  public on(event: TurnEvent, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Cleanup resources when service is no longer needed
   */
  public destroy(): void {
    voiceActivityService.offVoiceActivity(this.handleVoiceActivity);
    
    if (this.turnMaxDurationTimeout) {
      clearTimeout(this.turnMaxDurationTimeout);
    }
    
    if (this.userSpeakingTimeout) {
      clearTimeout(this.userSpeakingTimeout);
    }
    
    this.removeAllListeners();
    this.isInitialized = false;
  }

  /**
   * Handle voice activity for user turn detection
   */
  private handleVoiceActivity = (state: VoiceActivityState): void => {
    // If user begins speaking
    if (state.isSpeaking) {
      // If someone else is speaking, check if user can interrupt
      if (this.state.currentSpeaker && this.state.currentSpeaker !== 'user') {
        if (
          this.options.enableInterruptions && 
          state.level > (this.options.interruptionThreshold || 0.7) &&
          Date.now() - this.state.lastTransitionTime > (this.options.minTurnDurationMs || 1000)
        ) {
          this.userRequestsTurn(true);
        } else {
          this.userRequestsTurn(false);
        }
      } 
      // If no one is speaking, grant turn to user
      else if (!this.state.currentSpeaker && !this.state.isTransitioning) {
        this.grantTurn('user');
      }
      
      // Reset user speaking timeout if it exists
      if (this.userSpeakingTimeout) {
        clearTimeout(this.userSpeakingTimeout);
        this.userSpeakingTimeout = null;
      }
    } 
    // If user stops speaking
    else if (!state.isSpeaking && this.state.currentSpeaker === 'user') {
      // Set timeout to end user's turn after silence
      if (!this.userSpeakingTimeout) {
        this.userSpeakingTimeout = setTimeout(() => {
          if (this.state.currentSpeaker === 'user') {
            this.endCurrentTurn();
          }
        }, this.options.transitionGapMs || 500);
      }
    }
  };

  /**
   * Process the next turn in the queue
   */
  private processNextTurn(): void {
    // If we're in a transition or someone is already speaking, do nothing
    if (this.state.isTransitioning || this.state.currentSpeaker) {
      return;
    }
    
    // If there's someone in the queue, grant them the turn
    if (this.state.queue.length > 0) {
      const nextSpeaker = this.state.queue.shift()!;
      this.emit('queue:updated', this.state.queue);
      this.grantTurn(nextSpeaker);
    } else {
      this.emit('turn:silence');
    }
  }

  /**
   * Grant a turn to a speaker
   */
  private grantTurn(speaker: BotId | 'user'): void {
    this.state.currentSpeaker = speaker;
    this.state.lastTransitionTime = Date.now();
    
    // Set maximum turn duration timeout
    this.turnMaxDurationTimeout = setTimeout(() => {
      if (this.state.currentSpeaker === speaker) {
        this.endCurrentTurn();
      }
    }, this.options.maxTurnDurationMs);
    
    // Emit appropriate events
    if (speaker === 'user') {
      this.emit('turn:userSpeaking', speaker);
    } else {
      this.emit('turn:botSpeaking', speaker);
    }
    
    this.emit('turn:started', speaker);
  }

  /**
   * Check if the given speaker can interrupt the current speaker
   */
  private canInterrupt(speaker: BotId | 'user'): boolean {
    // If interruptions are disabled, don't allow
    if (!this.options.enableInterruptions) {
      return false;
    }
    
    // If no one is speaking, then it's not an interruption
    if (!this.state.currentSpeaker) {
      return true;
    }
    
    // Don't interrupt yourself
    if (this.state.currentSpeaker === speaker) {
      return false;
    }
    
    // Check if minimum turn duration has elapsed
    const turnDuration = Date.now() - this.state.lastTransitionTime;
    if (turnDuration < (this.options.minTurnDurationMs || 1000)) {
      return false;
    }
    
    // Prioritize human interruptions
    if (speaker === 'user') {
      return true;
    }
    
    // Priority bots can interrupt non-priority bots
    if (
      this.options.priorityBots?.includes(speaker as BotId) && 
      this.state.currentSpeaker !== 'user' &&
      !this.options.priorityBots?.includes(this.state.currentSpeaker as BotId)
    ) {
      return true;
    }
    
    return false;
  }

  /**
   * Interrupt the current speaker
   */
  private interruptCurrentSpeaker(): void {
    if (!this.state.currentSpeaker) return;
    
    const interruptedSpeaker = this.state.currentSpeaker;
    
    // Clear any timeouts
    if (this.turnMaxDurationTimeout) {
      clearTimeout(this.turnMaxDurationTimeout);
      this.turnMaxDurationTimeout = null;
    }
    
    if (this.userSpeakingTimeout) {
      clearTimeout(this.userSpeakingTimeout);
      this.userSpeakingTimeout = null;
    }
    
    this.state.currentSpeaker = null;
    this.emit('turn:interrupted', interruptedSpeaker);
  }
}

// Create a singleton instance
const turnTakingService = new TurnTakingService();
export default turnTakingService; 