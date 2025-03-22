'use client';

import React, { useState } from 'react';
import { Bot as BotIcon } from 'lucide-react';
import { ModeratorBotSettingsModal } from './ModeratorBotSettingsModal';
import { moderatorBotService } from '../../services/ModeratorBotService';

export function ModeratorBotButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enabled, setEnabled] = useState(moderatorBotService.getSettings().enabled);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Update the local state to reflect current service state
    setEnabled(moderatorBotService.getSettings().enabled);
  };

  return (
    <>
      <button 
        onClick={openModal}
        className="p-2 rounded-full hover:bg-muted relative"
        aria-label="Moderator Bot Settings"
        title="Moderator Bot Settings"
      >
        <BotIcon className={`h-5 w-5 ${enabled ? 'text-blue-500' : ''}`} />
        {enabled && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </button>
      
      <ModeratorBotSettingsModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </>
  );
} 