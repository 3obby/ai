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
  
  // Audio events
  'audio:level': { level: number; timestamp: number };
  'audio:started': { timestamp: number };
  'audio:stopped': { timestamp: number };
  'audio:error': { error: Error; context?: string };
  
  // Voice activity events
  'voice:activity': { 
    isSpeaking: boolean; 
    level: number; 
    timestamp: number;
    duration?: number;
  };
  'voice:started': { timestamp: number };
  'voice:stopped': { timestamp: number; duration: number };
  
  // Transcription events
  'transcription:interim': { text: string; timestamp: number };
  'transcription:final': { text: string; timestamp: number };
  'transcription:error': { error: Error };
  
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
  
  // Custom events (can be extended by components)
  [key: `custom:${string}`]: any;
}

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  
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
    callback: EventCallback<EventMap[K]>
  ): () => void {
    const eventName = event as string;
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    this.listeners.get(eventName)!.add(callback);
    
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
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }
  
  /**
   * Publish an event with data
   */
  public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const eventName = event as string;
    const eventListeners = this.listeners.get(eventName);
    
    if (eventListeners) {
      // Add some useful debugging info
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed(`Event: ${eventName}`);
        console.log('Data:', data);
        console.log('Listeners:', eventListeners.size);
        console.groupEnd();
      }
      
      // Call all listeners with the data
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }
  
  /**
   * Subscribe to an event once
   */
  public once<K extends keyof EventMap>(
    event: K,
    callback: EventCallback<EventMap[K]>
  ): () => void {
    const eventName = event as string;
    
    // Create a wrapper that will call the callback and then remove itself
    const wrapper: EventCallback = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    
    // Add the wrapper as a listener
    return this.on(event, wrapper);
  }
  
  /**
   * Clear all listeners for an event
   */
  public clearEvent<K extends keyof EventMap>(event: K): void {
    const eventName = event as string;
    this.listeners.delete(eventName);
  }
  
  /**
   * Clear all listeners
   */
  public clearAll(): void {
    this.listeners.clear();
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
}

// Export singleton instance
const eventBus = EventBus.getInstance();
export default eventBus; 