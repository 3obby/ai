import { ToolResult } from '../../types';
import { EventEmitter } from 'events';

interface TimerParams {
  duration: number;  // Duration in seconds
  action: 'start' | 'check' | 'cancel';
  label?: string;    // Optional label for the timer
}

interface ActiveTimer {
  id: string;
  duration: number;
  startTime: number;
  endTime: number;
  label: string;
  timeoutId?: NodeJS.Timeout;
}

/**
 * A timer tool optimized for voice interaction
 * Allows setting timers and getting notifications when they complete
 */
export class VoiceTimerTool {
  private name: string = 'voice_timer';
  private description: string = 'Set timers and get notifications when they complete';
  private activeTimers: Map<string, ActiveTimer> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  
  constructor() {
    // Increase max listeners to avoid warnings
    this.eventEmitter.setMaxListeners(20);
  }
  
  /**
   * Set, check, or cancel timers
   * @param params The timer parameters
   * @returns A formatted response about the timer action
   */
  public async execute(params: TimerParams): Promise<ToolResult> {
    try {
      const startTime = Date.now();
      
      // Set default label if not provided
      const label = params.label || 'Timer';
      
      switch (params.action) {
        case 'start':
          return await this.startTimer(params.duration, label, startTime);
        case 'check':
          return this.checkTimers(startTime);
        case 'cancel':
          return this.cancelTimer(label, startTime);
        default:
          throw new Error('Invalid action. Use "start", "check", or "cancel"');
      }
    } catch (error: any) {
      console.error(`Error executing ${this.name}:`, error);
      return {
        toolName: this.name,
        input: params,
        output: null,
        error: error.message || 'Unknown error',
        executionTime: 0
      };
    }
  }
  
  /**
   * Start a new timer
   */
  private async startTimer(duration: number, label: string, startTime: number): Promise<ToolResult> {
    if (!duration || isNaN(duration) || duration <= 0) {
      throw new Error('Duration must be a positive number of seconds');
    }
    
    // Generate a unique ID for the timer
    const id = `${label}-${Date.now()}`;
    
    // Setup timer information
    const newTimer: ActiveTimer = {
      id,
      duration,
      startTime: Date.now(),
      endTime: Date.now() + (duration * 1000),
      label
    };
    
    // Set up the timer to fire when done
    newTimer.timeoutId = setTimeout(() => {
      // Emit timer complete event
      this.eventEmitter.emit('timer:complete', newTimer);
      
      // Remove from active timers
      this.activeTimers.delete(id);
    }, duration * 1000);
    
    // Store the timer
    this.activeTimers.set(id, newTimer);
    
    // Format a nice response
    const formattedDuration = this.formatDuration(duration);
    
    return {
      toolName: this.name,
      input: { duration, label, action: 'start' },
      output: {
        message: `I've set a ${formattedDuration} timer for ${label}. I'll notify you when it's done.`,
        timer: {
          id,
          duration,
          label,
          endsAt: new Date(newTimer.endTime).toISOString()
        }
      },
      executionTime: Date.now() - startTime
    };
  }
  
  /**
   * Check all active timers
   */
  private checkTimers(startTime: number): ToolResult {
    if (this.activeTimers.size === 0) {
      return {
        toolName: this.name,
        input: { action: 'check' },
        output: {
          message: 'You don\'t have any active timers right now.',
          timers: []
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Format information about all active timers
    const timers = Array.from(this.activeTimers.values()).map(timer => {
      const remainingMs = timer.endTime - Date.now();
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      
      return {
        id: timer.id,
        label: timer.label,
        duration: timer.duration,
        remainingSeconds: remainingSecs,
        remainingFormatted: this.formatDuration(remainingSecs)
      };
    });
    
    // Sort by remaining time (ascending)
    timers.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
    
    // Create a voice-friendly response
    let message = `You have ${timers.length} active timer${timers.length > 1 ? 's' : ''}: `;
    
    message += timers.map(t => 
      `${t.label} with ${t.remainingFormatted} remaining`
    ).join(', ');
    
    return {
      toolName: this.name,
      input: { action: 'check' },
      output: {
        message,
        timers
      },
      executionTime: Date.now() - startTime
    };
  }
  
  /**
   * Cancel a specific timer or all timers
   */
  private cancelTimer(label: string, startTime: number): ToolResult {
    // If no specific label, cancel all timers
    if (!label || label.toLowerCase() === 'all') {
      const count = this.activeTimers.size;
      
      if (count === 0) {
        return {
          toolName: this.name,
          input: { action: 'cancel', label },
          output: {
            message: 'You don\'t have any active timers to cancel.',
            canceled: 0
          },
          executionTime: Date.now() - startTime
        };
      }
      
      // Cancel all timers
      this.activeTimers.forEach(timer => {
        if (timer.timeoutId) {
          clearTimeout(timer.timeoutId);
        }
      });
      
      this.activeTimers.clear();
      
      return {
        toolName: this.name,
        input: { action: 'cancel', label },
        output: {
          message: `I've canceled all ${count} active timers.`,
          canceled: count
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Cancel a specific timer by label
    const matchingTimers = Array.from(this.activeTimers.values())
      .filter(t => t.label.toLowerCase() === label.toLowerCase());
    
    if (matchingTimers.length === 0) {
      return {
        toolName: this.name,
        input: { action: 'cancel', label },
        output: {
          message: `I couldn't find any active timers labeled "${label}".`,
          canceled: 0
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Cancel all matching timers
    matchingTimers.forEach(timer => {
      if (timer.timeoutId) {
        clearTimeout(timer.timeoutId);
      }
      this.activeTimers.delete(timer.id);
    });
    
    return {
      toolName: this.name,
      input: { action: 'cancel', label },
      output: {
        message: `I've canceled ${matchingTimers.length} timer${matchingTimers.length > 1 ? 's' : ''} labeled "${label}".`,
        canceled: matchingTimers.length
      },
      executionTime: Date.now() - startTime
    };
  }
  
  /**
   * Format duration in seconds to a human-readable format
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  /**
   * Get the tool definition for registration
   */
  public getDefinition() {
    return {
      id: this.name,
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['start', 'check', 'cancel'],
            description: 'The action to perform with the timer'
          },
          duration: {
            type: 'number',
            description: 'Duration of the timer in seconds (required for "start" action)'
          },
          label: {
            type: 'string',
            description: 'Optional label for the timer (e.g., "Cookies", "Meditation")'
          }
        },
        required: ['action']
      }
    };
  }
  
  /**
   * Register a callback for when timers complete
   */
  public onTimerComplete(callback: (timer: ActiveTimer) => void): void {
    this.eventEmitter.on('timer:complete', callback);
  }
  
  /**
   * Remove a timer completion callback
   */
  public offTimerComplete(callback: (timer: ActiveTimer) => void): void {
    this.eventEmitter.off('timer:complete', callback);
  }
}

// Create a singleton instance
const voiceTimerTool = new VoiceTimerTool();
export default voiceTimerTool; 