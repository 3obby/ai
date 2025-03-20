'use client';

import React, { useState, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { Plus, Save, Check, Sliders, Bot, RefreshCw, Mic, Volume2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceTransitionSettings } from './VoiceTransitionSettings';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { VoiceTransitionFeedback } from '../voice/VoiceTransitionFeedback';

// Voice models options
const VOICE_MODELS = [
  { id: 'gpt-4o-realtime-preview', name: 'GPT-4o Realtime', description: 'Latest model optimized for voice' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast and capable model' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Efficient, low-latency model' },
];

// Voice options
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Versatile, balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Soft, mellow voice' },
  { id: 'fable', name: 'Fable', description: 'Whimsical, animated voice' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, powerful voice' },
  { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, melodic voice' },
];

interface GroupSettingsPanelProps {
  onClose?: () => void;
}

export function GroupSettingsPanel({ onClose }: GroupSettingsPanelProps) {
  const { state, updateSettings, resetChat } = useGroupChat();
  const { state: botState } = useBotRegistry();
  const { voiceSettings, updateVoiceSettings, isVoiceEnabled } = useVoiceSettings();
  const allBots = botState.availableBots;
  
  // Create state for form values - use default values if settings not loaded
  const [formValues, setFormValues] = useState({
    name: 'Group Chat',
    responseMode: 'sequential' as 'sequential' | 'parallel',
    enablePreProcessing: false,
    enablePostProcessing: false,
    showDebugInfo: true,
    enableVoice: true,
    maxReprocessingDepth: 3,
    systemPrompt: '',
    activeBots: [] as string[],
    // Voice settings
    defaultVoiceModel: 'gpt-4o-realtime-preview',
    defaultVoice: 'alloy',
    voiceSpeed: 1.0,
    showTransitionFeedback: true,
  });
  
  // State for voice settings section
  const [voiceSettingsExpanded, setVoiceSettingsExpanded] = useState(false);
  
  // Extract active bots from state or use empty array
  const [activeBotIds, setActiveBotIds] = useState<string[]>([]);
  
  // Initialize form values from state when component mounts or state changes
  useEffect(() => {
    // Initialize with settings from the actual state
    setFormValues({
      name: state.settings?.name || 'Group Chat',
      responseMode: state.settings?.responseMode || 'sequential',
      enablePreProcessing: state.settings?.processing?.enablePreProcessing || false,
      enablePostProcessing: state.settings?.processing?.enablePostProcessing || false,
      showDebugInfo: state.settings?.ui?.showDebugInfo || true,
      enableVoice: state.settings?.ui?.enableVoice || false,
      maxReprocessingDepth: state.settings?.maxReprocessingDepth || 3,
      systemPrompt: state.settings?.systemPrompt || '',
      activeBots: state.settings?.activeBotIds || [],
      // Voice settings
      defaultVoiceModel: state.settings?.voiceSettings?.defaultVoiceModel || 'gpt-4o-realtime-preview',
      defaultVoice: state.settings?.voiceSettings?.defaultVoice || 'alloy',
      voiceSpeed: state.settings?.voiceSettings?.speed || 1.0,
      showTransitionFeedback: state.settings?.voiceSettings?.showTransitionFeedback !== false,
    });
    
    // Also update active bot IDs from state
    setActiveBotIds(state.settings?.activeBotIds || []);
  }, [state.settings]);
  
  // Update active bots when bot state changes
  useEffect(() => {
    // Default to all bots being active if none specified
    if (allBots.length > 0 && activeBotIds.length === 0) {
      const allBotIds = allBots.map(bot => bot.id);
      setActiveBotIds(allBotIds);
      setFormValues(prev => ({
        ...prev,
        activeBots: allBotIds,
      }));
    }
  }, [allBots, activeBotIds.length]);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number' || name === 'maxReprocessingDepth' || name === 'voiceSpeed') {
      const numValue = parseFloat(value);
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
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update settings
    updateSettings({
      responseMode: formValues.responseMode,
      maxReprocessingDepth: formValues.maxReprocessingDepth,
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
    
    // Update voice settings
    updateVoiceSettings({
      defaultVoiceModel: formValues.defaultVoiceModel,
      defaultVoice: formValues.defaultVoice,
      speed: formValues.voiceSpeed,
      showTransitionFeedback: formValues.showTransitionFeedback,
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
  
  // Toggle voice settings section
  const toggleVoiceSettings = () => {
    setVoiceSettingsExpanded(!voiceSettingsExpanded);
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
            <label htmlFor="maxReprocessingDepth" className="text-sm font-medium">
              Max Reprocessing Depth
            </label>
            <input
              type="number"
              id="maxReprocessingDepth"
              name="maxReprocessingDepth"
              min="0"
              max="10"
              value={formValues.maxReprocessingDepth}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Controls how many times a bot can reprocess a response. Set to 0 to disable reprocessing completely.
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
          <Settings className="h-5 w-5 mr-2" />
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
      
      {/* Voice Settings */}
      {formValues.enableVoice && (
        <div>
          <button
            type="button"
            onClick={toggleVoiceSettings}
            className="flex items-center justify-between w-full mb-2 group"
          >
            <h3 className="text-lg font-medium flex items-center">
              <Volume2 className="h-5 w-5 mr-2" />
              Voice Settings
            </h3>
            <span className="text-xs group-hover:underline">
              {voiceSettingsExpanded ? 'Hide' : 'Show'} voice settings
            </span>
          </button>
          
          {voiceSettingsExpanded && (
            <div className="p-4 border rounded-md space-y-4 bg-background">
              {/* Voice Model Selection */}
              <div className="space-y-2">
                <label htmlFor="defaultVoiceModel" className="text-sm font-medium">
                  Default Voice Model
                </label>
                <select
                  id="defaultVoiceModel"
                  name="defaultVoiceModel"
                  value={formValues.defaultVoiceModel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                >
                  {VOICE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  This model will be used automatically when switching to voice mode.
                </p>
              </div>
              
              {/* Voice Selection */}
              <div className="space-y-2">
                <label htmlFor="defaultVoice" className="text-sm font-medium">
                  Default Voice
                </label>
                <select
                  id="defaultVoice"
                  name="defaultVoice"
                  value={formValues.defaultVoice}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                >
                  {VOICE_OPTIONS.map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Voice Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="voiceSpeed" className="text-sm font-medium">
                    Voice Speed
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {formValues.voiceSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  id="voiceSpeed"
                  name="voiceSpeed"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={formValues.voiceSpeed}
                  onChange={handleChange}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>
              
              {/* Visual Feedback */}
              <div className="flex items-center justify-between mt-4">
                <div>
                  <label htmlFor="showTransitionFeedback" className="text-sm font-medium">
                    Show Voice Transition Feedback
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Display visual feedback when switching between voice and text modes
                  </p>
                </div>
                <button
                  type="button"
                  id="showTransitionFeedback"
                  onClick={() => setFormValues(prev => ({
                    ...prev,
                    showTransitionFeedback: !prev.showTransitionFeedback
                  }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    formValues.showTransitionFeedback ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                  )}
                  aria-pressed={formValues.showTransitionFeedback}
                >
                  <span className="sr-only">
                    {formValues.showTransitionFeedback ? "Enabled" : "Disabled"}
                  </span>
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      formValues.showTransitionFeedback ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Voice Transition Settings */}
      {formValues.enableVoice && (
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Mic className="h-5 w-5 mr-2" />
            Voice Mode Transition
          </h3>
          <div className="p-4 border rounded-md bg-background">
            <VoiceTransitionSettings />
          </div>
        </div>
      )}
      
      {/* Bot Selection */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          Active Bots
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which bots are active in this chat. To configure a specific bot's settings, click on its avatar or name in the chat.
          </p>
          
          <div className="space-y-2">
            {allBots.map((bot) => {
              const isActive = activeBotIds.includes(bot.id);
              return (
                <div 
                  key={bot.id} 
                  className={cn(
                    "flex items-center p-2 rounded-md",
                    isActive 
                      ? "bg-primary/10" 
                      : "bg-muted"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm mr-2">
                    {bot.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{bot.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{bot.model || 'GPT-4o'}</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
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
