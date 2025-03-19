'use client';

import React from 'react';
import { Bot } from '../../types';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { useGroupChat } from '../../context/GroupChatContext';

interface BotCardProps {
  bot: Bot;
  isActive?: boolean;
  onClick?: () => void;
}

export function BotCard({ bot, isActive = false, onClick }: BotCardProps) {
  const { updateBot } = useBotRegistry();
  const { state, dispatch } = useGroupChat();
  
  const toggleActive = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If activating the bot, add to the active bots list
    // If deactivating, remove from the list
    const newActiveBotIds = isActive
      ? state.settings.activeBotIds.filter(id => id !== bot.id)
      : [...state.settings.activeBotIds, bot.id];
    
    // Update the group chat settings
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        activeBotIds: newActiveBotIds
      }
    });
  };
  
  const toggleEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateBot(bot.id, { enabled: !bot.enabled });
  };
  
  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border transition-all cursor-pointer
        ${isActive 
          ? 'border-primary bg-primary/10' 
          : 'border-muted bg-background hover:border-muted-foreground/50'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {bot.avatar ? (
              <img 
                src={bot.avatar} 
                alt={bot.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold">
                {bot.name.charAt(0)}
              </span>
            )}
          </div>
          
          <div>
            <h3 className="font-medium text-foreground">{bot.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {bot.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            className={`
              h-6 px-2 text-xs font-medium rounded-full
              ${isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
              }
            `}
          >
            {isActive ? 'Active' : 'Add'}
          </button>
          
          <button
            onClick={toggleEnabled}
            className={`
              h-6 px-2 text-xs font-medium rounded-full
              ${bot.enabled 
                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-destructive/20 text-destructive'
              }
            `}
          >
            {bot.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
      
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-xs bg-muted px-2 py-1 rounded-full">
          {bot.model}
        </span>
        
        <span className="text-xs bg-muted px-2 py-1 rounded-full">
          Temp: {bot.temperature}
        </span>
        
        {bot.useTools && (
          <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
            Tools
          </span>
        )}
      </div>
    </div>
  );
} 