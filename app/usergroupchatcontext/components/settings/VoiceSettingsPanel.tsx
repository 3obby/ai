import React, { useState, useEffect } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { cn } from '@/lib/utils';
import { VoiceActivityIndicator } from '../voice/VoiceActivityIndicator';
import { VoiceTransitionSettings } from './VoiceTransitionSettings';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { useVoiceState } from '../../hooks/useVoiceState';
import { VadMode, VoiceOption } from '../../types/voice';

// Voice sample options
const VOICE_OPTIONS = [
  { id: 'alloy', name: 'Alloy', description: 'Versatile, balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Soft, mellow voice' },
  { id: 'fable', name: 'Fable', description: 'Whimsical, animated voice' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, powerful voice' },
  { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, melodic voice' },
];

// Custom voice options (would be fetched from API in real implementation)
const CUSTOM_VOICE_OPTIONS = [
  { id: 'custom-1', name: 'Custom Voice 1', description: 'Your uploaded voice' },
  { id: 'custom-2', name: 'Custom Voice 2', description: 'Alternative custom voice' },
];

const VoiceSettingsPanel: React.FC = () => {
  const { fetchLatestVoiceModel } = useBotRegistry();
  
  // Use our new hooks for centralized state management
  const { 
    voiceSettings, 
    updateVoiceSettings, 
    isVoiceEnabled, 
    toggleVoiceEnabled,
    vadSettings 
  } = useVoiceSettings();
  
  const { currentState, isRecording } = useVoiceState();
  
  // Local state for UI
  const [useCustomVoice, setUseCustomVoice] = useState(false);
  const [selectedCustomVoice, setSelectedCustomVoice] = useState<string>('custom-1');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([
    { id: 'gpt-4o-realtime-preview', name: 'GPT-4o Realtime' },
    { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision' }
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
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
          ...availableModels.filter(m => m.id !== latestModel)
        ];
        
        setAvailableModels(updatedModels);
        
        // Also update the global settings
        updateVoiceSettings({ defaultVoiceModel: latestModel });
        
        console.log(`Loaded latest voice model: ${latestModel}`);
      } catch (error) {
        console.error('Failed to fetch latest voice model:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    // Only fetch if voice is enabled
    if (isVoiceEnabled) {
      getLatestVoiceModel();
    }
  }, [isVoiceEnabled, fetchLatestVoiceModel, availableModels, updateVoiceSettings]);
  
  // Handle custom voice toggle
  const handleCustomVoiceToggle = () => {
    setUseCustomVoice(!useCustomVoice);
  };
  
  // Handle custom voice selection
  const handleCustomVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustomVoice(e.target.value);
  };
  
  // Handle voice selection
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voice = e.target.value as VoiceOption;
    updateVoiceSettings({ defaultVoice: voice });
  };
  
  // Handle voice speed change
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateVoiceSettings({ speed: value });
  };
  
  // Handle model selection
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateVoiceSettings({ defaultVoiceModel: e.target.value });
  };
  
  // Toggle advanced settings
  const toggleAdvancedSettings = () => {
    setShowAdvancedSettings(!showAdvancedSettings);
  };
  
  return (
    <div className="space-y-6 p-4">
      <h3 className="text-lg font-medium">Voice Settings</h3>
      
      {/* Voice Enable/Disable */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Enable Voice</label>
          <p className="text-xs text-neutral-500">
            Toggle voice input and output
          </p>
        </div>
        <button
          onClick={toggleVoiceEnabled}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
            isVoiceEnabled 
              ? "bg-primary" 
              : "bg-neutral-300 dark:bg-neutral-700"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              isVoiceEnabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
      
      {/* Voice Settings (only shown if voice is enabled) */}
      {isVoiceEnabled && (
        <>
          {/* Voice Activity Detection Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice Detection Mode</label>
            <div className="flex space-x-2">
              <button
                onClick={() => vadSettings.updateMode('auto')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  vadSettings.mode === 'auto'
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-200 dark:bg-neutral-800"
                )}
              >
                Auto
              </button>
              <button
                onClick={() => vadSettings.updateMode('sensitive')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  vadSettings.mode === 'sensitive'
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-200 dark:bg-neutral-800"
                )}
              >
                Sensitive
              </button>
              <button
                onClick={() => vadSettings.updateMode('manual')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  vadSettings.mode === 'manual'
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-200 dark:bg-neutral-800"
                )}
              >
                Manual
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Auto: Standard sensitivity, Sensitive: Detect quiet speech, Manual: Button-controlled
            </p>
          </div>
          
          {/* Sensitivity Slider (not shown for manual mode) */}
          {vadSettings.mode !== 'manual' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sensitivity</label>
                <span className="text-xs text-neutral-500">{vadSettings.threshold.toFixed(1)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs">Low</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.1}
                  value={vadSettings.threshold}
                  onChange={(e) => vadSettings.updateThreshold(parseFloat(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                />
                <span className="text-xs">High</span>
              </div>
            </div>
          )}

          {/* Voice Model Selection */}
          <div className="space-y-2 pt-4">
            <label className="text-sm font-medium">Voice Model</label>
            <select
              value={voiceSettings.defaultVoiceModel || 'gpt-4o-realtime-preview'}
              onChange={handleModelChange}
              disabled={isLoadingModels || isRecording}
              className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
            >
              {isLoadingModels && (
                <option>Loading models...</option>
              )}
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              Select the AI model used for voice interactions
            </p>
          </div>
          
          {/* Custom Voice Toggle */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <label className="text-sm font-medium">Use Custom Voice</label>
              <p className="text-xs text-neutral-500">
                Use your own uploaded voice
              </p>
            </div>
            <button
              onClick={handleCustomVoiceToggle}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                useCustomVoice 
                  ? "bg-primary" 
                  : "bg-neutral-300 dark:bg-neutral-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  useCustomVoice ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          
          {/* Voice Selection (based on custom voice toggle) */}
          {useCustomVoice ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Voice</label>
              <select
                value={selectedCustomVoice}
                onChange={handleCustomVoiceChange}
                className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
              >
                {CUSTOM_VOICE_OPTIONS.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
              <div className="flex justify-end mt-1">
                <button className="text-xs text-primary hover:underline">
                  Upload New Voice
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice</label>
              <select
                value={voiceSettings.defaultVoice || 'alloy'}
                onChange={handleVoiceChange}
                className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
              >
                {VOICE_OPTIONS.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Voice Speed Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Voice Speed</label>
              <span className="text-xs text-neutral-500">{voiceSettings.speed || 1.0}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceSettings.speed || 1.0}
              onChange={handleSpeedChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>
          
          {/* Voice Transition Settings */}
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <VoiceTransitionSettings className="pt-2" />
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceSettingsPanel; 