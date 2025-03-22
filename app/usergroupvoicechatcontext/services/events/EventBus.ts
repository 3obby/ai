/**
 * EventBus
 * 
 * A centralized event bus system for the application.
 * Provides type-safe event subscription and publishing.
 */

type EventCallback<T = any> = (data: T) => void;

export interface EventMap {
  // System events
  'system:initialized': void;
  'system:error': Error;
  'system:ready': { timestamp: number };
  'system:config': { config: Record<string, any> };
  
  // Audio events
  'audio:level': { level: number; timestamp: number };
  'audio:started': { timestamp: number };
  'audio:stopped': { timestamp: number };
  'audio:error': { error: Error; context?: string };
  'audio:device:changed': { deviceId: string; kind: 'audioinput' | 'audiooutput' };
  
  // Voice activity events
  'voice:activity': { 
    isSpeaking: boolean; 
    level: number; 
    timestamp: number;
    duration?: number;
  };
  'voice:started': { timestamp: number };
  'voice:stopped': { timestamp: number; duration: number };
  'voice:silence': { duration: number; timestamp: number };
  
  // Transcription events
  'transcription:interim': { text: string; timestamp: number; confidence?: number };
  'transcription:final': { text: string; timestamp: number; confidence?: number };
  'transcription:error': { error: Error };
  'transcription:processed': { original: string; processed: string; timestamp: number };
  
  // Voice mode events
  'voicemode:changed': { 
    active: boolean; 
    timestamp: number;
    previousState?: string;
    currentState: string;
  };
  'voicemode:initializing': { timestamp: number };
  'voicemode:ready': { timestamp: number };
  'voicemode:error': { error: Error; context?: string };
  'voicemode:transition:started': { from: string; to: string; timestamp: number };
  'voicemode:transition:completed': { from: string; to: string; timestamp: number; duration: number };
  
  // Bot events
  'bot:created': { id: string; isGhost: boolean };
  'bot:removed': { id: string; isGhost: boolean };
  'bot:updated': { id: string; changes: Record<string, any> };
  'bot:typing': { id: string; isTyping: boolean };
  'bot:disable': { botId: string };
  'bot:response': { 
    id: string; 
    content: string;
    timestamp: number;
    isGhost: boolean;
    metadata?: Record<string, any>;
  };
  'bot:processing:started': { id: string; timestamp: number };
  'bot:processing:completed': { id: string; duration: number; timestamp: number };
  
  // Message events
  'message:added': { 
    id: string; 
    content: string; 
    sender: string;
    timestamp: number;
    type: string;
  };
  'message:updated': { 
    id: string; 
    changes: Record<string, any> 
  };
  'message:processing:started': { id: string; timestamp: number };
  'message:processing:completed': { id: string; duration: number; timestamp: number };
  
  // Tool events
  'tool:called': { 
    name: string; 
    parameters: Record<string, any>;
    timestamp: number;
  };
  'tool:result': { 
    name: string; 
    result: any; 
    error?: Error;
    timestamp: number;
  };
  'tool:confirmation': {
    name: string;
    parameters: Record<string, any>;
    confirmed: boolean;
    timestamp: number;
  };
  
  // State events
  'state:changed': {
    key: string;
    prevValue: any;
    newValue: any;
    timestamp: number;
  };
  
  // Connection events
  'connection:established': { timestamp: number; connectionId: string };
  'connection:closed': { timestamp: number; connectionId: string; reason?: string };
  'connection:error': { error: Error; connectionId?: string };
  
  // Custom events (can be extended by components)
  [key: `custom:${string}`]: any;
}

export interface EventFilter<T = any> {
  property: keyof T;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith';
}

export interface EventOptions {
  /** Whether to log this event in development mode */
  debug?: boolean;
  /** A set of filters to apply to the event data */
  filters?: EventFilter[];
  /** A custom event category for grouping and debugging */
  category?: string;
}

type EventSubscription = {
  callback: EventCallback;
  filters?: EventFilter[];
  options?: EventOptions;
};

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventSubscription>> = new Map();
  private eventHistory: Map<string, any[]> = new Map();
  private historyLimit: number = 100;
  private enableHistory: boolean = true;
  private debugEnabled: boolean = process.env.NODE_ENV === 'development';
  private eventCategories: Map<string, Set<string>> = new Map();
  
  private constructor() {
    // Private constructor to enforce singleton
  }
  
  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * Subscribe to an event
   */
  public on<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>,
    options?: EventOptions
  ): () => void {
    const eventName = event as string;
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    const subscription: EventSubscription = {
      callback,
      filters: options?.filters,
      options
    };
    
    this.listeners.get(eventName)!.add(subscription);
    
    // Add to event category if specified
    if (options?.category) {
      if (!this.eventCategories.has(options.category)) {
        this.eventCategories.set(options.category, new Set());
      }
      this.eventCategories.get(options.category)!.add(eventName);
    }
    
    // Return a function to remove the listener
    return () => this.off(event, callback);
  }
  
  /**
   * Unsubscribe from an event
   */
  public off<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): void {
    const eventName = event as string;
    const eventListeners = this.listeners.get(eventName);
    
    if (eventListeners) {
      // Find and remove the specific callback
      eventListeners.forEach(subscription => {
        if (subscription.callback === callback) {
          eventListeners.delete(subscription);
        }
      });
      
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
        
        // Clean up category references
        this.eventCategories.forEach((events, category) => {
          if (events.has(eventName)) {
            events.delete(eventName);
            if (events.size === 0) {
              this.eventCategories.delete(category);
            }
          }
        });
      }
    }
  }
  
  /**
   * Check if data passes all filters
   */
  private passesFilters(data: any, filters?: EventFilter[]): boolean {
    if (!filters || filters.length === 0) return true;
    
    return filters.every(filter => {
      const value = data[filter.property];
      const compareValue = filter.value;
      
      switch (filter.operator || 'eq') {
        case 'eq':
          return value === compareValue;
        case 'neq':
          return value !== compareValue;
        case 'gt':
          return value > compareValue;
        case 'lt':
          return value < compareValue;
        case 'contains':
          return typeof value === 'string' && value.includes(compareValue);
        case 'startsWith':
          return typeof value === 'string' && value.startsWith(compareValue);
        case 'endsWith':
          return typeof value === 'string' && value.endsWith(compareValue);
        default:
          return value === compareValue;
      }
    });
  }
  
  /**
   * Publish an event with data
   */
  public emit<K extends keyof EventMap>(
    event: K, 
    data: EventMap[K], 
    options?: EventOptions
  ): void {
    const eventName = event as string;
    const eventListeners = this.listeners.get(eventName);
    
    // Add to history if enabled
    if (this.enableHistory) {
      this.addToHistory(eventName, data);
    }
    
    // Debug output if enabled
    const shouldDebug = this.debugEnabled && (options?.debug !== false);
    if (shouldDebug) {
      this.debugEvent(eventName, data, eventListeners?.size || 0);
    }
    
    if (eventListeners) {
      // Call all listeners with the data
      eventListeners.forEach(subscription => {
        // Apply filters if any
        if (this.passesFilters(data, subscription.filters)) {
          try {
            subscription.callback(data);
          } catch (error) {
            console.error(`Error in event listener for ${eventName}:`, error);
            // Don't let one listener's error stop other listeners
          }
        }
      });
    }
  }
  
  /**
   * Add event to history
   */
  private addToHistory(eventName: string, data: any): void {
    if (!this.eventHistory.has(eventName)) {
      this.eventHistory.set(eventName, []);
    }
    
    const events = this.eventHistory.get(eventName)!;
    events.push({
      data,
      timestamp: Date.now()
    });
    
    // Trim history if it exceeds the limit
    if (events.length > this.historyLimit) {
      events.shift();
    }
  }
  
  /**
   * Debug an event
   */
  private debugEvent(eventName: string, data: any, listenerCount: number): void {
    const parts = eventName.split(':');
    const category = parts[0];
    const type = parts.slice(1).join(':');
    
    const styles = {
      audio: 'background: #3498db; color: white; padding: 2px 4px; border-radius: 2px;',
      voice: 'background: #9b59b6; color: white; padding: 2px 4px; border-radius: 2px;',
      transcription: 'background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;',
      voicemode: 'background: #e74c3c; color: white; padding: 2px 4px; border-radius: 2px;',
      bot: 'background: #f39c12; color: white; padding: 2px 4px; border-radius: 2px;',
      message: 'background: #1abc9c; color: white; padding: 2px 4px; border-radius: 2px;',
      tool: 'background: #34495e; color: white; padding: 2px 4px; border-radius: 2px;',
      system: 'background: #95a5a6; color: white; padding: 2px 4px; border-radius: 2px;',
      connection: 'background: #d35400; color: white; padding: 2px 4px; border-radius: 2px;',
      state: 'background: #16a085; color: white; padding: 2px 4px; border-radius: 2px;',
      custom: 'background: #7f8c8d; color: white; padding: 2px 4px; border-radius: 2px;',
    };
    
    const categoryStyle = styles[category as keyof typeof styles] || styles.custom;
    
    console.groupCollapsed(
      `%c${category}%c ${type} %c(${listenerCount} ${listenerCount === 1 ? 'listener' : 'listeners'})`,
      categoryStyle,
      'color: inherit; font-weight: bold;',
      'color: #7f8c8d; font-style: italic;'
    );
    console.log('Data:', data);
    console.log('Time:', new Date().toISOString());
    console.groupEnd();
  }
  
  /**
   * Subscribe to an event once
   */
  public once<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>,
    options?: EventOptions
  ): () => void {
    const eventName = event as string;
    
    // Create a wrapper that will call the callback and then remove itself
    const wrapper: EventCallback = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    
    // Add the wrapper as a listener
    return this.on(event, wrapper, options);
  }
  
  /**
   * Clear all listeners for an event
   */
  public clearEvent<K extends keyof EventMap>(event: K): void {
    const eventName = event as string;
    this.listeners.delete(eventName);
    
    // Clean up category references
    this.eventCategories.forEach((events, category) => {
      if (events.has(eventName)) {
        events.delete(eventName);
        if (events.size === 0) {
          this.eventCategories.delete(category);
        }
      }
    });
  }
  
  /**
   * Clear all listeners
   */
  public clearAll(): void {
    this.listeners.clear();
    this.eventCategories.clear();
  }
  
  /**
   * Clear all events in a category
   */
  public clearCategory(category: string): void {
    const events = this.eventCategories.get(category);
    if (events) {
      events.forEach(eventName => {
        this.listeners.delete(eventName);
      });
      this.eventCategories.delete(category);
    }
  }
  
  /**
   * Get the number of listeners for an event
   */
  public listenerCount<K extends keyof EventMap>(event: K): number {
    const eventName = event as string;
    const eventListeners = this.listeners.get(eventName);
    return eventListeners ? eventListeners.size : 0;
  }
  
  /**
   * Check if an event has listeners
   */
  public hasListeners<K extends keyof EventMap>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
  
  /**
   * Get all registered event names
   */
  public getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
  
  /**
   * Get event history
   */
  public getHistory<K extends keyof EventMap>(event: K, limit?: number): any[] {
    const eventName = event as string;
    const history = this.eventHistory.get(eventName) || [];
    
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    
    return [...history];
  }
  
  /**
   * Clear event history
   */
  public clearHistory<K extends keyof EventMap>(event?: K): void {
    if (event) {
      const eventName = event as string;
      this.eventHistory.delete(eventName);
    } else {
      this.eventHistory.clear();
    }
  }
  
  /**
   * Configure event history
   */
  public configureHistory(options: { enable?: boolean; limit?: number }): void {
    if (options.enable !== undefined) {
      this.enableHistory = options.enable;
    }
    
    if (options.limit !== undefined && options.limit > 0) {
      this.historyLimit = options.limit;
    }
  }
  
  /**
   * Subscribe to multiple events at once
   */
  public onMany(
    events: (keyof EventMap)[],
    callback: (eventName: string, data: any) => void,
    options?: EventOptions
  ): () => void {
    const unsubscribers: (() => void)[] = [];
    
    events.forEach(event => {
      const unsubscribe = this.on(
        event,
        (data) => callback(event as string, data),
        options
      );
      unsubscribers.push(unsubscribe);
    });
    
    // Return a function that unsubscribes from all events
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  /**
   * Subscribe to all events in a category
   */
  public onCategory(
    category: string,
    callback: (eventName: string, data: any) => void,
    options?: EventOptions
  ): () => void {
    // Store the current events in this category
    const currentEvents = Array.from(this.eventCategories.get(category) || []);
    
    return this.onMany(
      currentEvents as (keyof EventMap)[],
      callback,
      { ...options, category }
    );
  }
}

// Export singleton instance
const eventBus = EventBus.getInstance();
export default eventBus; 