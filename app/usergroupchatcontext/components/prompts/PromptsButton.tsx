'use client';

import React from 'react';
import { Database } from 'lucide-react';
import { usePromptsContext } from '../../context/PromptsContext';
import '../prompts/prompts.css';

export function PromptsButton() {
  const { dispatch } = usePromptsContext();

  const handleClick = () => {
    dispatch({ type: 'TOGGLE_DRAWER' });
  };

  return (
    <button 
      className="prompts-button"
      onClick={handleClick}
      aria-label="Toggle prompts drawer"
    >
      <div className="database-icon-circle">
        <Database size={20} strokeWidth={2} />
      </div>
      <span className="prompts-button-text">Prompts</span>
    </button>
  );
} 