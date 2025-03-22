'use client';

import React, { useState, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { GroupSettingsPanel } from './GroupSettingsPanel';
import { AccessibilitySettingsPanel } from './AccessibilitySettingsPanel';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { state, dispatch } = useGroupChat();
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'accessibility'>('general');
  
  // Handle animation on open/close
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);
  
  // Close the modal if isOpen is false
  if (!isOpen && !isAnimating) return null;
  
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // Match the transition duration
  };
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      
      <div 
        className={cn(
          "bg-background border shadow-lg w-full overflow-hidden transition-transform duration-300",
          isOpen ? "translate-y-0 sm:scale-100" : "translate-y-10 sm:scale-95",
          "sm:static sm:h-auto sm:rounded-lg sm:w-auto sm:max-w-3xl"
        )}
        style={{
          margin: '0 auto',
          height: 'calc(100vh - 1rem)',
          maxHeight: 'calc(100vh - 1rem)',
          width: '100%',
          borderRadius: 0,
          position: 'absolute',
          top: '0.5rem',
          left: 0,
          right: 0,
        }}
      >
        <div className="flex items-center border-b sticky top-0 bg-background z-10">
          <div className="flex-1 flex items-center">
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap",
                activeTab === 'general' ? "border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('accessibility')}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap",
                activeTab === 'accessibility' ? "border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              Accessibility
            </button>
          </div>
          
          <div className="ml-auto">
            <button
              onClick={handleClose}
              className="p-3 text-muted-foreground hover:text-foreground touch-manipulation"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 49px)' }}>
          {activeTab === 'general' && (
            <GroupSettingsPanel onClose={handleClose} />
          )}
          
          {activeTab === 'accessibility' && (
            <AccessibilitySettingsPanel />
          )}
        </div>
      </div>
    </div>
  );
} 