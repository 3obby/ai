'use client';

import React, { useEffect, useState } from 'react';
import { usePromptsContext } from '../../context/PromptsContext';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { useLiveKitIntegration } from '../../context/LiveKitIntegrationProvider';
import { cn } from '@/lib/utils';

interface GhostPromptsListProps {
  onPromptSelected?: (text: string) => void;
}

export function GhostPromptsList({ onPromptSelected }: GhostPromptsListProps) {
  const { state: promptsState } = usePromptsContext();
  const { state: chatState } = useRealGroupChat();
  const { isInVoiceMode } = useLiveKitIntegration();
  
  // Keep track of whether the pendingprompt has been clicked or sent
  const [wasInteractedWith, setWasInteractedWith] = useState(false);
  
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
  
  // Reset wasInteractedWith when enabled prompts change
  useEffect(() => {
    if (enabledPrompts.length > 0) {
      setWasInteractedWith(false);
    }
  }, [enabledPrompts.length]);
  
  // Handle click on the pendingprompt
  const handlePromptClick = () => {
    if (onPromptSelected && concatenatedPromptText) {
      setWasInteractedWith(true);
      onPromptSelected(concatenatedPromptText);
    }
  };

  // Don't show pendingprompt if:
  // 1. There are no enabled prompts
  // 2. Chat already has messages
  // 3. No concatenated prompt text
  // 4. Voice mode is active (prevents duplicate prompt when voice mode is activated)
  // 5. The pendingprompt has already been interacted with
  if (enabledPrompts.length === 0 || 
      chatState.messages.length > 0 || 
      !concatenatedPromptText || 
      isInVoiceMode || 
      wasInteractedWith) {
    return null;
  }

  return (
    <div className="p-4 pb-16">
      <div 
        className={cn(
          "ghost-prompt-concat relative p-4 rounded-lg border border-primary/40 bg-primary/5",
          "transition-all duration-200 ease-in-out cursor-pointer"
        )}
        onClick={handlePromptClick}
        style={{
          animation: 'pulse-glow 2s infinite',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
          maxHeight: '200px',
          overflow: 'auto'
        }}
      >
        <div className="text-sm whitespace-pre-wrap overflow-ellipsis">
          {concatenatedPromptText}
        </div>
        
        {/* Visual connector to the send button */}
        <div className="absolute -bottom-14 right-4 h-14 w-1 bg-primary" 
             style={{ animation: 'pulse-opacity 2s infinite' }}>
        </div>
        
        {/* Visual dot connector */}
        <div className="absolute -bottom-14 right-4 h-3 w-3 rounded-full bg-primary"
             style={{ animation: 'pulse-glow 2s infinite' }}>
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