import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS, DemoSettings } from '../types/settings';

export function useToolCalling() {
  const [isToolCallingEnabled, setIsToolCallingEnabled] = useState(true);
  const [settings, setSettings] = useState<DemoSettings>({
    ...DEFAULT_SETTINGS,
    toolCalling: {
      ...DEFAULT_SETTINGS.toolCalling,
      enabled: true,
      braveSearchApiKey: process.env.NEXT_PUBLIC_BRAVE_BASE_AI || ''
    }
  });

  const updateToolCallingSettings = (toolSettings: Partial<typeof settings.toolCalling>) => {
    setSettings(prev => ({
      ...prev,
      toolCalling: {
        ...prev.toolCalling,
        ...toolSettings
      }
    }));

    // Store Brave API key in localStorage if provided
    if (toolSettings.braveSearchApiKey) {
      localStorage.setItem('BRAVE_BASE_AI', toolSettings.braveSearchApiKey);
    }
  };

  // Load saved API key on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('BRAVE_BASE_AI');
    if (savedApiKey) {
      updateToolCallingSettings({ braveSearchApiKey: savedApiKey });
    }
  }, []);

  return {
    // State
    isToolCallingEnabled,
    settings,
    // State setters
    setIsToolCallingEnabled,
    setSettings,
    // Actions
    updateToolCallingSettings
  };
} 