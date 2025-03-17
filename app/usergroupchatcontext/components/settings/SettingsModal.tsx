'use client';

import React, { useState, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { GroupSettingsPanel } from './GroupSettingsPanel';
import { BotConfigPanel } from './BotConfigPanel';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { state, dispatch } = useGroupChat();
  const [activeTab, setActiveTab] = useState<'group' | 'bot'>('group');
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  
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
  
  const handleTabChange = (tab: 'group' | 'bot') => {
    setActiveTab(tab);
  };
  
  const handleConfigureBot = (botId: string) => {
    setSelectedBotId(botId);
    setActiveTab('bot');
  };
  
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
          <div className="flex overflow-x-auto hide-scrollbar">
            <button
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap",
                activeTab === 'group' 
                  ? "bg-muted border-b-2 border-primary" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => handleTabChange('group')}
            >
              Group Settings
            </button>
            
            {/* Only show Bot Configuration tab when a bot is selected */}
            {selectedBotId && (
              <button
                className={cn(
                  "px-4 py-3 text-sm font-medium whitespace-nowrap",
                  activeTab === 'bot' 
                    ? "bg-muted border-b-2 border-primary" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => handleTabChange('bot')}
              >
                Bot Configuration
              </button>
            )}
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
          {activeTab === 'group' ? (
            <GroupSettingsPanel 
              onClose={handleClose} 
              onConfigureBot={handleConfigureBot} 
            />
          ) : (
            <BotConfigPanel 
              botId={selectedBotId || ''} 
              onClose={handleClose} 
            />
          )}
        </div>
      </div>
    </div>
  );
} 