'use client';

import React, { useEffect } from 'react';
import { usePromptsContext } from '../../context/PromptsContext';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { cn } from '@/lib/utils';

interface GhostPromptsListProps {
  onPromptSelected?: (text: string) => void;
}

export function GhostPromptsList({ onPromptSelected }: GhostPromptsListProps) {
  const { state: promptsState } = usePromptsContext();
  const { state: chatState } = useRealGroupChat();
  
  // Get all enabled prompts from all containers and standalone prompts
  const enabledPrompts = React.useMemo(() => {
    const containerPrompts = promptsState.containers
      .filter(container => container.enabled)
      .flatMap(container => container.prompts.filter(prompt => prompt.enabled));
    
    const standalonePrompts = promptsState.standalonePrompts.filter(prompt => prompt.enabled);
    
    return [...containerPrompts, ...standalonePrompts];
  }, [promptsState]);

  // Concatenate all enabled prompts into a single string
  const concatenatedPromptText = React.useMemo(() => {
    return enabledPrompts.map(prompt => prompt.text).join('\n\n');
  }, [enabledPrompts]);

  // If there are no enabled prompts or chat already has messages, don't render anything
  if (enabledPrompts.length === 0 || chatState.messages.length > 0 || !concatenatedPromptText) {
    return null;
  }

  return (
    <div className="p-4">
      <div 
        className={cn(
          "ghost-prompt-concat relative p-4 rounded-lg border border-primary/40 bg-primary/5",
          "transition-all duration-200 ease-in-out cursor-pointer"
        )}
        onClick={() => onPromptSelected?.(concatenatedPromptText)}
        style={{
          animation: 'pulse-glow 2s infinite',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
        }}
      >
        <div className="text-sm whitespace-pre-wrap">
          {concatenatedPromptText}
        </div>
        <div className="absolute -bottom-3 right-4 h-6 w-1 bg-primary" 
             style={{ animation: 'pulse-opacity 2s infinite' }}>
        </div>
        <style jsx global>{`
          @keyframes pulse-glow {
            0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
            50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
            100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
          }
          @keyframes pulse-opacity {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
} 