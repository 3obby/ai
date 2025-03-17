'use client';

import React, { useState, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { Plus, Save, Check, Sliders, Bot, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupSettingsPanelProps {
  onClose?: () => void;
  onConfigureBot?: (botId: string) => void;
}

export function GroupSettingsPanel({ onClose, onConfigureBot }: GroupSettingsPanelProps) {
  const { state, updateSettings, resetChat } = useGroupChat();
  const { state: botState } = useBotRegistry();
  const bots = botState.availableBots || [];
  
  // Create state for form values - use default values if settings not loaded
  const [formValues, setFormValues] = useState({
    name: 'Group Chat',
    responseMode: 'sequential',
    enablePreProcessing: false,
    enablePostProcessing: false,
    showDebugInfo: true,
    enableVoice: true,
    maxRecursionDepth: 3,
    systemPrompt: '',
    activeBots: [] as string[],
  });
  
  // Extract active bots from state or use empty array
  const [activeBotIds, setActiveBotIds] = useState<string[]>([]);
  
  // Initialize form values from state when component mounts or state changes
  useEffect(() => {
    // Initialize with settings from state
    // In a real app, this would pull from the actual settings
    setFormValues({
      name: 'Group Chat',
      responseMode: 'sequential',
      enablePreProcessing: false,
      enablePostProcessing: false,
      showDebugInfo: true,
      enableVoice: true,
      maxRecursionDepth: 3,
      systemPrompt: '',
      activeBots: activeBotIds,
    });
  }, []);
  
  // Update active bots when bot state changes
  useEffect(() => {
    // Default to all bots being active if none specified
    if (bots.length > 0 && activeBotIds.length === 0) {
      const allBotIds = bots.map(bot => bot.id);
      setActiveBotIds(allBotIds);
      setFormValues(prev => ({
        ...prev,
        activeBots: allBotIds,
      }));
    }
  }, [bots, activeBotIds.length]);
  
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
  
  // Handle bot selection changes
  const handleBotSelectionChange = (botId: string, isActive: boolean) => {
    const newActiveBotIds = isActive
      ? [...formValues.activeBots, botId]
      : formValues.activeBots.filter(id => id !== botId);
    
    setFormValues(prev => ({
      ...prev,
      activeBots: newActiveBotIds
    }));
    setActiveBotIds(newActiveBotIds);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update settings
    updateSettings({
      responseMode: formValues.responseMode as 'sequential' | 'parallel',
      maxRecursionDepth: formValues.maxRecursionDepth,
      systemPrompt: formValues.systemPrompt,
      processing: {
        enablePreProcessing: formValues.enablePreProcessing,
        enablePostProcessing: formValues.enablePostProcessing,
      },
      ui: {
        showDebugInfo: formValues.showDebugInfo,
        enableVoice: formValues.enableVoice,
      },
      activeBots: formValues.activeBots,
    });
    
    // Close the modal
    if (onClose) onClose();
  };
  
  // Handle chat reset
  const handleResetChat = () => {
    if (window.confirm('Are you sure you want to reset the chat? All messages will be cleared.')) {
      resetChat();
      if (onClose) onClose();
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      {/* General Settings */}
      <div>
        <h3 className="text-lg font-medium mb-4">General Settings</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Chat Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="responseMode" className="text-sm font-medium">
              Response Mode
            </label>
            <select
              id="responseMode"
              name="responseMode"
              value={formValues.responseMode}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="sequential">Sequential</option>
              <option value="parallel">Parallel</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Sequential: Bots respond one after another. Parallel: All bots respond at once.
            </p>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="maxRecursionDepth" className="text-sm font-medium">
              Max Recursion Depth
            </label>
            <input
              type="number"
              id="maxRecursionDepth"
              name="maxRecursionDepth"
              min="0"
              max="10"
              value={formValues.maxRecursionDepth}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of recursive message processing iterations.
            </p>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="systemPrompt" className="text-sm font-medium">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              name="systemPrompt"
              value={formValues.systemPrompt}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              placeholder="Enter a system prompt for the entire chat..."
            />
            <p className="text-xs text-muted-foreground">
              System instructions that apply to all bots in the conversation.
            </p>
          </div>
        </div>
      </div>
      
      {/* Processing Settings */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Sliders className="h-5 w-5 mr-2" />
          Processing Settings
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enablePreProcessing"
              name="enablePreProcessing"
              checked={formValues.enablePreProcessing}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="enablePreProcessing" className="text-sm font-medium">
              Enable message pre-processing
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enablePostProcessing"
              name="enablePostProcessing"
              checked={formValues.enablePostProcessing}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="enablePostProcessing" className="text-sm font-medium">
              Enable message post-processing
            </label>
          </div>
        </div>
      </div>
      
      {/* UI Settings */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Sliders className="h-5 w-5 mr-2" />
          UI Settings
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showDebugInfo"
              name="showDebugInfo"
              checked={formValues.showDebugInfo}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="showDebugInfo" className="text-sm font-medium">
              Show debug information
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableVoice"
              name="enableVoice"
              checked={formValues.enableVoice}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="enableVoice" className="text-sm font-medium">
              Enable voice features
            </label>
          </div>
        </div>
      </div>
      
      {/* Bot Selection */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          Active Bots
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bots.map(bot => {
            const isActive = formValues.activeBots.includes(bot.id);
            return (
              <div key={bot.id} className="border rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {bot.avatar ? (
                      <img src={bot.avatar} alt={bot.name} className="h-8 w-8 rounded-full" />
                    ) : (
                      bot.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{bot.name}</h4>
                    <p className="text-xs text-muted-foreground">{bot.model}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onConfigureBot && onConfigureBot(bot.id)}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Configure
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBotSelectionChange(bot.id, !isActive)}
                    className={cn(
                      "p-1.5 rounded-md",
                      isActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/20" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    aria-label={isActive ? `Remove ${bot.name} from chat` : `Add ${bot.name} to chat`}
                  >
                    {isActive ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={handleResetChat}
          className="px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Chat
        </button>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </form>
  );
}
