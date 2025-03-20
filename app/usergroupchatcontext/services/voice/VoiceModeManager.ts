import { EventEmitter } from 'events';
import { Bot } from '../../types';
import { 
  VoiceOption, 
  VoiceGhost, 
  VoiceTransitionMetrics,
  VoiceSessionData 
} from '../../types/voice';
import { VoiceConfig } from '../../types/bots';

// Voice mode states
export enum VoiceModeState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  ERROR = 'error',
  TRANSITIONING_TO_TEXT = 'transitioning_to_text',
  TRANSITIONING_TO_VOICE = 'transitioning_to_voice'
}

// Transitions between states
export enum VoiceModeTransition {
  INITIALIZE = 'initialize',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  START_PROCESSING = 'start_processing',
  STOP_PROCESSING = 'stop_processing',
  ERROR_OCCURRED = 'error_occurred',
  RESET = 'reset'
}

export interface VoiceModeManagerConfig {
  keepPreprocessingHooks?: boolean;
  keepPostprocessingHooks?: boolean;
  preserveVoiceHistory?: boolean;
  automaticVoiceSelection?: boolean;
  defaultVoice?: VoiceOption;
}

export class VoiceModeManager extends EventEmitter {
  private state: VoiceModeState = VoiceModeState.IDLE;
  private voiceGhosts: Map<string, VoiceGhost> = new Map();
  private activeBots: string[] = [];
  private config: VoiceModeManagerConfig = {
    keepPreprocessingHooks: false,
    keepPostprocessingHooks: false,
    preserveVoiceHistory: true,
    automaticVoiceSelection: true,
    defaultVoice: 'alloy'
  };
  private error: Error | null = null;
  private transitionStartTime: number = 0;

  constructor(config?: Partial<VoiceModeManagerConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Get the current state of the voice mode manager
   */
  public getState(): VoiceModeState {
    return this.state;
  }

  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<VoiceModeManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }

  /**
   * Get the current configuration
   */
  public getConfig(): VoiceModeManagerConfig {
    return { ...this.config };
  }

  /**
   * Transition to a new state based on the current state and transition
   */
  public transition(transition: VoiceModeTransition, data?: any): boolean {
    const prevState = this.state;
    let nextState: VoiceModeState | null = null;

    // State transition logic
    switch (this.state) {
      case VoiceModeState.IDLE:
        if (transition === VoiceModeTransition.INITIALIZE) {
          nextState = VoiceModeState.INITIALIZING;
        }
        break;
      case VoiceModeState.INITIALIZING:
        if (transition === VoiceModeTransition.ACTIVATE) {
          nextState = VoiceModeState.ACTIVE;
        } else if (transition === VoiceModeTransition.ERROR_OCCURRED) {
          nextState = VoiceModeState.ERROR;
          this.error = data?.error || new Error('Unknown error during initialization');
        }
        break;
      case VoiceModeState.ACTIVE:
        if (transition === VoiceModeTransition.START_PROCESSING) {
          nextState = VoiceModeState.PROCESSING;
        } else if (transition === VoiceModeTransition.DEACTIVATE) {
          nextState = VoiceModeState.TRANSITIONING_TO_TEXT;
        } else if (transition === VoiceModeTransition.ERROR_OCCURRED) {
          nextState = VoiceModeState.ERROR;
          this.error = data?.error || new Error('Unknown error during active voice mode');
        }
        break;
      case VoiceModeState.PROCESSING:
        if (transition === VoiceModeTransition.STOP_PROCESSING) {
          nextState = VoiceModeState.ACTIVE;
        } else if (transition === VoiceModeTransition.DEACTIVATE) {
          nextState = VoiceModeState.TRANSITIONING_TO_TEXT;
        } else if (transition === VoiceModeTransition.ERROR_OCCURRED) {
          nextState = VoiceModeState.ERROR;
          this.error = data?.error || new Error('Unknown error during voice processing');
        }
        break;
      case VoiceModeState.ERROR:
        if (transition === VoiceModeTransition.RESET) {
          nextState = VoiceModeState.IDLE;
          this.error = null;
        }
        break;
      case VoiceModeState.TRANSITIONING_TO_TEXT:
        if (transition === VoiceModeTransition.RESET) {
          nextState = VoiceModeState.IDLE;
        }
        break;
      case VoiceModeState.TRANSITIONING_TO_VOICE:
        if (transition === VoiceModeTransition.ACTIVATE) {
          nextState = VoiceModeState.ACTIVE;
        } else if (transition === VoiceModeTransition.ERROR_OCCURRED) {
          nextState = VoiceModeState.ERROR;
          this.error = data?.error || new Error('Unknown error during transition to voice');
        }
        break;
    }

    if (nextState) {
      this.state = nextState;
      this.emit('state:changed', { prevState, nextState, data });
      return true;
    }

    return false;
  }

  /**
   * Create voice ghosts for the active bots
   */
  public createVoiceGhosts(activeBotIds: string[], bots: Bot[]): VoiceGhost[] {
    this.activeBots = [...activeBotIds];
    
    // Clear previous ghosts
    this.voiceGhosts.clear();
    
    // Create a voice ghost for each active bot
    const ghosts: VoiceGhost[] = [];
    
    for (const botId of activeBotIds) {
      const originalBot = bots.find(b => b.id === botId);
      if (!originalBot) continue;

      // Create a clone of the bot with voice-optimized settings
      const ghostBot: Bot = {
        ...originalBot,
        id: `ghost-${originalBot.id}`,
        name: `${originalBot.name} (Voice)`,
        // Disable certain hooks based on config
        preProcessingPrompt: this.config.keepPreprocessingHooks ? originalBot.preProcessingPrompt : undefined,
        postProcessingPrompt: this.config.keepPostprocessingHooks ? originalBot.postProcessingPrompt : undefined,
        // Override voice settings
        voiceSettings: {
          ...originalBot.voiceSettings,
          voice: originalBot.voiceSettings?.voice || this.config.defaultVoice || 'alloy',
        }
      };

      const ghost: VoiceGhost = {
        id: ghostBot.id,
        originalBotId: originalBot.id,
        bot: ghostBot,
        conversationContext: [], // Initially empty, will be set by inheritConversationContext
        created: Date.now()
      };

      this.voiceGhosts.set(originalBot.id, ghost);
      ghosts.push(ghost);
    }

    this.emit('ghosts:created', ghosts);
    return ghosts;
  }

  /**
   * Inherit conversation context from original bots to their voice ghosts
   * This method is a critical part of the voice mode transition, ensuring that
   * voice ghosts have access to the full conversation history relevant to them.
   * 
   * The method filters messages by:
   * 1. User messages - all included to maintain conversation flow
   * 2. System messages - included to maintain global context
   * 3. Bot messages - only those from the original bot being cloned
   * 
   * This filtering ensures that each ghost only inherits relevant context,
   * which improves efficiency and prevents context pollution.
   * 
   * @param messages - The current message history to inherit
   */
  public inheritConversationContext(messages: any[]): void {
    if (!messages || messages.length === 0) {
      console.warn('No messages to inherit for voice ghosts');
      return;
    }

    // Convert Map keys to array for safe iteration
    const originalBotIds = Array.from(this.voiceGhosts.keys());
    
    // For each voice ghost, filter messages related to its original bot
    for (const originalBotId of originalBotIds) {
      const ghost = this.voiceGhosts.get(originalBotId);
      if (!ghost) continue;
      
      // Get all messages from the original bot plus user messages
      // This selective filtering is important for maintaining conversation coherence
      // while preventing context contamination from other bots' messages
      const relevantMessages = messages.filter(msg => 
        msg.sender === originalBotId || msg.role === 'user' || msg.role === 'system'
      );

      if (relevantMessages.length > 0) {
        // Store the conversation context in the ghost
        ghost.conversationContext = [...relevantMessages];
        
        // Update the ghost in the map
        this.voiceGhosts.set(originalBotId, ghost);
        
        console.log(`Inherited ${relevantMessages.length} messages for voice ghost of ${originalBotId}`);
      }
    }

    // Notify listeners that context inheritance is complete
    this.emit('context:inherited', Array.from(this.voiceGhosts.values()));
  }
  
  /**
   * Get the conversation context for a specific voice ghost
   * Used by voice services to initialize the voice model with previous conversation history
   * 
   * @param botId - The original bot ID
   * @returns The conversation context for the voice ghost, or undefined if not found
   */
  public getVoiceGhostConversationContext(botId: string): any[] | undefined {
    const ghost = this.voiceGhosts.get(botId);
    return ghost?.conversationContext;
  }

  /**
   * Get a voice ghost for the given bot ID
   */
  public getVoiceGhost(botId: string): VoiceGhost | undefined {
    return this.voiceGhosts.get(botId);
  }

  /**
   * Get all voice ghosts
   */
  public getAllVoiceGhosts(): VoiceGhost[] {
    return Array.from(this.voiceGhosts.values());
  }

  /**
   * Check if voice mode is active
   */
  public isVoiceModeActive(): boolean {
    return this.state === VoiceModeState.ACTIVE || 
           this.state === VoiceModeState.PROCESSING;
  }

  /**
   * Get the current error (if any)
   */
  public getError(): Error | null {
    return this.error;
  }

  /**
   * Clear all voice ghosts
   */
  public clearVoiceGhosts(): void {
    this.voiceGhosts.clear();
    this.emit('ghosts:cleared');
  }

  /**
   * Helper method to activate voice mode with conversation context
   * Streamlines the process of:
   * 1. Creating voice ghosts for active bots
   * 2. Inheriting relevant conversation context
   * 3. Transitioning to active voice mode state
   * 
   * This ensures a seamless transition from text to voice mode
   * while maintaining full conversation continuity.
   */
  public activateVoiceMode(activeBotIds: string[], bots: Bot[], messages: any[] = []): VoiceGhost[] {
    this.transition(VoiceModeTransition.INITIALIZE);
    const ghosts = this.createVoiceGhosts(activeBotIds, bots);
    
    // Inherit conversation context if messages are provided
    if (messages && messages.length > 0) {
      this.inheritConversationContext(messages);
    }
    
    this.transition(VoiceModeTransition.ACTIVATE);
    return ghosts;
  }

  /**
   * Cleanly shutdown and remove voice ghosts, ensuring proper resource cleanup
   * This is a crucial method for proper transition from voice to text mode
   */
  public cleanupVoiceGhosts(): void {
    // First emit event with list of ghost IDs for proper tracking and cleanup
    const ghostIds = Array.from(this.voiceGhosts.values()).map(ghost => ghost.id);
    
    if (ghostIds.length > 0) {
      this.emit('ghosts:before-cleanup', ghostIds);
      
      // Log ghost cleanup for debugging
      console.log(`Cleaning up ${this.voiceGhosts.size} voice ghosts`);
      
      // Mark ghosts as being destroyed
      // Convert the Map values iterator to an array before iterating
      const ghostsArray = Array.from(this.voiceGhosts.values());
      for (const ghost of ghostsArray) {
        this.logGhostLifecycle('destroy', ghost, { timestamp: Date.now() });
      }
      
      // Clear the voice ghosts map
      this.voiceGhosts.clear();
      
      // Event to notify of completed cleanup
      this.emit('ghosts:cleanup-complete', { timestamp: Date.now() });
    }
  }

  /**
   * Enhanced deactivate voice mode method with proper transition management
   * This method ensures a smooth return to text mode with:
   * 1. Staged cleanup approach to prevent UI glitches
   * 2. Proper event emission for tracking
   * 3. Voice session data preservation
   */
  public deactivateVoiceMode(): void {
    try {
      // Only proceed if we're in an active voice state
      if (
        this.state !== VoiceModeState.ACTIVE && 
        this.state !== VoiceModeState.PROCESSING
      ) {
        console.warn(`Cannot deactivate voice mode from state: ${this.state}`);
        return;
      }
      
      // Mark the start of transition
      this.transitionStartTime = Date.now();
      
      // Transition to deactivating state
      const transitioned = this.transition(VoiceModeTransition.DEACTIVATE);
      
      if (!transitioned) {
        console.error('Failed to transition to deactivating state');
        return;
      }
      
      // Gather voice session data if preserving history
      if (this.config.preserveVoiceHistory) {
        const voiceGhostIds = Array.from(this.voiceGhosts.keys());
        const sessionData = {
          messages: [] as any[],
          duration: Date.now() - this.transitionStartTime,
          botIds: voiceGhostIds
        };
        
        // Collect conversation contexts from all voice ghosts
        for (const botId of voiceGhostIds) {
          const context = this.getVoiceGhostConversationContext(botId);
          if (context) {
            sessionData.messages = sessionData.messages.concat(context);
          }
        }
        
        this.preserveVoiceSessionData(sessionData);
      }
      
      // Emit voice-to-text transition event with ghost IDs for tracking
      const voiceGhostIds = Array.from(this.voiceGhosts.values()).map(ghost => ghost.id);
      this.emit('transition:voice-to-text', {
        timestamp: Date.now(),
        voiceGhostIds
      });
      
      // Perform ghost cleanup
      this.cleanupVoiceGhosts();
      
      // Reset state after a short delay to ensure clean transition
      setTimeout(() => {
        this.transition(VoiceModeTransition.RESET);
      }, 500);
    } catch (error) {
      console.error('Error during voice mode deactivation:', error);
      this.handleInterruptedSession('Error during deactivation', error as Error);
    }
  }

  /**
   * Track voice mode state changes with detailed logging
   * This method helps debug transition issues and monitor voice mode lifecycle
   */
  public trackStateChanges(): void {
    this.on('state:changed', ({ prevState, nextState, data }) => {
      console.log(`Voice Mode State Change: ${prevState} -> ${nextState}`, data);
      
      // Log transition times for performance monitoring
      if (
        prevState === VoiceModeState.TRANSITIONING_TO_VOICE && 
        nextState === VoiceModeState.ACTIVE
      ) {
        const transitionTime = Date.now() - this.transitionStartTime;
        console.log(`Text-to-Voice transition completed in ${transitionTime}ms`);
      } else if (
        prevState === VoiceModeState.TRANSITIONING_TO_TEXT && 
        nextState === VoiceModeState.IDLE
      ) {
        const transitionTime = Date.now() - this.transitionStartTime;
        console.log(`Voice-to-Text transition completed in ${transitionTime}ms`);
      }
    });
  }

  /**
   * Track voice session data for history preservation
   * @param sessionData Information about the voice session to preserve
   */
  public preserveVoiceSessionData(sessionData: {
    messages: any[];
    duration: number;
    botIds: string[];
  }): void {
    // Emit event with voice session data for context preservation
    this.emit('session:preserve', {
      ...sessionData,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle interrupted voice sessions gracefully
   * @param reason The reason for the interruption
   * @param error Optional error information
   */
  public handleInterruptedSession(reason: string, error?: Error): void {
    // Set the error state if an error was provided
    if (error) {
      this.error = error;
      this.transition(VoiceModeTransition.ERROR_OCCURRED, { error });
    } else {
      // Otherwise just deactivate normally
      this.transition(VoiceModeTransition.DEACTIVATE);
    }
    
    // Emit event for session interruption
    this.emit('session:interrupted', {
      reason,
      timestamp: Date.now(),
      error: error?.message
    });
    
    // Clean up regardless of the reason
    this.clearVoiceGhosts();
    this.transition(VoiceModeTransition.RESET);
  }
  
  /**
   * Re-enable processing hooks for text mode
   * This is called after transitioning back to text mode to ensure
   * that any hooks disabled during voice mode are properly re-enabled
   * 
   * @param botIds Array of bot IDs to re-enable hooks for
   */
  public reEnableProcessingHooks(botIds: string[]): void {
    // Emit event for re-enabling hooks
    this.emit('hooks:reenable', {
      botIds,
      timestamp: Date.now(),
      hooks: {
        preProcessing: !this.config.keepPreprocessingHooks,
        postProcessing: !this.config.keepPostprocessingHooks,
        reprocessing: true
      }
    });
  }

  /**
   * Enhanced transition method with additional lifecycle events
   * and performance tracking
   */
  public enhancedTransition(transition: VoiceModeTransition, data?: any): boolean {
    // Record start time for performance tracking
    if (
      transition === VoiceModeTransition.INITIALIZE ||
      transition === VoiceModeTransition.DEACTIVATE
    ) {
      this.transitionStartTime = Date.now();
      
      // Emit detailed lifecycle start event
      this.emit('lifecycle:start', {
        transition,
        timestamp: this.transitionStartTime,
        fromState: this.state
      });
    }
    
    // Perform the state transition
    const success = this.transition(transition, data);
    
    // Emit detailed lifecycle event after transition
    if (success) {
      this.emit('lifecycle:transition', {
        transition,
        fromState: data?.prevState || null,
        toState: this.state,
        timestamp: Date.now(),
        data
      });
    }
    
    return success;
  }
  
  /**
   * Log detailed ghost lifecycle events
   * This is useful for debugging and monitoring ghost creation/destruction
   */
  public logGhostLifecycle(action: 'create' | 'destroy' | 'update', ghost: VoiceGhost, details?: any): void {
    this.emit(`lifecycle:ghost:${action}`, {
      timestamp: Date.now(),
      ghostId: ghost.id,
      originalBotId: ghost.originalBotId,
      details
    });
  }
  
  /**
   * Add additional event listener types for better TypeScript support
   */
  public on(event: 'state:changed', listener: (data: { prevState: VoiceModeState, nextState: VoiceModeState, data?: any }) => void): this;
  public on(event: 'ghosts:created', listener: (ghosts: VoiceGhost[]) => void): this;
  public on(event: 'ghosts:cleared', listener: () => void): this;
  public on(event: 'context:inherited', listener: (ghosts: VoiceGhost[]) => void): this;
  public on(event: 'transition:voice-to-text', listener: (data: { timestamp: number, voiceGhostIds: string[] }) => void): this;
  public on(event: 'transition:complete', listener: (data: { direction: 'text-to-voice' | 'voice-to-text', timestamp: number }) => void): this;
  public on(event: 'lifecycle:start', listener: (data: { transition: VoiceModeTransition, timestamp: number, fromState: VoiceModeState }) => void): this;
  public on(event: 'lifecycle:transition', listener: (data: { transition: VoiceModeTransition, fromState: VoiceModeState | null, toState: VoiceModeState, timestamp: number, data?: any }) => void): this;
  public on(event: 'lifecycle:complete', listener: (data: { direction: 'text-to-voice' | 'voice-to-text', timestamp: number, duration: number, success: boolean }) => void): this;
  public on(event: 'lifecycle:voice-ghost:deactivate', listener: (data: { timestamp: number, ghostCount: number, activeBots: string[], transitionStartTime: number }) => void): this;
  public on(event: 'lifecycle:ghost:create' | 'lifecycle:ghost:destroy' | 'lifecycle:ghost:update', listener: (data: { timestamp: number, ghostId: string, originalBotId: string, details?: any }) => void): this;
  public on(event: 'config:updated', listener: (config: VoiceModeManagerConfig) => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
  
  /**
   * Remove event listener with improved TypeScript types
   */
  public off(event: 'state:changed', listener: (data: { prevState: VoiceModeState, nextState: VoiceModeState, data?: any }) => void): this;
  public off(event: 'ghosts:created', listener: (ghosts: VoiceGhost[]) => void): this;
  public off(event: 'ghosts:cleared', listener: () => void): this;
  public off(event: 'context:inherited', listener: (ghosts: VoiceGhost[]) => void): this;
  public off(event: 'transition:voice-to-text', listener: (data: { timestamp: number, voiceGhostIds: string[] }) => void): this;
  public off(event: 'transition:complete', listener: (data: { direction: 'text-to-voice' | 'voice-to-text', timestamp: number }) => void): this;
  public off(event: 'lifecycle:start', listener: (data: { transition: VoiceModeTransition, timestamp: number, fromState: VoiceModeState }) => void): this;
  public off(event: 'lifecycle:transition', listener: (data: { transition: VoiceModeTransition, fromState: VoiceModeState | null, toState: VoiceModeState, timestamp: number, data?: any }) => void): this;
  public off(event: 'lifecycle:complete', listener: (data: { direction: 'text-to-voice' | 'voice-to-text', timestamp: number, duration: number, success: boolean }) => void): this;
  public off(event: 'lifecycle:voice-ghost:deactivate', listener: (data: { timestamp: number, ghostCount: number, activeBots: string[], transitionStartTime: number }) => void): this;
  public off(event: 'lifecycle:ghost:create' | 'lifecycle:ghost:destroy' | 'lifecycle:ghost:update', listener: (data: { timestamp: number, ghostId: string, originalBotId: string, details?: any }) => void): this;
  public off(event: 'config:updated', listener: (config: VoiceModeManagerConfig) => void): this;
  public off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }
  
  /**
   * Helper method to activate voice mode with additional lifecycle events
   */
  public enhancedActivateVoiceMode(activeBotIds: string[], bots: Bot[], messages: any[] = []): VoiceGhost[] {
    this.transitionStartTime = Date.now();
    
    // Emit lifecycle start event
    this.emit('lifecycle:start', {
      transition: VoiceModeTransition.INITIALIZE,
      timestamp: this.transitionStartTime,
      fromState: this.state
    });
    
    // Perform the transition
    this.transition(VoiceModeTransition.INITIALIZE);
    const ghosts = this.createVoiceGhosts(activeBotIds, bots);
    
    // Log ghost creation
    ghosts.forEach(ghost => {
      this.logGhostLifecycle('create', ghost);
    });
    
    // Inherit conversation context if messages are provided
    if (messages && messages.length > 0) {
      this.inheritConversationContext(messages);
    }
    
    this.transition(VoiceModeTransition.ACTIVATE);
    
    // Emit completion event
    this.emit('lifecycle:complete', {
      direction: 'text-to-voice',
      timestamp: Date.now(),
      duration: Date.now() - this.transitionStartTime,
      success: true
    });
    
    return ghosts;
  }
}

// Export a singleton instance
const voiceModeManager = new VoiceModeManager();
export default voiceModeManager; 