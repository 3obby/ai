'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface VoiceActivityIndicatorProps {
  isActive: boolean;
  className?: string;
}

export function VoiceActivityIndicator({ isActive, className }: VoiceActivityIndicatorProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className={cn(
        "relative w-3 h-3 rounded-full mr-1",
        isActive 
          ? "bg-red-500 animate-pulse" 
          : "bg-green-500"
      )}>
        {isActive && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </div>
      <span className="text-xs font-medium">
        {isActive ? 'Recording' : 'Voice ready'}
      </span>
    </div>
  );
} 