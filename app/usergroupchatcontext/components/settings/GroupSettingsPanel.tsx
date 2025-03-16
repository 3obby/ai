'use client';

import React, { useState } from 'react';
import { useGroupChat } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface GroupSettingsPanelProps {
  onClose?: () => void;
  onConfigureBot?: (botId: string) => void;
}

export function GroupSettingsPanel({ onClose, onConfigureBot }: GroupSettingsPanelProps) {
  const { state, dispatch } = useGroupChat();
  const { state: botState, updateBot } = useBotRegistry();
  const bots = botState.availableBots;
  const settings = state.settings;
  
  // Create state for form values
  const [formValues, setFormValues] = useState({
    responseMode: settings.responseMode,
    maxRecursionDepth: settings.maxRecursionDepth,
    systemPrompt: settings.systemPrompt || '',
    enablePreProcessing: settings.processing.enablePreProcessing,
    enablePostProcessing: settings.processing.enablePostProcessing,
    showDebugInfo: settings.ui.showDebugInfo,
  });
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'maxRecursionDepth') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setFormValues(prev => ({
          ...prev,
          [name]: numValue
        }));
      }
    } else {
      setFormValues(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle bot selection change
  const handleBotSelectionChange = (botId: string, isActive: boolean) => {
    const newActiveBotIds = isActive
      ? [...settings.activeBotIds, botId]
      : settings.activeBotIds.filter(id => id !== botId);
    
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        activeBotIds: newActiveBotIds
      }
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update settings
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        responseMode: formValues.responseMode as 'sequential' | 'parallel',
        maxRecursionDepth: formValues.maxRecursionDepth,
        systemPrompt: formValues.systemPrompt,
        processing: {
          ...settings.processing,
          enablePreProcessing: formValues.enablePreProcessing,
          enablePostProcessing: formValues.enablePostProcessing,
        },
        ui: {
          ...settings.ui,
          showDebugInfo: formValues.showDebugInfo
        }
      }
    });
    
    // Close if callback provided
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <div className="p-4 bg-background rounded-lg max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Group Chat Settings</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Bot Selection */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Active Bots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bots.map(bot => {
              const isActive = settings.activeBotIds.includes(bot.id);
              return (
                <div key={bot.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox"
                      id={`bot-${bot.id}`}
                      checked={isActive}
                      onChange={(e) => handleBotSelectionChange(bot.id, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label 
                      htmlFor={`bot-${bot.id}`}
                      className="cursor-pointer font-medium text-sm"
                    >
                      {bot.name}
                    </label>
                  </div>
                  <button 
                    type="button" 
                    className="text-sm text-primary hover:underline"
                    onClick={() => onConfigureBot?.(bot.id)}
                  >
                    Configure
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Chat Behavior */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Chat Behavior</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Response Mode
              <select
                name="responseMode"
                value={formValues.responseMode}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md bg-background"
              >
                <option value="parallel">Parallel (Bots respond independently)</option>
                <option value="sequential">Sequential (Bots respond in order)</option>
              </select>
            </label>
            
            <label className="block text-sm font-medium">
              System Prompt
              <textarea
                name="systemPrompt"
                value={formValues.systemPrompt}
                onChange={handleChange}
                rows={3}
                className="mt-1 w-full p-2 border rounded-md bg-background"
                placeholder="Base system prompt for all bots"
              />
            </label>
            
            <label className="block text-sm font-medium">
              Max Recursion Depth
              <input
                type="number"
                name="maxRecursionDepth"
                value={formValues.maxRecursionDepth}
                onChange={handleChange}
                min={0}
                max={10}
                className="mt-1 w-full p-2 border rounded-md bg-background"
              />
            </label>
          </div>
        </div>
        
        {/* Prompt Processing */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Prompt Processing</h3>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enablePreProcessing"
                name="enablePreProcessing"
                checked={formValues.enablePreProcessing}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="enablePreProcessing" className="text-sm cursor-pointer">
                Enable pre-processing of user messages
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enablePostProcessing"
                name="enablePostProcessing"
                checked={formValues.enablePostProcessing}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="enablePostProcessing" className="text-sm cursor-pointer">
                Enable post-processing of bot responses
              </label>
            </div>
          </div>
        </div>
        
        {/* UI Settings */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">UI Settings</h3>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showDebugInfo"
                name="showDebugInfo"
                checked={formValues.showDebugInfo}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="showDebugInfo" className="text-sm cursor-pointer">
                Show debug information
              </label>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
