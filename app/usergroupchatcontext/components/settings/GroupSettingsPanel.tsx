'use client';

import React, { useState, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { Plus, Save, Check, Sliders, Bot, RefreshCw, Mic, Volume2, Settings, ChevronDown, ChevronRight, AlertCircle, Activity, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceTransitionSettings } from './VoiceTransitionSettings';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { VadMode, VoiceOption } from '../../types/voice';
import { VoiceActivityIndicator } from '../voice/VoiceActivityIndicator';

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
  const { state: botState, fetchLatestVoiceModel } = useBotRegistry();
  const { voiceSettings, updateVoiceSettings, isVoiceEnabled, vadSettings } = useVoiceSettings();
  const allBots = botState.availableBots;
  
  // Create state for form values - use default values if settings not loaded
  const initialFormValues = {
    name: '',
    activeBotIds: [],
    responseMode: 'sequential' as const,
    systemPrompt: '',
    maxReprocessingDepth: 3,
    enablePreProcessing: true,
    enablePostProcessing: true,
    preProcessingPrompt: '',
    postProcessingPrompt: '',
    theme: 'dark',
    messageBubbleStyle: 'modern',
    enableVoice: true,
    enableTyping: true,
    showTimestamps: true,
    showAvatars: true,
    showDebugInfo: true,
    vadMode: 'auto',
    vadThreshold: 0.3,
    silenceDurationMs: 1000,
    prefixPaddingMs: 500,
    defaultVoice: '',
    defaultVoiceModel: '',
    speed: 1.0,
    keepPreprocessingHooks: false,
    keepPostprocessingHooks: false,
    preserveVoiceHistory: true,
    automaticVoiceSelection: false
  };
  
  const [formValues, setFormValues] = useState(initialFormValues);
  
  // State for voice settings section
  const [voiceSettingsExpanded, setVoiceSettingsExpanded] = useState(false);
  const [advancedVoiceSettingsExpanded, setAdvancedVoiceSettingsExpanded] = useState(false);
  const [availableVoiceModels, setAvailableVoiceModels] = useState<{id: string, name: string}[]>([
    { id: 'gpt-4o-realtime-preview', name: 'GPT-4o Realtime' },
    { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision' }
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Extract active bots from state or use empty array
  const [activeBotIds, setActiveBotIds] = useState<string[]>([]);
  
  // Initialize form values from state when component mounts or state changes
  useEffect(() => {
    // Initialize with settings from the actual state
    setFormValues({
      name: state.settings?.name || 'Group Chat',
      responseMode: state.settings?.responseMode || 'sequential',
      enablePreProcessing: state.settings?.processing?.enablePreProcessing || true,
      enablePostProcessing: state.settings?.processing?.enablePostProcessing || true,
      showDebugInfo: state.settings?.ui?.showDebugInfo || true,
      enableVoice: state.settings?.ui?.enableVoice || true,
      maxReprocessingDepth: state.settings?.maxReprocessingDepth || 3,
      systemPrompt: state.settings?.systemPrompt || '',
      activeBots: state.settings?.activeBotIds || [],
      // Voice settings
      defaultVoiceModel: state.settings?.voiceSettings?.defaultVoiceModel || 'gpt-4o-realtime-preview',
      defaultVoice: state.settings?.voiceSettings?.defaultVoice || 'alloy',
      voiceSpeed: state.settings?.voiceSettings?.speed || 1.0,
      showTransitionFeedback: state.settings?.voiceSettings?.showTransitionFeedback !== false,
      // Voice detection settings
      vadMode: state.settings?.voiceSettings?.vadMode || 'auto',
      vadThreshold: state.settings?.voiceSettings?.vadThreshold || 0.5,
      // Advanced voice settings
      keepPreprocessingHooks: state.settings?.voiceSettings?.keepPreprocessingHooks || false,
      keepPostprocessingHooks: state.settings?.voiceSettings?.keepPostprocessingHooks || false,
      preserveVoiceHistory: state.settings?.voiceSettings?.preserveVoiceHistory !== false,
      automaticVoiceSelection: state.settings?.voiceSettings?.automaticVoiceSelection !== false,
    });
    
    // Also update active bot IDs from state
    setActiveBotIds(state.settings?.activeBotIds || []);
  }, [state.settings]);
  
  // Load latest voice model on component mount
  useEffect(() => {
    // Function to get the latest voice model
    const getLatestVoiceModel = async () => {
      setIsLoadingModels(true);
      try {
        const latestModel = await fetchLatestVoiceModel();
        
        // Update available models with the latest one first
        const updatedModels = [
          { id: latestModel, name: `Latest: ${latestModel}` },
          ...availableVoiceModels.filter(m => m.id !== latestModel)
        ];
        
        setAvailableVoiceModels(updatedModels);
        
        // Update form values with latest model
        setFormValues(prev => ({
          ...prev,
          defaultVoiceModel: latestModel
        }));
        
        console.log(`Loaded latest voice model: ${latestModel}`);
      } catch (error) {
        console.error('Failed to fetch latest voice model:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    // Only fetch if voice is enabled
    if (formValues.enableVoice) {
      getLatestVoiceModel();
    }
  }, [formValues.enableVoice, fetchLatestVoiceModel]);
  
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
      defaultVoice: formValues.defaultVoice as VoiceOption,
      speed: formValues.voiceSpeed,
      showTransitionFeedback: formValues.showTransitionFeedback,
      vadMode: formValues.vadMode,
      vadThreshold: formValues.vadThreshold,
      keepPreprocessingHooks: formValues.keepPreprocessingHooks,
      keepPostprocessingHooks: formValues.keepPostprocessingHooks,
      preserveVoiceHistory: formValues.preserveVoiceHistory,
      automaticVoiceSelection: formValues.automaticVoiceSelection,
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
  
  // Toggle advanced voice settings
  const toggleAdvancedVoiceSettings = () => {
    setAdvancedVoiceSettingsExpanded(!advancedVoiceSettingsExpanded);
  };
  
  // Handle voice detection mode change
  const handleVadModeChange = (mode: VadMode) => {
    setFormValues(prev => ({
      ...prev,
      vadMode: mode
    }));
  };

  const [showEventMonitor, setShowEventMonitor] = useState(false);
  const [eventMonitorVisible, setEventMonitorVisible] = useState(false);

  // Toggle event monitor
  const toggleEventMonitor = () => {
    const newValue = !showEventMonitor;
    setShowEventMonitor(newValue);
    
    // Store the preference in localStorage
    localStorage.setItem('showEventMonitor', String(newValue));
    
    // Update visibility 
    setEventMonitorVisible(newValue);
    
    // Dispatch a custom event that the EventLoggerButton can listen for
    window.dispatchEvent(new CustomEvent('toggle-event-monitor', { 
      detail: { visible: newValue } 
    }));
  };

  // Load event monitor preference from localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('showEventMonitor');
    if (savedPreference !== null) {
      const shouldShow = savedPreference === 'true';
      setShowEventMonitor(shouldShow);
      setEventMonitorVisible(shouldShow);
    }
  }, []);

  return (
    <div className="p-4 space-y-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Group Chat Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure group-wide settings here. For bot-specific settings like model, personality, or tools, 
          click on a bot's avatar or name in the chat.
        </p>
      </div>

      {/* Chat Name */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Settings</h3>
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Chat Name
            <input
              type="text"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-md"
            />
          </label>
        </div>
      </div>

      {/* Bot Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Active Bots</h3>
          <div className="text-xs text-muted-foreground">
            {activeBotIds.length} selected
          </div>
        </div>
        
        <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
          {allBots.map((bot) => (
            <div key={bot.id} className="p-2 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-2 text-sm">
                  {bot.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-sm">{bot.name}</div>
                  <div className="text-xs text-muted-foreground">{bot.model}</div>
                </div>
              </div>
              <div className="flex items-center">
                {!bot.id.startsWith('voice-') && (
                  <input
                    type="checkbox"
                    id={`bot-${bot.id}`}
                    checked={activeBotIds.includes(bot.id)}
                    onChange={() => handleBotSelectionChange(bot.id, !activeBotIds.includes(bot.id))}
                    className="h-4 w-4 ml-4"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Info className="h-4 w-4 mr-1" />
          <span>Click on a bot's avatar in the chat to customize its settings</span>
        </div>
      </div>

      {/* Chat Behavior Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Chat Behavior</h3>
        
        <div className="space-y-3">
          <label className="block text-sm">
            Response Mode
            <select
              name="responseMode"
              value={formValues.responseMode}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-md"
            >
              <option value="sequential">Sequential (one bot at a time)</option>
              <option value="parallel">Parallel (all bots respond)</option>
            </select>
          </label>
          
          <label className="block text-sm">
            Max Reprocessing Depth
            <input
              type="number"
              name="maxReprocessingDepth"
              min="0"
              max="5"
              value={formValues.maxReprocessingDepth}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-md"
            />
            <span className="text-xs text-muted-foreground">
              Maximum number of reprocessing iterations for bot responses. Higher values can improve quality but may increase response time.
            </span>
          </label>
        </div>
      </div>

      {/* Voice Settings Section - Keep this existing section */}
      
      {/* General Settings */}
      <div>
        <h3 className="text-lg font-medium mb-4">General Settings</h3>
        <div className="space-y-4">
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
            <span className="text-xs group-hover:underline flex items-center">
              {voiceSettingsExpanded ? 'Hide' : 'Show'} voice settings
              {voiceSettingsExpanded ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
            </span>
          </button>
          
          {voiceSettingsExpanded && (
            <div className="p-4 border rounded-md space-y-5 bg-background">
              {/* Voice Model Selection */}
              <div className="space-y-2 border-b pb-4">
                <label htmlFor="defaultVoiceModel" className="text-sm font-medium">
                  Default Voice Model
                </label>
                <select
                  id="defaultVoiceModel"
                  name="defaultVoiceModel"
                  value={formValues.defaultVoiceModel}
                  onChange={handleChange}
                  disabled={isLoadingModels}
                  className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                >
                  {isLoadingModels && (
                    <option>Loading latest models...</option>
                  )}
                  {availableVoiceModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  This model will be used automatically when switching to voice mode.
                </p>
                {isLoadingModels && (
                  <div className="flex items-center text-xs text-amber-500">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Loading latest model information...
                  </div>
                )}
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
              
              {/* Voice Activity Detection Settings */}
              <div className="space-y-3 border-t pt-4">
                <label className="text-sm font-medium">Voice Detection Mode</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleVadModeChange('auto')}
                    className={cn(
                      "px-3 py-1 rounded text-sm",
                      formValues.vadMode === 'auto'
                        ? "bg-primary text-primary-foreground"
                        : "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
                    )}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVadModeChange('sensitive')}
                    className={cn(
                      "px-3 py-1 rounded text-sm",
                      formValues.vadMode === 'sensitive'
                        ? "bg-primary text-primary-foreground"
                        : "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
                    )}
                  >
                    Sensitive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVadModeChange('manual')}
                    className={cn(
                      "px-3 py-1 rounded text-sm",
                      formValues.vadMode === 'manual'
                        ? "bg-primary text-primary-foreground"
                        : "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
                    )}
                  >
                    Manual
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto: Standard sensitivity, Sensitive: Detect quiet speech, Manual: Button-controlled
                </p>
                
                {/* Sensitivity slider (only for auto and sensitive modes) */}
                {formValues.vadMode !== 'manual' && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="vadThreshold" className="text-sm font-medium">
                        Voice Detection Sensitivity
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {formValues.vadThreshold.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      id="vadThreshold"
                      name="vadThreshold"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={formValues.vadThreshold}
                      onChange={handleChange}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Visual Feedback */}
              <div className="flex items-center justify-between mt-4 border-t pt-4">
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
              
              {/* Advanced Voice Settings */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={toggleAdvancedVoiceSettings}
                  className="flex items-center justify-between w-full text-sm font-medium"
                >
                  <span>Advanced Voice Settings</span>
                  {advancedVoiceSettingsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {advancedVoiceSettingsExpanded && (
                  <div className="mt-4 space-y-4">
                    {/* Keep Pre-processing Hooks */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="keepPreprocessingHooks" className="text-sm font-medium">
                          Keep Pre-processing Hooks in Voice Mode
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Apply pre-processing to voice inputs (may increase latency)
                        </p>
                      </div>
                      <button
                        type="button"
                        id="keepPreprocessingHooks"
                        onClick={() => setFormValues(prev => ({
                          ...prev,
                          keepPreprocessingHooks: !prev.keepPreprocessingHooks
                        }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          formValues.keepPreprocessingHooks ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                        )}
                        aria-pressed={formValues.keepPreprocessingHooks}
                      >
                        <span className="sr-only">
                          {formValues.keepPreprocessingHooks ? "Enabled" : "Disabled"}
                        </span>
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formValues.keepPreprocessingHooks ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                    
                    {/* Keep Post-processing Hooks */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="keepPostprocessingHooks" className="text-sm font-medium">
                          Keep Post-processing Hooks in Voice Mode
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Apply post-processing to voice responses (may increase latency)
                        </p>
                      </div>
                      <button
                        type="button"
                        id="keepPostprocessingHooks"
                        onClick={() => setFormValues(prev => ({
                          ...prev,
                          keepPostprocessingHooks: !prev.keepPostprocessingHooks
                        }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          formValues.keepPostprocessingHooks ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                        )}
                        aria-pressed={formValues.keepPostprocessingHooks}
                      >
                        <span className="sr-only">
                          {formValues.keepPostprocessingHooks ? "Enabled" : "Disabled"}
                        </span>
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formValues.keepPostprocessingHooks ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                    
                    {/* Preserve Voice History */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="preserveVoiceHistory" className="text-sm font-medium">
                          Preserve Voice Conversation History
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Keep voice interactions in chat history when switching to text
                        </p>
                      </div>
                      <button
                        type="button"
                        id="preserveVoiceHistory"
                        onClick={() => setFormValues(prev => ({
                          ...prev,
                          preserveVoiceHistory: !prev.preserveVoiceHistory
                        }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          formValues.preserveVoiceHistory ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                        )}
                        aria-pressed={formValues.preserveVoiceHistory}
                      >
                        <span className="sr-only">
                          {formValues.preserveVoiceHistory ? "Enabled" : "Disabled"}
                        </span>
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formValues.preserveVoiceHistory ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                    
                    {/* Automatic Voice Selection */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="automaticVoiceSelection" className="text-sm font-medium">
                          Automatic Voice Selection
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Choose appropriate voices based on bot personalities
                        </p>
                      </div>
                      <button
                        type="button"
                        id="automaticVoiceSelection"
                        onClick={() => setFormValues(prev => ({
                          ...prev,
                          automaticVoiceSelection: !prev.automaticVoiceSelection
                        }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          formValues.automaticVoiceSelection ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                        )}
                        aria-pressed={formValues.automaticVoiceSelection}
                      >
                        <span className="sr-only">
                          {formValues.automaticVoiceSelection ? "Enabled" : "Disabled"}
                        </span>
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formValues.automaticVoiceSelection ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between pt-6 border-t mt-8">
        <button
          type="button"
          onClick={handleResetChat}
          className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
        >
          Reset Chat
        </button>
        
        <div className="flex space-x-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
