'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { PromptsButton } from '../prompts/PromptsButton';

interface ChatHeaderProps {
  title: string;
  activeBotCount: number;
  onSettingsClick?: () => void;
}

export function ChatHeader({ title, activeBotCount, onSettingsClick }: ChatHeaderProps) {
  const { state: botState } = useBotRegistry();
  const bots = botState.availableBots;
  
  return (
    <div className="flex justify-between items-center p-4 border-b">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">
          {activeBotCount} {activeBotCount === 1 ? 'bot' : 'bots'} active
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <PromptsButton />
        <button 
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-muted"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 