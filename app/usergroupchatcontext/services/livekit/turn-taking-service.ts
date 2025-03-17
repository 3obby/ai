import { EventEmitter } from 'events';
import voiceActivityService, { VoiceActivityState } from './voice-activity-service';
import multimodalAgentService from './multimodal-agent-service';
import { BotId } from '../../types';

export interface TurnState {
  currentSpeaker: 'user' | BotId | null;
  queue: Array<BotId | 'user'>;
  isTransitioning: boolean;
  lastTransitionTime: number;
  // New properties to support multi-participant tracking
  participants: Set<BotId | 'user'>;
  speakingHistory: Array<{
    speaker: BotId | 'user',
    startTime: number,
    endTime?: number
  }>;
  interruptionAttempts: Map<BotId | 'user', number>;
}

export interface TurnTakingOptions {
  minTurnDurationMs: number;
  maxTurnDurationMs: number;
  transitionGapMs: number;
  interruptionThreshold: number;
  enableInterruptions: boolean;
  priorityBots: BotId[];
  // New options for multi-participant enhancements
  fairnessEnabled: boolean;
  maxConsecutiveTurns: number;
  interruptionPenaltyMs: number;
  participantTimeout: number;
  maxQueueSize: number;
  dynamicPriorityEnabled: boolean;
}

type TurnEvent = 
  | 'turn:started' 
  | 'turn:ended' 
  | 'turn:interrupted' 
  | 'turn:userSpeaking' 
  | 'turn:botSpeaking' 
  | 'turn:silence' 
  | 'queue:updated' 
  | 'participant:joined' 
  | 'participant:left';

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
    priorityBots: [],
    // Default values for new options
    fairnessEnabled: true,
    maxConsecutiveTurns: 3,
    interruptionPenaltyMs: 2000,
    participantTimeout: 120000, // 2 minutes
    maxQueueSize: 10,
    dynamicPriorityEnabled: true
  };

  private state: TurnState = {
    currentSpeaker: null,
    queue: [],
    isTransitioning: false,
    lastTransitionTime: 0,
    // Initialize new properties
    participants: new Set(['user']),
    speakingHistory: [],
    interruptionAttempts: new Map()
  };

  private userSpeakingTimeout: NodeJS.Timeout | null = null;
  private turnMaxDurationTimeout: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private consecutiveTurnCount: Map<BotId | 'user', number> = new Map();
  private participantTimeouts: Map<BotId | 'user', NodeJS.Timeout> = new Map();
  private dynamicPriorityScores: Map<BotId | 'user', number> = new Map();

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
   * Register a new participant in the conversation
   */
  public registerParticipant(participantId: BotId | 'user'): void {
    if (this.state.participants.has(participantId)) {
      return;
    }
    
    this.state.participants.add(participantId);
    this.consecutiveTurnCount.set(participantId, 0);
    this.dynamicPriorityScores.set(participantId, 1.0);
    this.resetParticipantTimeout(participantId);
    
    this.emit('participant:joined', participantId);
    console.log(`Participant ${participantId} joined the conversation`);
  }

  /**
   * Remove a participant from the conversation
   */
  public removeParticipant(participantId: BotId | 'user'): void {
    if (!this.state.participants.has(participantId)) {
      return;
    }
    
    this.state.participants.delete(participantId);
    this.consecutiveTurnCount.delete(participantId);
    this.dynamicPriorityScores.delete(participantId);
    
    // Clear any timeouts
    if (this.participantTimeouts.has(participantId)) {
      clearTimeout(this.participantTimeouts.get(participantId)!);
      this.participantTimeouts.delete(participantId);
    }
    
    // Remove from queue if present
    this.state.queue = this.state.queue.filter(id => id !== participantId);
    
    // End turn if this participant was speaking
    if (this.state.currentSpeaker === participantId) {
      this.endCurrentTurn();
    }
    
    this.emit('participant:left', participantId);
    console.log(`Participant ${participantId} left the conversation`);
  }

  /**
   * Request a turn for a bot to speak
   */
  public requestTurn(botId: BotId, immediate: boolean = false): boolean {
    if (!this.isInitialized) {
      console.error('Turn-taking service not initialized');
      return false;
    }
    
    // Auto-register if not already a participant
    if (!this.state.participants.has(botId)) {
      this.registerParticipant(botId);
    }
    
    // Reset the participant timeout
    this.resetParticipantTimeout(botId);

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

    // Otherwise add to queue if not already in queue and queue isn't full
    if (!this.state.queue.includes(botId) && this.state.queue.length < this.options.maxQueueSize) {
      // Calculate position based on priority
      const position = this.calculateQueuePosition(botId);
      
      // Insert at calculated position
      if (position === 0) {
        this.state.queue.unshift(botId);
      } else if (position >= this.state.queue.length) {
        this.state.queue.push(botId);
      } else {
        this.state.queue.splice(position, 0, botId);
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

    // Reset the participant timeout
    this.resetParticipantTimeout('user');

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

    // Otherwise add to queue if not already in queue and queue isn't full
    if (!this.state.queue.includes('user') && this.state.queue.length < this.options.maxQueueSize) {
      // Calculate position based on priority
      const position = this.calculateQueuePosition('user');
      
      // Insert at calculated position
      if (position === 0) {
        this.state.queue.unshift('user');
      } else if (position >= this.state.queue.length) {
        this.state.queue.push('user');
      } else {
        this.state.queue.splice(position, 0, 'user');
      }
      
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
    
    // Update speaking history
    const lastEntry = this.state.speakingHistory.find(entry => 
      entry.speaker === currentSpeaker && !entry.endTime
    );
    
    if (lastEntry) {
      lastEntry.endTime = Date.now();
    }
    
    // Reset state
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
    
    // Update consecutive turn count
    if (this.consecutiveTurnCount.has(currentSpeaker)) {
      const currentCount = this.consecutiveTurnCount.get(currentSpeaker) || 0;
      this.consecutiveTurnCount.set(currentSpeaker, currentCount + 1);
      
      // Reset other participants' counts
      for (const participant of Array.from(this.state.participants)) {
        if (participant !== currentSpeaker) {
          this.consecutiveTurnCount.set(participant, 0);
        }
      }
    }
    
    // Update dynamic priority if enabled
    if (this.options.dynamicPriorityEnabled) {
      this.updateDynamicPriority(currentSpeaker);
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
      // Reset timeout when activity detected
      this.resetParticipantTimeout('user');
      
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
      // Apply fairness check
      if (this.options.fairnessEnabled) {
        const nextCandidates = [...this.state.queue];
        let nextSpeaker: BotId | 'user' | undefined;
        
        // Find first speaker that hasn't exceeded max consecutive turns
        for (const candidate of nextCandidates) {
          const turnCount = this.consecutiveTurnCount.get(candidate) || 0;
          if (turnCount < this.options.maxConsecutiveTurns) {
            nextSpeaker = candidate;
            break;
          }
        }
        
        // If all have exceeded, take the first one
        if (!nextSpeaker && nextCandidates.length > 0) {
          nextSpeaker = nextCandidates[0];
        }
        
        if (nextSpeaker) {
          // Remove from queue
          this.state.queue = this.state.queue.filter(id => id !== nextSpeaker);
          this.emit('queue:updated', this.state.queue);
          this.grantTurn(nextSpeaker);
        }
      } else {
        // Simple FIFO queue
        const nextSpeaker = this.state.queue.shift()!;
        this.emit('queue:updated', this.state.queue);
        this.grantTurn(nextSpeaker);
      }
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
    
    // Add to speaking history
    this.state.speakingHistory.push({
      speaker,
      startTime: Date.now()
    });
    
    // Limit history size to prevent memory issues
    if (this.state.speakingHistory.length > 100) {
      this.state.speakingHistory = this.state.speakingHistory.slice(-50);
    }
    
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
    
    // Check dynamic priority if enabled
    if (this.options.dynamicPriorityEnabled) {
      const speakerScore = this.dynamicPriorityScores.get(speaker) || 1.0;
      const currentScore = this.dynamicPriorityScores.get(this.state.currentSpeaker) || 1.0;
      
      // If speaker has significantly higher priority
      if (speakerScore > currentScore * 1.5) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Interrupt the current speaker
   */
  private interruptCurrentSpeaker(): void {
    if (!this.state.currentSpeaker) return;
    
    const interrupted = this.state.currentSpeaker;
    
    // Track interruption attempt
    const attempts = this.state.interruptionAttempts.get(interrupted) || 0;
    this.state.interruptionAttempts.set(interrupted, attempts + 1);
    
    // Complete the current speaking history entry
    const lastEntry = this.state.speakingHistory.find(entry => 
      entry.speaker === interrupted && !entry.endTime
    );
    
    if (lastEntry) {
      lastEntry.endTime = Date.now();
    }
    
    // Emit interruption event
    this.emit('turn:interrupted', interrupted);
    
    // End the current turn
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
  }

  /**
   * Calculate the position in queue based on priority
   */
  private calculateQueuePosition(speaker: BotId | 'user'): number {
    // User always goes to front of queue
    if (speaker === 'user') {
      return 0;
    }
    
    // Priority bots go right after user
    if (this.options.priorityBots.includes(speaker as BotId)) {
      // Find position after user but before non-priority bots
      let position = 0;
      for (const queuedId of this.state.queue) {
        if (queuedId === 'user') {
          position++;
        } else if (!this.options.priorityBots.includes(queuedId as BotId)) {
          break;
        } else {
          position++;
        }
      }
      return position;
    }
    
    // Dynamic priority if enabled
    if (this.options.dynamicPriorityEnabled) {
      const speakerScore = this.dynamicPriorityScores.get(speaker) || 1.0;
      
      // Find position based on dynamic priority
      let position = 0;
      for (const queuedId of this.state.queue) {
        const queuedScore = this.dynamicPriorityScores.get(queuedId) || 1.0;
        
        if (queuedId === 'user' || 
            this.options.priorityBots.includes(queuedId as BotId) || 
            queuedScore >= speakerScore) {
          position++;
        } else {
          break;
        }
      }
      return position;
    }
    
    // Default to end of queue
    return this.state.queue.length;
  }
  
  /**
   * Update dynamic priority for a participant
   */
  private updateDynamicPriority(participant: BotId | 'user'): void {
    // Get current score
    let score = this.dynamicPriorityScores.get(participant) || 1.0;
    
    // Decrease score of speaker (they've had their turn)
    score = Math.max(0.3, score * 0.8);
    this.dynamicPriorityScores.set(participant, score);
    
    // Increase score of others who've been waiting
    for (const otherParticipant of Array.from(this.state.participants)) {
      if (otherParticipant !== participant) {
        let otherScore = this.dynamicPriorityScores.get(otherParticipant) || 1.0;
        otherScore = Math.min(2.0, otherScore * 1.2);
        this.dynamicPriorityScores.set(otherParticipant, otherScore);
      }
    }
  }
  
  /**
   * Reset the participant timeout
   */
  private resetParticipantTimeout(participant: BotId | 'user'): void {
    // Clear existing timeout
    if (this.participantTimeouts.has(participant)) {
      clearTimeout(this.participantTimeouts.get(participant)!);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      // Remove inactive participant
      this.removeParticipant(participant);
    }, this.options.participantTimeout);
    
    this.participantTimeouts.set(participant, timeout);
  }
  
  /**
   * Get statistics about the conversation
   */
  public getConversationStats(): {
    participantCount: number;
    queueLength: number;
    speakingTimes: Record<string, number>;
    interruptionCount: Record<string, number>;
  } {
    const speakingTimes: Record<string, number> = {};
    const interruptionCount: Record<string, number> = {};
    
    // Calculate total speaking time per participant
    for (const entry of this.state.speakingHistory) {
      const speaker = entry.speaker;
      const duration = (entry.endTime || Date.now()) - entry.startTime;
      
      if (!speakingTimes[speaker]) {
        speakingTimes[speaker] = 0;
      }
      
      speakingTimes[speaker] += duration;
    }
    
    // Get interruption counts
    for (const [participant, count] of Array.from(this.state.interruptionAttempts.entries())) {
      interruptionCount[participant] = count;
    }
    
    return {
      participantCount: this.state.participants.size,
      queueLength: this.state.queue.length,
      speakingTimes,
      interruptionCount
    };
  }
}

// Create a singleton instance
const turnTakingService = new TurnTakingService();
export default turnTakingService; 