'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptIndicatorProps {
  promptCount: number;
  onClear: () => void;
  className?: string;
}

export function PromptIndicator({ promptCount, onClear, className }: PromptIndicatorProps) {
  if (promptCount === 0) return null;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs text-primary/80",
      "border-r border-r-input pr-1 mr-1 py-1",
      className
    )}>
      <span className="font-medium">{promptCount}</span>
      <button 
        onClick={(e) => {
          e.preventDefault(); // Prevent form submission
          onClear();
        }}
        className="hover:text-primary transition-colors"
        aria-label="Clear prompts"
        title="Clear prompts"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
} 