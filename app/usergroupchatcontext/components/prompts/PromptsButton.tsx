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
      className="topbar-prompts-button p-2 hover:bg-muted flex items-center justify-center"
      onClick={handleClick}
      aria-label="Toggle prompts drawer"
    >
      <Database size={20} strokeWidth={2} className="text-primary" />
    </button>
  );
} 