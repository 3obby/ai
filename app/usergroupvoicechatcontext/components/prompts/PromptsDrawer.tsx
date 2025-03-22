'use client';

import React from 'react';
import { DrawerTopBar } from './DrawerTopBar';
import { ToggleContainer } from './ToggleContainer';
import { TogglePrompt } from './TogglePrompt';
import { usePromptsContext } from '../../context/PromptsContext';
import './prompts.css';

export function PromptsDrawer() {
  const { state } = usePromptsContext();

  return (
    <div className={`prompts-drawer ${state.isDrawerOpen ? 'open' : ''}`}>
      <DrawerTopBar />
      
      <div className="py-4">
        {/* Container area */}
        {state.containers.map((container) => (
          <ToggleContainer key={container.id} container={container} />
        ))}
        
        {/* Standalone prompts area */}
        <div className="standalone-prompts">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Standalone Prompts</h3>
          
          {state.standalonePrompts.map((prompt) => (
            <TogglePrompt key={prompt.id} prompt={prompt} />
          ))}
          
          {state.standalonePrompts.length === 0 && (
            <div className="text-muted-foreground text-xs italic px-2 py-4 text-center border border-dashed rounded-md">
              No standalone prompts
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 