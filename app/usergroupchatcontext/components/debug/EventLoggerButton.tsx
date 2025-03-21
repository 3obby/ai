'use client';

import React, { useState, useEffect } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { EventFilter, EventOptions } from '../../services/events/EventBus';

/**
 * EventLoggerButton 
 * 
 * A debug component that demonstrates the advanced features of our event system.
 * Shows a button that toggles a panel displaying filtered events.
 */
export default function EventLoggerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('voicemode');
  const categories = ['voicemode', 'bot', 'audio', 'transcription', 'message', 'tool'];
  
  // Create a filter for active category
  const eventFilter: EventFilter = {
    property: 'timestamp',
    value: Date.now() - 30000, // Last 30 seconds
    operator: 'gt'
  };
  
  // Set options for subscription
  const eventOptions: EventOptions = {
    debug: true,
    filters: [eventFilter],
    category: activeCategory
  };
  
  // Get multiple event buses for different categories
  const { data: voicemodeData, count: voicemodeCount } = useEventBus('voicemode:changed');
  const { data: botData, count: botCount } = useEventBus('bot:created');
  const { data: audioData, count: audioCount } = useEventBus('audio:level');
  
  // Get generic eventBus methods
  const { emit, subscribe, getEventMetadata } = useEventBus();
  
  // Toggle panel
  const togglePanel = () => setIsOpen(!isOpen);
  
  // Change active category
  const changeCategory = (category: string) => {
    setActiveCategory(category);
  };
  
  // Emit a test event
  const emitTestEvent = () => {
    emit('custom:test', {
      message: 'Test event from EventLoggerButton',
      timestamp: Date.now()
    });
  };
  
  // Listen for toggle events from settings panel
  useEffect(() => {
    const handleToggleVisibility = (e: CustomEvent) => {
      setVisible(e.detail.visible);
    };
    
    // Add event listener
    window.addEventListener('toggle-event-monitor', 
      handleToggleVisibility as EventListener);
    
    // Check localStorage for initial visibility
    const savedPreference = localStorage.getItem('showEventMonitor');
    if (savedPreference === 'true') {
      setVisible(true);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('toggle-event-monitor', 
        handleToggleVisibility as EventListener);
    };
  }, []);
  
  // Get event stats
  const metadata = getEventMetadata();
  
  // Don't render if not visible
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-24 right-4 z-50">
      <button
        onClick={togglePanel}
        className="bg-amber-500 rounded-full w-12 h-12 flex items-center justify-center text-white shadow-lg hover:bg-amber-600 transition-colors"
        aria-label="Event Logger"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v4.34" />
          <path d="M3 15h12" />
          <path d="M16 8l2 2 4-4" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <h3 className="font-medium">Event Monitor</h3>
            <button 
              onClick={emitTestEvent}
              className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
            >
              Emit Test Event
            </button>
          </div>
          
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium mb-2">Active Categories</div>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => changeCategory(category)}
                  className={`px-2 py-1 text-xs rounded ${
                    activeCategory === category
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-3 max-h-80 overflow-y-auto">
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">Event Statistics</div>
                <div className="text-xs mt-1">
                  <div>Registered Events: {metadata.registeredEvents.length}</div>
                  <div>Voice Mode Events: {voicemodeCount}</div>
                  <div>Bot Events: {botCount}</div>
                  <div>Audio Events: {audioCount}</div>
                </div>
              </div>
              
              <div className="text-sm">
                <div className="font-medium">Latest VoiceMode Event</div>
                {voicemodeData ? (
                  <pre className="text-xs mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(voicemodeData, null, 2)}
                  </pre>
                ) : (
                  <div className="text-xs mt-1 text-gray-500">No voice mode events yet</div>
                )}
              </div>
              
              <div className="text-sm">
                <div className="font-medium">Latest Bot Event</div>
                {botData ? (
                  <pre className="text-xs mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(botData, null, 2)}
                  </pre>
                ) : (
                  <div className="text-xs mt-1 text-gray-500">No bot events yet</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500">
            Event system powered by EventBus with {metadata.registeredEvents.length} registered events
          </div>
        </div>
      )}
    </div>
  );
} 