import { useEffect, useState, useCallback, useRef } from 'react';
import eventBus, { EventMap } from '../services/events/EventBus';

/**
 * Custom hook for interacting with the EventBus
 * 
 * @param event The event to subscribe to
 * @param callback The callback to execute when the event is emitted
 * @returns An object with methods for interacting with the EventBus
 */
export function useEventBus<K extends keyof EventMap>(
  event?: K,
  callback?: (data: EventMap[K]) => void
) {
  const [eventData, setEventData] = useState<EventMap[K] | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const callbackRef = useRef(callback);

  // Update the callback ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Subscribe to the event
  useEffect(() => {
    if (!event) return;

    const handleEvent = (data: EventMap[K]) => {
      // Update state with the latest event data
      setEventData(data);
      setEventCount(prev => prev + 1);
      
      // Call the callback if provided
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    // Subscribe to the event
    const unsubscribe = eventBus.on(event, handleEvent);

    // Clean up subscription
    return unsubscribe;
  }, [event]);

  // Emit an event with data
  const emit = useCallback(<E extends keyof EventMap>(
    eventName: E,
    data: EventMap[E]
  ) => {
    eventBus.emit(eventName, data);
  }, []);

  // Subscribe to an event
  const subscribe = useCallback(<E extends keyof EventMap>(
    eventName: E,
    handler: (data: EventMap[E]) => void
  ) => {
    return eventBus.on(eventName, handler);
  }, []);

  // Subscribe to an event once
  const subscribeOnce = useCallback(<E extends keyof EventMap>(
    eventName: E,
    handler: (data: EventMap[E]) => void
  ) => {
    return eventBus.once(eventName, handler);
  }, []);

  // Get event metadata
  const getEventMetadata = useCallback(() => {
    return {
      registeredEvents: eventBus.getEventNames(),
      totalEventCount: eventBus.listenerCount(event as any) || 0,
    };
  }, [event]);

  return {
    // Event data for the subscribed event
    data: eventData,
    count: eventCount,
    
    // Methods for interacting with the EventBus
    emit,
    subscribe,
    subscribeOnce,
    
    // EventBus metadata
    getEventMetadata,
    
    // Direct access to eventBus (for advanced use cases)
    eventBus,
  };
}

export default useEventBus; 