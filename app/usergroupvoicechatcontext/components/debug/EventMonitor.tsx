'use client';

import React, { useState, useEffect, useRef } from 'react';
import eventBus, { EventMap } from '../../services/events/EventBus';
import useEventBus from '../../hooks/useEventBus';

interface EventLog {
  id: string;
  name: string;
  data: any;
  timestamp: number;
  category: string;
}

interface EventMonitorProps {
  maxEvents?: number;
  categories?: string[];
  showFilters?: boolean;
  autoScroll?: boolean;
}

export default function EventMonitor({
  maxEvents = 100,
  categories,
  showFilters = true,
  autoScroll = true,
}: EventMonitorProps) {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const eventListRef = useRef<HTMLDivElement>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  // Subscribe to all events
  useEffect(() => {
    const handler = (eventName: string, data: any) => {
      if (isPaused) return;
      
      const category = eventName.split(':')[0];
      
      if (categories && !categories.includes(category)) return;
      
      setEvents(prev => {
        const newEvents = [...prev, {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: eventName,
          data,
          timestamp: Date.now(),
          category
        }];
        
        // Limit number of events
        if (newEvents.length > maxEvents) {
          return newEvents.slice(-maxEvents);
        }
        
        return newEvents;
      });
    };
    
    // Create a wrapper to handle all events
    const allEvents = eventBus.getEventNames();
    const unsubscribe = eventBus.onMany(
      allEvents as (keyof EventMap)[],
      handler
    );
    
    // Extract available categories from event names
    const categorySet = new Set<string>();
    allEvents.forEach(name => {
      const category = name.split(':')[0];
      categorySet.add(category);
    });
    setAvailableCategories(Array.from(categorySet));
    
    return unsubscribe;
  }, [maxEvents, isPaused, categories]);
  
  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && eventListRef.current && !isPaused) {
      eventListRef.current.scrollTop = eventListRef.current.scrollHeight;
    }
  }, [events, autoScroll, isPaused]);
  
  // Filter events
  const filteredEvents = events.filter(event => {
    let matchesFilter = true;
    
    // Filter by text
    if (filterText) {
      matchesFilter = event.name.toLowerCase().includes(filterText.toLowerCase()) ||
        JSON.stringify(event.data).toLowerCase().includes(filterText.toLowerCase());
    }
    
    // Filter by category
    if (selectedCategory && event.category !== selectedCategory) {
      matchesFilter = false;
    }
    
    return matchesFilter;
  });
  
  // Toggle event expansion
  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Clear all events
  const clearEvents = () => {
    setEvents([]);
  };
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour12: false }) + '.' + 
      date.getMilliseconds().toString().padStart(3, '0');
  };
  
  // Get style for category
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, React.CSSProperties> = {
      audio: { backgroundColor: '#3498db' },
      voice: { backgroundColor: '#9b59b6' },
      transcription: { backgroundColor: '#2ecc71' },
      voicemode: { backgroundColor: '#e74c3c' },
      bot: { backgroundColor: '#f39c12' },
      message: { backgroundColor: '#1abc9c' },
      tool: { backgroundColor: '#34495e' },
      system: { backgroundColor: '#95a5a6' },
      connection: { backgroundColor: '#d35400' },
      state: { backgroundColor: '#16a085' },
      custom: { backgroundColor: '#7f8c8d' },
    };
    
    return styles[category] || styles.custom;
  };
  
  return (
    <div className="rounded border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
      <div className="p-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Event Monitor</h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-1 text-xs rounded ${
              isPaused
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <button
            onClick={clearEvents}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
          >
            Clear
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filter events..."
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 flex-grow"
          />
          
          <select
            value={selectedCategory || ''}
            onChange={e => setSelectedCategory(e.target.value || null)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
          >
            <option value="">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div
        ref={eventListRef}
        className="overflow-y-auto max-h-[400px] p-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredEvents.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No events to display
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="p-2 rounded bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-700 text-xs"
              >
                <div
                  className="flex items-start cursor-pointer"
                  onClick={() => toggleExpand(event.id)}
                >
                  <span className="shrink-0 w-14 text-gray-500 dark:text-gray-400">
                    {formatTime(event.timestamp)}
                  </span>
                  
                  <div
                    className="shrink-0 px-1.5 py-0.5 rounded text-white mr-2 text-[10px] uppercase"
                    style={getCategoryStyle(event.category)}
                  >
                    {event.category}
                  </div>
                  
                  <div className="font-mono">
                    {event.name.split(':').slice(1).join(':')}
                  </div>
                  
                  <div className="ml-auto">
                    {expandedEvents[event.id] ? '▼' : '▶'}
                  </div>
                </div>
                
                {expandedEvents[event.id] && (
                  <div className="mt-2 pl-14 font-mono overflow-x-auto">
                    <pre className="text-[10px] p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredEvents.length} of {events.length} events
        {selectedCategory && ` (filtered by: ${selectedCategory})`}
        {filterText && ` (search: "${filterText}")`}
      </div>
    </div>
  );
} 