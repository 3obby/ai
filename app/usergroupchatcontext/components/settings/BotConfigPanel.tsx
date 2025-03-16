'use client';

import React, { useState, useEffect } from 'react';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { Bot } from '../../types';

interface BotConfigPanelProps {
  botId: string;
  onClose?: () => void;
}

export function BotConfigPanel({ botId, onClose }: BotConfigPanelProps) {
  const { getBot, updateBot } = useBotRegistry();
  const [formValues, setFormValues] = useState<Partial<Bot>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Load bot data when component mounts or botId changes
  useEffect(() => {
    const bot = getBot(botId);
    if (bot) {
      setFormValues({
        name: bot.name,
        description: bot.description,
        model: bot.model,
        systemPrompt: bot.systemPrompt,
        temperature: bot.temperature,
        maxTokens: bot.maxTokens,
        enabled: bot.enabled,
        useTools: bot.useTools
      });
      setIsLoading(false);
    }
  }, [botId, getBot]);
  
  // Handle form change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number' || name === 'temperature' || name === 'maxTokens') {
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
    
    updateBot(botId, formValues);
    
    if (onClose) {
      onClose();
    }
  };
  
  if (isLoading) {
    return <div className="p-4">Loading bot configuration...</div>;
  }
  
  return (
    <div className="p-4 bg-background rounded-lg max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Bot Configuration</h2>
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
        
        {/* Bot Identity */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Bot Identity</h3>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Name
              <input
                type="text"
                name="name"
                value={formValues.name || ''}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md bg-background"
                required
              />
            </label>
            
            <label className="block text-sm font-medium">
              Description
              <textarea
                name="description"
                value={formValues.description || ''}
                onChange={handleChange}
                rows={2}
                className="mt-1 w-full p-2 border rounded-md bg-background"
              />
            </label>
          </div>
        </div>
        
        {/* Model Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Model Settings</h3>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Model
              <select
                name="model"
                value={formValues.model || ''}
                onChange={handleChange}
                className="mt-1 w-full p-2 border rounded-md bg-background"
                required
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            </label>
            
            <label className="block text-sm font-medium">
              Temperature
              <input
                type="range"
                name="temperature"
                value={formValues.temperature || 0}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.1"
                className="mt-1 w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 - More precise</span>
                <span>{formValues.temperature?.toFixed(1)}</span>
                <span>1 - More creative</span>
              </div>
            </label>
            
            <label className="block text-sm font-medium">
              Max Tokens
              <input
                type="number"
                name="maxTokens"
                value={formValues.maxTokens || 0}
                onChange={handleChange}
                min="100"
                max="32000"
                className="mt-1 w-full p-2 border rounded-md bg-background"
              />
            </label>
          </div>
        </div>
        
        {/* System Prompt */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">System Prompt</h3>
          
          <div>
            <textarea
              name="systemPrompt"
              value={formValues.systemPrompt || ''}
              onChange={handleChange}
              rows={6}
              className="w-full p-2 border rounded-md bg-background font-mono text-sm"
              placeholder="Enter a system prompt to define the bot's behavior and persona..."
            />
          </div>
        </div>
        
        {/* Features */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Features</h3>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={formValues.enabled}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="enabled" className="text-sm cursor-pointer">
                Bot is enabled
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useTools"
                name="useTools"
                checked={formValues.useTools}
                onChange={handleChange}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="useTools" className="text-sm cursor-pointer">
                Enable tool usage
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
            Save Bot
          </button>
        </div>
      </form>
    </div>
  );
} 