import React, { useState } from 'react';
import { useGroupChat } from '../../hooks/useGroupChat';
import { useVoiceActivity } from '../../hooks/useVoiceActivity';
import { cn } from '@/lib/utils';
import VoiceActivityIndicator from '../voice/VoiceActivityIndicator';

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

// Audio quality options
const AUDIO_QUALITY_OPTIONS = [
  { id: 'standard', name: 'Standard', description: 'Good quality, lower bandwidth' },
  { id: 'high', name: 'High', description: 'Better quality, moderate bandwidth' },
  { id: 'ultra', name: 'Ultra', description: 'Best quality, higher bandwidth' },
];

const VoiceSettingsPanel: React.FC = () => {
  const { state, updateSettings } = useGroupChat();
  const { sensitivity, mode, updateSensitivity, updateMode } = useVoiceActivity();
  
  // Local state for UI
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(
    state.settings?.ui?.enableVoice || false
  );
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [useCustomVoice, setUseCustomVoice] = useState(false);
  const [selectedCustomVoice, setSelectedCustomVoice] = useState<string>('custom-1');
  const [audioQuality, setAudioQuality] = useState<string>('high');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Handle voice toggle
  const handleVoiceToggle = () => {
    const newValue = !isVoiceEnabled;
    setIsVoiceEnabled(newValue);
    
    // Update global settings
    updateSettings({
      ui: {
        ...state.settings.ui,
        enableVoice: newValue,
      }
    });
  };
  
  // Handle sensitivity change
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    updateSensitivity(value);
  };
  
  // Handle VAD mode change
  const handleModeChange = (newMode: 'auto' | 'sensitive' | 'manual') => {
    updateMode(newMode);
  };
  
  // Handle voice selection
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
    
    // In a real implementation, we would update bot voice settings
    // This is a placeholder for that functionality
  };
  
  // Handle custom voice toggle
  const handleCustomVoiceToggle = () => {
    setUseCustomVoice(!useCustomVoice);
  };
  
  // Handle custom voice selection
  const handleCustomVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustomVoice(e.target.value);
  };
  
  // Handle voice speed change
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVoiceSpeed(value);
  };
  
  // Handle audio quality change
  const handleAudioQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAudioQuality(e.target.value);
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
          onClick={handleVoiceToggle}
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
                onClick={() => handleModeChange('auto')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  mode === 'auto'
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-200 dark:bg-neutral-800"
                )}
              >
                Auto
              </button>
              <button
                onClick={() => handleModeChange('sensitive')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  mode === 'sensitive'
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-200 dark:bg-neutral-800"
                )}
              >
                Sensitive
              </button>
              <button
                onClick={() => handleModeChange('manual')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  mode === 'manual'
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
          {mode !== 'manual' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sensitivity</label>
                <span className="text-xs text-neutral-500">{sensitivity.toFixed(1)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs">Low</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.1}
                  value={sensitivity}
                  onChange={handleSensitivityChange}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
                />
                <span className="text-xs">High</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs">Current:</span>
                <VoiceActivityIndicator size="sm" showLabel />
              </div>
            </div>
          )}
          
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
              <label className="text-sm font-medium">Default Voice</label>
              <select
                value={selectedVoice}
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
          
          {/* Voice Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Voice Speed</label>
              <span className="text-xs text-neutral-500">{voiceSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceSpeed}
              onChange={handleSpeedChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-700"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>
          
          {/* Advanced Settings Toggle */}
          <div className="pt-4">
            <button 
              onClick={toggleAdvancedSettings}
              className="text-sm text-primary hover:underline flex items-center"
            >
              <span>{showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={cn(
                  "w-4 h-4 ml-1 transition-transform", 
                  showAdvancedSettings ? "rotate-180" : ""
                )} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
          
          {/* Advanced Settings */}
          {showAdvancedSettings && (
            <div className="space-y-4 pt-2 pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
              {/* Audio Quality */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Audio Quality</label>
                <select
                  value={audioQuality}
                  onChange={handleAudioQualityChange}
                  className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                >
                  {AUDIO_QUALITY_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Noise Suppression */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Noise Suppression</label>
                  <p className="text-xs text-neutral-500">
                    Reduce background noise
                  </p>
                </div>
                <button
                  onClick={() => {}}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    "bg-primary"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      "translate-x-6"
                    )}
                  />
                </button>
              </div>
              
              {/* Echo Cancellation */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Echo Cancellation</label>
                  <p className="text-xs text-neutral-500">
                    Prevent audio feedback
                  </p>
                </div>
                <button
                  onClick={() => {}}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    "bg-primary"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      "translate-x-6"
                    )}
                  />
                </button>
              </div>
              
              {/* Auto Gain Control */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto Gain Control</label>
                  <p className="text-xs text-neutral-500">
                    Automatically adjust volume levels
                  </p>
                </div>
                <button
                  onClick={() => {}}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    "bg-primary"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      "translate-x-6"
                    )}
                  />
                </button>
              </div>
              
              {/* Test Voice */}
              <div className="pt-2">
                <button className="w-full py-2 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                  Test Voice Settings
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VoiceSettingsPanel; 