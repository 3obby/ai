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

  // If there are no enabled prompts or chat already has messages, don't render anything
  if (enabledPrompts.length === 0 || chatState.messages.length > 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-4">
      {enabledPrompts.map((prompt, index) => (
        <div 
          key={prompt.id}
          className={cn(
            "ghost-prompt relative pl-12 pr-4 py-3 rounded-lg border border-dashed border-primary/40 bg-primary/5",
            "hover:bg-primary/10 transition-colors duration-150 ease-in-out cursor-pointer"
          )}
          onClick={() => onPromptSelected?.(prompt.text)}
        >
          <div className="ghost-prompt-indicator absolute left-4 top-1/2 -translate-y-1/2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">{prompt.text}</div>
          {index === 0 && (
            <div className="absolute -top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              Ready to send
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 