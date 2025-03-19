import { EventEmitter } from 'events';
import turnTakingService from '../livekit/turn-taking-service';
import voiceActivityService, { VoiceActivityState } from '../livekit/voice-activity-service';
import { BotId } from '../../types';

/**
 * Interface for voice interaction analytics data
 */
export interface VoiceAnalyticsData {
  // Session-level metrics
  sessionStartTime: number;
  sessionDuration: number;
  totalInteractions: number;
  
  // Turn-taking metrics
  turnDurations: Record<string, number[]>;
  averageTurnDuration: Record<string, number>;
  turnCounts: Record<string, number>;
  interruptionCounts: Record<string, number>;
  
  // User metrics
  userSpeakingTime: number;
  userInterruptions: number;
  userSilenceTime: number;
  userSpeechToSilenceRatio: number;
  
  // Voice activity metrics
  voiceActivityLevels: number[];
  averageVoiceLevel: number;
  peakVoiceLevel: number;
  
  // Response metrics
  botResponseTimes: Record<string, number[]>;
  averageBotResponseTime: Record<string, number>;
  
  // Feature usage
  voiceToolUsageCount: number;
  textToolUsageCount: number;
}

/**
 * Options for the VoiceAnalyticsService
 */
export interface VoiceAnalyticsOptions {
  sampleRateMs: number;
  maxSampleHistory: number;
  emitFrequencyMs: number;
  enableHeatmapGeneration: boolean;
  storageKey: string;
}

/**
 * Service for analyzing voice interactions and collecting usage patterns
 */
export class VoiceAnalyticsService extends EventEmitter {
  private options: VoiceAnalyticsOptions = {
    sampleRateMs: 1000, // 1 second sample rate
    maxSampleHistory: 3600, // 1 hour of samples at 1/sec
    emitFrequencyMs: 10000, // emit analytics updates every 10 seconds
    enableHeatmapGeneration: true,
    storageKey: 'voice-analytics-data'
  };
  
  private data: VoiceAnalyticsData = {
    sessionStartTime: Date.now(),
    sessionDuration: 0,
    totalInteractions: 0,
    
    turnDurations: {},
    averageTurnDuration: {},
    turnCounts: {},
    interruptionCounts: {},
    
    userSpeakingTime: 0,
    userInterruptions: 0,
    userSilenceTime: 0,
    userSpeechToSilenceRatio: 0,
    
    voiceActivityLevels: [],
    averageVoiceLevel: 0,
    peakVoiceLevel: 0,
    
    botResponseTimes: {},
    averageBotResponseTime: {},
    
    voiceToolUsageCount: 0,
    textToolUsageCount: 0
  };
  
  private currentSpeaker: BotId | 'user' | null = null;
  private speakerStartTime: number = 0;
  private lastUserEndTime: number = 0;
  private isInitialized: boolean = false;
  private sampleInterval: NodeJS.Timeout | null = null;
  private emitInterval: NodeJS.Timeout | null = null;
  private voiceLevelSamples: number[] = [];
  private botResponses: Map<BotId, { requestTime: number, responseTime: number | null }[]> = new Map();
  
  constructor() {
    super();
  }
  
  /**
   * Initialize the voice analytics service
   */
  public initialize(options?: Partial<VoiceAnalyticsOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Set up event listeners
    turnTakingService.on('turn:started', this.handleTurnStarted);
    turnTakingService.on('turn:ended', this.handleTurnEnded);
    turnTakingService.on('turn:interrupted', this.handleTurnInterrupted);
    voiceActivityService.onVoiceActivity(this.handleVoiceActivity);
    
    // Start the sampling interval
    this.startSampling();
    
    // Try to load previous analytics data
    this.loadData();
    
    this.isInitialized = true;
    console.log('Voice analytics service initialized with options:', this.options);
  }
  
  /**
   * Start the periodic sampling
   */
  private startSampling(): void {
    // Clear any existing intervals
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
    }
    
    if (this.emitInterval) {
      clearInterval(this.emitInterval);
    }
    
    // Set up the sampling interval
    this.sampleInterval = setInterval(() => {
      this.sampleData();
    }, this.options.sampleRateMs);
    
    // Set up the emit interval
    this.emitInterval = setInterval(() => {
      this.updateAggregates();
      this.emit('analytics:updated', this.data);
      this.saveData();
    }, this.options.emitFrequencyMs);
  }
  
  /**
   * Sample the current state
   */
  private sampleData(): void {
    // Update session duration
    this.data.sessionDuration = Date.now() - this.data.sessionStartTime;
    
    // Sample current voice level
    const currentState = voiceActivityService.getState();
    this.voiceLevelSamples.push(currentState.level);
    
    // Keep voice level samples at reasonable size
    if (this.voiceLevelSamples.length > this.options.maxSampleHistory) {
      this.voiceLevelSamples = this.voiceLevelSamples.slice(-this.options.maxSampleHistory);
    }
    
    // Capture user silence time
    if (!currentState.isSpeaking && this.currentSpeaker !== 'user') {
      if (this.lastUserEndTime > 0) {
        this.data.userSilenceTime += this.options.sampleRateMs;
      }
    }
  }
  
  /**
   * Update the aggregate metrics
   */
  private updateAggregates(): void {
    // Update voice activity aggregates
    const sum = this.voiceLevelSamples.reduce((acc: number, val: number) => acc + val, 0);
    this.data.averageVoiceLevel = this.voiceLevelSamples.length > 0 ? sum / this.voiceLevelSamples.length : 0;
    this.data.peakVoiceLevel = Math.max(...this.voiceLevelSamples, 0);
    this.data.voiceActivityLevels = [...this.voiceLevelSamples];
    
    // Calculate average turn durations
    for (const [speaker, durations] of Object.entries(this.data.turnDurations)) {
      const sum = durations.reduce((acc: number, val: number) => acc + val, 0);
      this.data.averageTurnDuration[speaker] = durations.length > 0 ? sum / durations.length : 0;
    }
    
    // Calculate speech to silence ratio
    const totalTime = this.data.userSpeakingTime + this.data.userSilenceTime;
    this.data.userSpeechToSilenceRatio = totalTime > 0 ? this.data.userSpeakingTime / totalTime : 0;
    
    // Calculate average bot response times
    for (const [botId, responses] of Array.from(this.botResponses.entries())) {
      const responseTimes = responses
        .filter((r: { requestTime: number, responseTime: number | null }) => r.responseTime !== null)
        .map((r: { requestTime: number, responseTime: number | null }) => (r.responseTime as number) - r.requestTime);
      
      if (!this.data.botResponseTimes[botId]) {
        this.data.botResponseTimes[botId] = [];
      }
      
      this.data.botResponseTimes[botId] = responseTimes;
      
      const sum = responseTimes.reduce((acc: number, val: number) => acc + val, 0);
      this.data.averageBotResponseTime[botId] = responseTimes.length > 0 ? sum / responseTimes.length : 0;
    }
  }
  
  /**
   * Handle turn started event
   */
  private handleTurnStarted = (speaker: BotId | 'user'): void => {
    this.currentSpeaker = speaker;
    this.speakerStartTime = Date.now();
    this.data.totalInteractions++;
    
    // Initialize speaker records if needed
    if (!this.data.turnCounts[speaker]) {
      this.data.turnCounts[speaker] = 0;
      this.data.interruptionCounts[speaker] = 0;
      this.data.turnDurations[speaker] = [];
    }
    
    // Increment turn count
    this.data.turnCounts[speaker]++;
    
    // Track bot response time
    if (speaker !== 'user' && this.lastUserEndTime > 0) {
      if (!this.botResponses.has(speaker)) {
        this.botResponses.set(speaker, []);
      }
      
      this.botResponses.get(speaker)?.push({
        requestTime: this.lastUserEndTime,
        responseTime: Date.now()
      });
    }
  };
  
  /**
   * Handle turn ended event
   */
  private handleTurnEnded = (speaker: BotId | 'user'): void => {
    if (this.currentSpeaker !== speaker) return;
    
    const turnDuration = Date.now() - this.speakerStartTime;
    
    // Record turn duration
    if (!this.data.turnDurations[speaker]) {
      this.data.turnDurations[speaker] = [];
    }
    
    this.data.turnDurations[speaker].push(turnDuration);
    
    // Keep turn durations at reasonable size
    if (this.data.turnDurations[speaker].length > 100) {
      this.data.turnDurations[speaker] = this.data.turnDurations[speaker].slice(-50);
    }
    
    // Update user-specific metrics
    if (speaker === 'user') {
      this.data.userSpeakingTime += turnDuration;
      this.lastUserEndTime = Date.now();
    }
    
    this.currentSpeaker = null;
  };
  
  /**
   * Handle turn interrupted event
   */
  private handleTurnInterrupted = (speaker: BotId | 'user'): void => {
    if (!this.data.interruptionCounts[speaker]) {
      this.data.interruptionCounts[speaker] = 0;
    }
    
    this.data.interruptionCounts[speaker]++;
    
    if (speaker === 'user') {
      this.data.userInterruptions++;
    }
    
    // Handle the turn end logic as well
    this.handleTurnEnded(speaker);
  };
  
  /**
   * Handle voice activity
   */
  private handleVoiceActivity = (state: VoiceActivityState): void => {
    // Nothing specific to do here as we're sampling in intervals
    // but we could add more detailed analysis based on state transitions
  };
  
  /**
   * Track tool usage
   */
  public trackToolUsage(toolName: string, isVoiceInitiated: boolean): void {
    if (isVoiceInitiated) {
      this.data.voiceToolUsageCount++;
    } else {
      this.data.textToolUsageCount++;
    }
    
    this.emit('tool:used', { toolName, isVoiceInitiated });
  }
  
  /**
   * Get the current analytics data
   */
  public getAnalyticsData(): VoiceAnalyticsData {
    this.updateAggregates();
    return { ...this.data };
  }
  
  /**
   * Generate a heatmap of voice interaction
   */
  public generateInteractionHeatmap(): Record<string, number> {
    if (!this.options.enableHeatmapGeneration) {
      return {};
    }
    
    const heatmap: Record<string, number> = {};
    const now = Date.now();
    const hourInMs = 3600000;
    
    // Create 24 hour buckets
    for (let hour = 0; hour < 24; hour++) {
      heatmap[hour.toString()] = 0;
    }
    
    // Map each interaction to an hour bucket
    for (const speaker of Object.keys(this.data.turnCounts)) {
      const count = this.data.turnCounts[speaker];
      
      // Distribute the counts across the 24-hour buckets
      // This is simplified for now - in a real implementation, we'd track the actual times
      const hourOfDay = new Date().getHours();
      heatmap[hourOfDay.toString()] += count;
    }
    
    return heatmap;
  }
  
  /**
   * Save analytics data to localStorage
   */
  private saveData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.options.storageKey, JSON.stringify(this.data));
      }
    } catch (error) {
      console.error('Failed to save voice analytics data:', error);
    }
  }
  
  /**
   * Load analytics data from localStorage
   */
  private loadData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedData = localStorage.getItem(this.options.storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData) as Partial<VoiceAnalyticsData>;
          
          // Merge with current data, preserving session-specific values
          const sessionStartTime = this.data.sessionStartTime;
          
          this.data = {
            ...this.data,
            ...parsedData,
            sessionStartTime, // Keep current session start time
            sessionDuration: 0, // Reset for new session
          };
        }
      }
    } catch (error) {
      console.error('Failed to load voice analytics data:', error);
    }
  }
  
  /**
   * Reset all analytics data
   */
  public resetData(): void {
    this.data = {
      sessionStartTime: Date.now(),
      sessionDuration: 0,
      totalInteractions: 0,
      
      turnDurations: {},
      averageTurnDuration: {},
      turnCounts: {},
      interruptionCounts: {},
      
      userSpeakingTime: 0,
      userInterruptions: 0,
      userSilenceTime: 0,
      userSpeechToSilenceRatio: 0,
      
      voiceActivityLevels: [],
      averageVoiceLevel: 0,
      peakVoiceLevel: 0,
      
      botResponseTimes: {},
      averageBotResponseTime: {},
      
      voiceToolUsageCount: 0,
      textToolUsageCount: 0
    };
    
    this.voiceLevelSamples = [];
    this.botResponses.clear();
    this.saveData();
    this.emit('analytics:reset');
  }
  
  /**
   * Dispose of the service
   */
  public dispose(): void {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
    
    if (this.emitInterval) {
      clearInterval(this.emitInterval);
      this.emitInterval = null;
    }
    
    // Save data before disposing
    this.saveData();
    
    // Remove event listeners
    turnTakingService.off('turn:started', this.handleTurnStarted);
    turnTakingService.off('turn:ended', this.handleTurnEnded);
    turnTakingService.off('turn:interrupted', this.handleTurnInterrupted);
    voiceActivityService.offVoiceActivity(this.handleVoiceActivity);
    
    this.isInitialized = false;
  }
}

// Create a singleton instance
const voiceAnalyticsService = new VoiceAnalyticsService();
export default voiceAnalyticsService; 