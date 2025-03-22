'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { usePromptsContext } from '../../context/PromptsContext';
import { v4 as uuidv4 } from 'uuid';
import './prompts.css';

export function DrawerTopBar() {
  const { dispatch } = usePromptsContext();

  const handleAddPrompt = () => {
    dispatch({
      type: 'ADD_PROMPT',
      prompt: {
        id: `prompt-${uuidv4()}`,
        text: 'New prompt',
        enabled: true,
      },
    });
  };

  const handleCloseDrawer = () => {
    dispatch({ type: 'CLOSE_DRAWER' });
  };

  return (
    <div className="drawer-top-bar">
      <h2 className="drawer-title">Custom Prompts</h2>
      <div className="drawer-actions">
        <button
          className="add-prompt-button"
          onClick={handleAddPrompt}
          aria-label="Add new prompt"
        >
          <Plus size={18} />
        </button>
        <button
          className="close-drawer-button"
          onClick={handleCloseDrawer}
          aria-label="Close prompts drawer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
} 