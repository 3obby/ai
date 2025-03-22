'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { TogglePrompt as TogglePromptType } from '../../types/prompts';
import { usePromptsContext } from '../../context/PromptsContext';
import { Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import './prompts.css';

interface TogglePromptProps {
  prompt: TogglePromptType;
  containerId?: string;
}

export function TogglePrompt({ prompt, containerId }: TogglePromptProps) {
  const { dispatch } = usePromptsContext();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(prompt.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = (checked: boolean) => {
    dispatch({
      type: 'TOGGLE_PROMPT',
      promptId: prompt.id,
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    if (text !== prompt.text) {
      dispatch({
        type: 'UPDATE_PROMPT',
        promptId: prompt.id,
        updates: { text },
      });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  const handleTextClick = () => {
    setIsEditing(true);
  };

  const handleDelete = () => {
    if (containerId) {
      // Remove from container
      dispatch({
        type: 'REMOVE_PROMPT_FROM_CONTAINER',
        promptId: prompt.id,
        containerId,
      });
    }
    
    // Delete the prompt
    dispatch({
      type: 'REMOVE_PROMPT',
      promptId: prompt.id,
    });
  };

  const handleClone = () => {
    // Create a duplicate prompt
    const { v4: uuidv4 } = require('uuid');
    const newPromptId = `prompt-${uuidv4()}`;
    
    if (containerId) {
      // Add to the same container
      dispatch({
        type: 'ADD_PROMPT_TO_CONTAINER',
        promptId: newPromptId,
        containerId,
      });
    }
    
    dispatch({
      type: 'ADD_PROMPT',
      prompt: {
        id: newPromptId,
        text: prompt.text,
        enabled: prompt.enabled,
      },
    });
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="toggle-prompt">
      <div className="toggle-prompt-switch">
        <Switch 
          checked={prompt.enabled} 
          onCheckedChange={handleToggle}
          aria-label={`Toggle prompt: ${prompt.text}`}
        />
      </div>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="toggle-prompt-text"
          value={text}
          onChange={handleTextChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
      ) : (
        <div
          className="toggle-prompt-text"
          onClick={handleTextClick}
        >
          {prompt.text}
        </div>
      )}
      
      <div className="toggle-prompt-actions">
        <button 
          className="action-button clone-button" 
          onClick={handleClone}
          aria-label="Clone prompt"
          title="Clone prompt"
        >
          <Copy size={16} />
        </button>
        <button 
          className="action-button delete-button" 
          onClick={handleDelete}
          aria-label="Delete prompt"
          title="Delete prompt"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
} 