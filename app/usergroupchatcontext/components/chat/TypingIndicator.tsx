'use client';

import React from 'react';
import { BotId } from '../../types/bots';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface TypingIndicatorProps {
  botIds: BotId[];
  processingStages?: Record<string, string>;
  activeTools?: Record<string, string[]>;
}

export function TypingIndicator({ 
  botIds, 
  processingStages = {}, 
  activeTools = {} 
}: TypingIndicatorProps) {
  const { getBot } = useBotRegistry();
  
  if (botIds.length === 0) {
    return null;
  }
  
  // Format stage display text
  const formatStageText = (botId: string): string => {
    const stage = processingStages[botId];
    const tools = activeTools[botId];
    
    if (!stage) return '';
    
    // Format based on stage
    switch (stage) {
      case 'pre-processing':
        return 'pre-processing';
      case 'post-processing':
        return 'post-processing';
      case 'reprocessing':
        // Check if we have depth information
        const depthMatch = stage.match(/reprocessing-(\d+)/);
        const depth = depthMatch ? parseInt(depthMatch[1], 10) : null;
        return depth ? `reprocessing (${depth})` : 'reprocessing';
      case 'tool-calling':
        // Show which tools are being used if available
        if (tools && tools.length > 0) {
          // Truncate if there are many tools
          if (tools.length === 1) {
            return `using ${tools[0]}`;
          } else {
            return `using tools (${tools.length})`;
          }
        }
        return 'using tools';
      default:
        return stage;
    }
  };
  
  // Get bot information with stages
  const botInfo = botIds.map(id => {
    const bot = getBot(id);
    const name = bot?.name || id;
    const stage = formatStageText(id);
    
    return {
      id,
      name,
      stage
    };
  });
  
  // Format the typing text
  const formatTypingText = () => {
    if (botInfo.length === 1) {
      const bot = botInfo[0];
      return bot.stage 
        ? `${bot.name} is ${bot.stage}...` 
        : `${bot.name} is typing...`;
    }
    
    if (botInfo.length === 2) {
      return `${botInfo[0].name} and ${botInfo[1].name} are typing...`;
    }
    
    if (botInfo.length === 3) {
      return `${botInfo[0].name}, ${botInfo[1].name}, and ${botInfo[2].name} are typing...`;
    }
    
    return `${botInfo[0].name}, ${botInfo[1].name}, and ${botInfo.length - 2} others are typing...`;
  };

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <div className="flex space-x-1 mr-2">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{formatTypingText()}</span>
    </div>
  );
} 