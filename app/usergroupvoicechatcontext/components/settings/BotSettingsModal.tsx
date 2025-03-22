'use client';

import React from 'react';
import { X } from 'lucide-react';
import { BotConfigPanel } from './BotConfigPanel';

interface BotSettingsModalProps {
  botId: string;
  onClose: () => void;
}

export function BotSettingsModal({ botId, onClose }: BotSettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="relative bg-background rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="max-h-[90vh] overflow-y-auto">
          <BotConfigPanel botId={botId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
} 