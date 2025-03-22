'use client';

import React, { useState, useEffect } from 'react';
import { Bot } from '../../types';
import { useRealGroupChat } from '../../hooks/useRealGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface ReprocessingDebugToolProps {
  bot: Bot;
}

export const ReprocessingDebugTool: React.FC<ReprocessingDebugToolProps> = ({ bot: defaultBot }) => {
  const { dispatch, sendMessage } = useRealGroupChat();
  const { state: botState } = useBotRegistry();
  const [testMessage, setTestMessage] = useState('');
  const [realBot, setRealBot] = useState<Bot | null>(null);
  
  // Find the real bot from the registry
  useEffect(() => {
    // Try to get the real bot from the registry
    const actualBot = botState.availableBots.find(b => b.id === 'default') || null;
    if (actualBot) {
      setRealBot(actualBot);
      console.log('🔍 Found actual bot in registry:', actualBot);
    } else {
      setRealBot(defaultBot);
      console.log('⚠️ Could not find actual bot in registry, using default');
    }
  }, [botState.availableBots, defaultBot]);
  
  // Use the real bot from registry if available, otherwise use the prop
  const bot = realBot || defaultBot;
  
  // Function to directly update the bot with reprocessing settings
  const enableReprocessing = () => {
    console.log('🔄 DEBUG: Directly enabling reprocessing for bot', bot.id);
    
    // Update the bot using dispatch directly
    dispatch({ 
      type: 'UPDATE_BOT', 
      botId: bot.id, 
      updates: {
        enableReprocessing: true,
        reprocessingCriteria: 'true',
        reprocessingInstructions: 'bark like a dog!'
      }
    });
    
    console.log('🔄 DEBUG: Bot updated with reprocessing settings:', {
      enableReprocessing: true, 
      reprocessingCriteria: 'true',
      reprocessingInstructions: 'bark like a dog!'
    });
  };
  
  // Function to manually send a test message
  const sendTestMessage = () => {
    if (!testMessage.trim()) {
      alert('Please enter a test message');
      return;
    }
    
    console.log('🔄 DEBUG: Sending test message:', testMessage);
    sendMessage(testMessage);
    setTestMessage('');
  };
  
  return (
    <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg text-sm">
      <h3 className="font-bold mb-2">Reprocessing Debug Tool</h3>
      
      <div className="flex flex-col space-y-2 mb-4">
        <p className="text-xs">
          Bot ID: {bot.id}<br />
          Current Settings:<br />
          - enableReprocessing: {String(bot.enableReprocessing)}<br />
          - reprocessingCriteria: {bot.reprocessingCriteria || 'undefined'}<br />
          - reprocessingInstructions: {bot.reprocessingInstructions || 'undefined'}
        </p>
      </div>
      
      <div className="flex flex-col space-y-2">
        <button
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          onClick={enableReprocessing}
        >
          Enable Reprocessing
        </button>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Test message"
            className="flex-1 border p-1 rounded text-sm text-black"
          />
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            onClick={sendTestMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReprocessingDebugTool; 