'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TogglePrompt } from './TogglePrompt';
import { ToggleContainer as ToggleContainerType } from '../../types/prompts';
import { usePromptsContext } from '../../context/PromptsContext';
import { Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../prompts/prompts.css';

interface ToggleContainerProps {
  container: ToggleContainerType;
}

export function ToggleContainer({ container }: ToggleContainerProps) {
  const { dispatch } = usePromptsContext();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(container.title);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title !== container.title) {
      dispatch({
        type: 'UPDATE_CONTAINER',
        containerId: container.id,
        updates: { title },
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleRef.current?.blur();
    }
  };

  const handleToggle = (checked: boolean) => {
    dispatch({
      type: 'TOGGLE_CONTAINER',
      containerId: container.id,
    });
  };

  const handleDelete = () => {
    dispatch({
      type: 'REMOVE_CONTAINER',
      containerId: container.id,
    });
  };

  const handleClone = () => {
    // Create a duplicate container with new IDs for all prompts
    const { v4: uuidv4 } = require('uuid');
    const newContainerId = `container-${uuidv4()}`;
    const duplicatedPrompts = container.prompts.map(prompt => ({
      id: `prompt-${uuidv4()}`,
      text: prompt.text,
      enabled: prompt.enabled,
    }));
    
    dispatch({
      type: 'ADD_CONTAINER',
      container: {
        id: newContainerId,
        title: `${container.title} (Copy)`,
        enabled: container.enabled,
        prompts: duplicatedPrompts,
      },
    });
  };

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isEditingTitle]);

  return (
    <div className="toggle-container">
      <div className="toggle-container-header">
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              ref={titleRef}
              type="text"
              className="container-title"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h3 
              className="container-title editable" 
              onClick={handleTitleClick}
            >
              {container.title}
            </h3>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="container-toggle">
            <Switch 
              checked={container.enabled} 
              onCheckedChange={handleToggle}
              aria-label={`Toggle container: ${container.title}`}
            />
          </div>
          
          <div className="container-actions">
            <button 
              className="action-button clone-button" 
              onClick={handleClone}
              aria-label="Clone container"
              title="Clone container"
            >
              <Copy size={16} />
            </button>
            <button 
              className="action-button delete-button" 
              onClick={handleDelete}
              aria-label="Delete container"
              title="Delete container"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="toggle-container-content">
        {container.prompts.length > 0 ? (
          container.prompts.map(prompt => (
            <TogglePrompt
              key={prompt.id}
              prompt={prompt}
              containerId={container.id}
            />
          ))
        ) : (
          <div className="text-muted-foreground text-xs italic py-4 px-2 text-center border border-dashed rounded-md">
            No prompts in this container
          </div>
        )}
      </div>
    </div>
  );
} 