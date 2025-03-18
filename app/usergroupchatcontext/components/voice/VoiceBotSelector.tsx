'use client';

import React, { useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { Bot } from '../../types';
import { MicIcon, Loader2 } from 'lucide-react';

interface VoiceBotSelectorProps {
  onBotSelected?: (voiceBot: Bot) => void;
  className?: string;
}

export default function VoiceBotSelector({ onBotSelected, className = '' }: VoiceBotSelectorProps) {
  const { state, dispatch } = useGroupChatContext();
  const botRegistry = useBotRegistry();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(state.selectedBotId);

  // Get available bots
  const availableBots = botRegistry.state.availableBots.filter(bot => bot.enabled);

  // Handle bot selection for voice mode
  const handleSelectBotForVoice = async (botId: string) => {
    setIsLoading(true);
    setSelectedBotId(botId);

    try {
      // Clone the bot for voice mode
      const voiceBot = await botRegistry.cloneBotInstanceForVoice(botId);
      
      if (voiceBot) {
        // Add system message
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: `voice-mode-start-${Date.now()}`,
            content: `Starting voice conversation with ${voiceBot.name} using model ${voiceBot.model}. You can speak now.`,
            role: 'system',
            sender: 'system',
            timestamp: Date.now(),
            type: 'text'
          }
        });
        
        // Set as active bot
        dispatch({ type: 'SET_SELECTED_BOT', payload: voiceBot.id });
        
        // Add to active bots if not already there
        if (!state.settings.activeBotIds.includes(voiceBot.id)) {
          const newActiveBotIds = [...state.settings.activeBotIds, voiceBot.id];
          dispatch({
            type: 'SET_SETTINGS',
            payload: { activeBotIds: newActiveBotIds }
          });
        }
        
        // Make sure voice is enabled in settings
        if (!state.settings.ui.enableVoice) {
          dispatch({
            type: 'SET_SETTINGS',
            payload: { 
              ui: {
                ...state.settings.ui,
                enableVoice: true
              }
            }
          });
        }
        
        // Start recording
        dispatch({ type: 'TOGGLE_RECORDING' });
        
        // Notify parent if callback exists
        if (onBotSelected) {
          onBotSelected(voiceBot);
        }
      }
    } catch (error) {
      console.error('Failed to clone bot for voice mode:', error);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `voice-mode-error-${Date.now()}`,
          content: `Error starting voice mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system',
          sender: 'system',
          timestamp: Date.now(),
          type: 'text'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-4 bg-gray-800 rounded-lg ${className}`}>
      <h3 className="text-lg font-medium text-white mb-4">Select a bot for voice conversation</h3>
      
      {availableBots.length === 0 ? (
        <p className="text-gray-400">No bots available. Please add a bot first.</p>
      ) : (
        <div className="space-y-3">
          {availableBots.map(bot => (
            <button
              key={bot.id}
              onClick={() => handleSelectBotForVoice(bot.id)}
              disabled={isLoading}
              className={`
                flex items-center justify-between w-full p-3 rounded-md transition-colors
                ${selectedBotId === bot.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center">
                {bot.avatar ? (
                  <img src={bot.avatar} alt={bot.name} className="w-8 h-8 rounded-full mr-3" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 mr-3 flex items-center justify-center">
                    {bot.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{bot.name}</span>
              </div>
              <MicIcon className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-white">Starting voice mode...</span>
        </div>
      )}
    </div>
  );
} 