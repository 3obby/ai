'use client';

import React, { useState, useEffect } from 'react';
import { X, Bot } from 'lucide-react';
import { BotConfigPanel } from './BotConfigPanel';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface BotSettingsModalProps {
  botId: string;
  onClose: () => void;
}

export function BotSettingsModal({ botId, onClose }: BotSettingsModalProps) {
  const { getBot } = useBotRegistry();
  const [botName, setBotName] = useState('Bot');

  useEffect(() => {
    const bot = getBot(botId);
    if (bot) {
      setBotName(bot.name);
    }
  }, [botId, getBot]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="relative bg-background border rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Bot className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-semibold">{botName} Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="max-h-[calc(90vh-56px)] overflow-y-auto">
          <BotConfigPanel botId={botId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
} 