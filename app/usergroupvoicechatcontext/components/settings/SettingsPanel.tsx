'use client';

import React, { useState } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { X, Check, Mic, MessageSquare, Wrench, Users, Settings as SettingsIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  onClose: () => void;
  className?: string;
}

export function SettingsPanel({ onClose, className }: SettingsPanelProps) {
  const { state, dispatch } = useGroupChatContext();
  const { state: botState } = useBotRegistry();
  const [activeTab, setActiveTab] = useState('general');
  
  const updateSettings = (settings: Partial<typeof state.settings>) => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: settings
    });
  };
  
  const toggleBotActive = (botId: string) => {
    const currentActive = state.settings.activeBotIds || [];
    const isActive = currentActive.includes(botId);
    
    if (isActive) {
      updateSettings({
        activeBotIds: currentActive.filter(id => id !== botId)
      });
    } else {
      updateSettings({
        activeBotIds: [...currentActive, botId]
      });
    }
  };
  
  const toggleVoice = () => {
    updateSettings({
      ui: {
        ...state.settings.ui,
        enableVoice: !state.settings.ui?.enableVoice
      }
    });
  };
  
  // Render the tabs navigation
  const renderTabs = () => (
    <div className="flex border-b">
      <button
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 border-transparent",
          activeTab === 'general' ? "border-primary text-primary" : "text-muted-foreground"
        )}
        onClick={() => setActiveTab('general')}
      >
        <div className="flex items-center gap-1.5">
          <SettingsIcon className="h-4 w-4" />
          <span>General</span>
        </div>
      </button>
      
      <button
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 border-transparent",
          activeTab === 'voice' ? "border-primary text-primary" : "text-muted-foreground"
        )}
        onClick={() => setActiveTab('voice')}
      >
        <div className="flex items-center gap-1.5">
          <Mic className="h-4 w-4" />
          <span>Voice</span>
        </div>
      </button>
      
      <button
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 border-transparent",
          activeTab === 'bots' ? "border-primary text-primary" : "text-muted-foreground"
        )}
        onClick={() => setActiveTab('bots')}
      >
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>Bots</span>
        </div>
      </button>
      
      <button
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 border-transparent",
          activeTab === 'tools' ? "border-primary text-primary" : "text-muted-foreground"
        )}
        onClick={() => setActiveTab('tools')}
      >
        <div className="flex items-center gap-1.5">
          <Wrench className="h-4 w-4" />
          <span>Tools</span>
        </div>
      </button>
    </div>
  );
  
  // Render General Settings tab
  const renderGeneralSettings = () => (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Chat Name</h3>
        <input
          type="text"
          value={state.settings.name || ''}
          onChange={(e) => updateSettings({ name: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Group Chat Name"
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Response Mode</h3>
        <select
          value={state.settings.responseMode}
          onChange={(e) => updateSettings({ responseMode: e.target.value as any })}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="sequential">Sequential (one bot at a time)</option>
          <option value="parallel">Parallel (all bots at once)</option>
        </select>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Show Timestamps</span>
        <button
          onClick={() => updateSettings({ 
            ui: { ...state.settings.ui, showTimestamps: !state.settings.ui?.showTimestamps } 
          })}
          className={cn(
            "w-10 h-6 rounded-full relative",
            state.settings.ui?.showTimestamps ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
          )}
        >
          <span 
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
              state.settings.ui?.showTimestamps ? "translate-x-5" : "translate-x-1"
            )} 
          />
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Show Debug Info</span>
        <button
          onClick={() => updateSettings({ 
            ui: { ...state.settings.ui, showDebugInfo: !state.settings.ui?.showDebugInfo } 
          })}
          className={cn(
            "w-10 h-6 rounded-full relative",
            state.settings.ui?.showDebugInfo ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
          )}
        >
          <span 
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
              state.settings.ui?.showDebugInfo ? "translate-x-5" : "translate-x-1"
            )} 
          />
        </button>
      </div>
    </div>
  );
  
  // Render Voice Settings tab
  const renderVoiceSettings = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Enable Voice</span>
        <button
          onClick={toggleVoice}
          className={cn(
            "w-10 h-6 rounded-full relative",
            state.settings.ui?.enableVoice ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
          )}
        >
          <span 
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
              state.settings.ui?.enableVoice ? "translate-x-5" : "translate-x-1"
            )} 
          />
        </button>
      </div>
      
      {state.settings.ui?.enableVoice && (
        <>
          <div>
            <h3 className="text-sm font-medium mb-2">Default Voice</h3>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={'nova'}
              onChange={(e) => updateSettings({
                ui: { ...state.settings.ui, defaultVoice: e.target.value }
              })}
            >
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Voice Activity Detection</h3>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={'auto'}
              onChange={(e) => updateSettings({
                ui: { ...state.settings.ui, vadMode: e.target.value as 'auto' | 'sensitive' | 'manual' }
              })}
            >
              <option value="auto">Auto (recommended)</option>
              <option value="sensitive">Sensitive</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
  
  // Render Bot Settings tab
  const renderBotSettings = () => (
    <div className="p-4 space-y-2">
      <h3 className="text-sm font-medium mb-4">Active Bots</h3>
      
      {botState.availableBots.map(bot => (
        <div key={bot.id} className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mr-3">
              {bot.avatar ? (
                <img src={bot.avatar} alt={bot.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-medium">{bot.name[0]}</span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium">{bot.name}</h4>
              <p className="text-xs text-muted-foreground">{bot.description.substring(0, 40)}...</p>
            </div>
          </div>
          
          <button
            onClick={() => toggleBotActive(bot.id)}
            className={cn(
              "p-2 rounded-full",
              state.settings.activeBotIds?.includes(bot.id) 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {state.settings.activeBotIds?.includes(bot.id) ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
  
  // Render Tools Settings tab
  const renderToolsSettings = () => (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-4">Available Tools</h3>
      
      <div className="space-y-2 text-muted-foreground text-sm">
        <p>Coming soon: Tool configuration and management</p>
      </div>
    </div>
  );
  
  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'voice':
        return renderVoiceSettings();
      case 'bots':
        return renderBotSettings();
      case 'tools':
        return renderToolsSettings();
      default:
        return renderGeneralSettings();
    }
  };
  
  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-lg font-medium">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted"
          aria-label="Close settings"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {renderTabs()}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
} 