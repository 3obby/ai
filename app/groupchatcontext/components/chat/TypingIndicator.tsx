'use client';

import React from 'react';
import { BotId } from '../../types/bots';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface TypingIndicatorProps {
  botIds: BotId[];
}

export function TypingIndicator({ botIds }: TypingIndicatorProps) {
  const { getBot } = useBotRegistry();
  
  if (botIds.length === 0) {
    return null;
  }
  
  // Get bot names
  const botNames = botIds.map(id => {
    const bot = getBot(id);
    return bot?.name || id;
  });
  
  // Format the typing text
  let typingText = '';
  if (botNames.length === 1) {
    typingText = `${botNames[0]} is typing...`;
  } else if (botNames.length === 2) {
    typingText = `${botNames[0]} and ${botNames[1]} are typing...`;
  } else if (botNames.length === 3) {
    typingText = `${botNames[0]}, ${botNames[1]}, and ${botNames[2]} are typing...`;
  } else {
    typingText = `${botNames[0]}, ${botNames[1]}, and ${botNames.length - 2} others are typing...`;
  }

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <div className="flex space-x-1 mr-2">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{typingText}</span>
    </div>
  );
} 