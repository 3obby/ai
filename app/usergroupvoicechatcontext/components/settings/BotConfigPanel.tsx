'use client';

import React, { useState, useEffect } from 'react';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import { Bot } from '../../types';
import { Wrench } from 'lucide-react';

interface BotConfigPanelProps {
  botId: string;
  onClose?: () => void;
}

export function BotConfigPanel({ botId, onClose }: BotConfigPanelProps) {
  const { state, dispatch, getBot } = useBotRegistry();
  const [formValues, setFormValues] = useState<Partial<Bot>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [availableTools, setAvailableTools] = useState([
    { 
      id: 'brave_search', 
      name: 'Brave Search', 
      description: 'Search the web for information using Brave Search',
      isEnabled: false,
      settings: {
        usageFrequency: 'always' as 'always' | 'keywords' | 'uncertainty',
        keywords: '',
        apiKey: 'ALREADY_CONFIGURED'
      }
    }
  ]);
  
  // Load bot data when component mounts or botId changes
  useEffect(() => {
    const bot = getBot(botId);
    if (bot) {
      setFormValues({
        name: bot.name,
        description: bot.description,
        model: bot.model,
        systemPrompt: bot.systemPrompt,
        preProcessingPrompt: bot.preProcessingPrompt || '',
        postProcessingPrompt: bot.postProcessingPrompt || '',
        temperature: bot.temperature,
        maxTokens: bot.maxTokens,
        enabled: bot.enabled,
        useTools: bot.useTools,
        enableReprocessing: bot.enableReprocessing
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
    
    // Update the bot using the dispatch function
    dispatch({
      type: 'UPDATE_BOT',
      payload: { 
        id: botId, 
        updates: formValues 
      }
    });
    
    if (onClose) {
      onClose();
    }
  };

  const handleToolSelection = (toolId: string) => {
    setAvailableTools(prev => 
      prev.map(tool => 
        tool.id === toolId 
          ? { ...tool, isEnabled: !tool.isEnabled } 
          : tool
      )
    );
  };
  
  const handleToolSettingChange = (
    toolId: string, 
    settingKey: string, 
    value: string | boolean
  ) => {
    setAvailableTools(prev => 
      prev.map(tool => 
        tool.id === toolId 
          ? { 
              ...tool, 
              settings: { 
                ...tool.settings, 
                [settingKey]: value 
              } 
            } 
          : tool
      )
    );
  };
  
  if (isLoading) {
    return <div className="p-4">Loading bot configuration...</div>;
  }
  
  return (
    <div className="p-4 bg-background rounded-lg max-h-[80vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Bot Configuration</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'processing' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('processing')}
          >
            Processing
          </button>
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'tools' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools
          </button>
        </div>
        
        {/* General Tab */}
        {activeTab === 'general' && (
          <>
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
              </div>
            </div>
          </>
        )}

        {/* Processing Tab */}
        {activeTab === 'processing' && (
          <>
            {/* Pre-processing Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Pre-processing</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enablePreProcessing"
                    name="enablePreProcessing"
                    checked={!!formValues.preProcessingPrompt}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setFormValues(prev => ({
                          ...prev,
                          preProcessingPrompt: ''
                        }));
                      } else {
                        setFormValues(prev => ({
                          ...prev,
                          preProcessingPrompt: 'Analyze the user query and rewrite it to be more precise and clear.'
                        }));
                      }
                    }}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="enablePreProcessing" className="text-sm cursor-pointer">
                    Enabled
                  </label>
                </div>
              </div>
              
              {!!formValues.preProcessingPrompt && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Pre-processing Prompt
                    <textarea
                      name="preProcessingPrompt"
                      value={formValues.preProcessingPrompt}
                      onChange={handleChange}
                      rows={4}
                      className="mt-1 w-full p-2 border rounded-md bg-background"
                      placeholder="Prompt for pre-processing user messages"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This prompt will be used to analyze and potentially modify user messages before they are sent to the model.
                    For example: "Analyze this message and improve clarity while keeping the original meaning."
                  </p>
                </div>
              )}
            </div>
            
            {/* Post-processing Settings */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Post-processing</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enablePostProcessing"
                    name="enablePostProcessing"
                    checked={!!formValues.postProcessingPrompt}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setFormValues(prev => ({
                          ...prev,
                          postProcessingPrompt: ''
                        }));
                      } else {
                        setFormValues(prev => ({
                          ...prev,
                          postProcessingPrompt: 'Improve this response by making it more clear, concise, and helpful.'
                        }));
                      }
                    }}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="enablePostProcessing" className="text-sm cursor-pointer">
                    Enabled
                  </label>
                </div>
              </div>
              
              {!!formValues.postProcessingPrompt && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Post-processing Prompt
                    <textarea
                      name="postProcessingPrompt"
                      value={formValues.postProcessingPrompt}
                      onChange={handleChange}
                      rows={4}
                      className="mt-1 w-full p-2 border rounded-md bg-background"
                      placeholder="Prompt for post-processing bot responses"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This prompt will be used to refine and improve bot responses before they are displayed to the user.
                    For example: "Improve this response by: 1) Ensuring accuracy 2) Removing repetition 3) Making the tone consistent."
                  </p>
                </div>
              )}
            </div>

            {/* Reprocessing Settings */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Response Reprocessing</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableReprocessing"
                    name="enableReprocessing"
                    checked={!!formValues.enableReprocessing}
                    onChange={(e) => {
                      setFormValues(prev => ({
                        ...prev,
                        enableReprocessing: e.target.checked
                      }));
                    }}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="enableReprocessing" className="text-sm cursor-pointer">
                    Enabled
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Reprocessing allows the bot to iteratively improve its responses when significant changes are made during post-processing. 
                  This can help with complex questions but may result in multiple responses to a single user message.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Reprocessing respects the global maximum reprocessing depth limit set in group settings.
                  When enabled, the bot may generate multiple successive responses if post-processing significantly changes the content.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Tool Configuration</h3>
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
              
              {formValues.useTools && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-md font-medium">Available Tools</h4>
                    </div>
                    
                    <div className="mt-2 border rounded-md divide-y max-h-60 overflow-y-auto">
                      {availableTools.map(tool => (
                        <div key={tool.id} className="p-2 space-y-2">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id={`tool-${tool.id}`}
                              checked={tool.isEnabled}
                              onChange={() => handleToolSelection(tool.id)}
                              className="mt-1 h-4 w-4"
                            />
                            <label htmlFor={`tool-${tool.id}`} className="flex-1 cursor-pointer">
                              <div className="flex items-center">
                                <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="font-medium">{tool.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {tool.description}
                              </p>
                            </label>
                          </div>
                          
                          {tool.isEnabled && (
                            <div className="pl-6 space-y-2 mt-2">
                              <div>
                                <label className="text-xs font-medium block mb-1">
                                  Usage Frequency
                                </label>
                                <select
                                  value={tool.settings.usageFrequency}
                                  onChange={(e) => handleToolSettingChange(
                                    tool.id, 
                                    'usageFrequency', 
                                    e.target.value
                                  )}
                                  className="w-full p-1 text-xs border rounded-md bg-background"
                                >
                                  <option value="always">Always use when appropriate</option>
                                  <option value="keywords">When specific keywords are detected</option>
                                  <option value="uncertainty">When the bot is uncertain about an answer</option>
                                </select>
                              </div>
                              
                              {tool.settings.usageFrequency === 'keywords' && (
                                <div>
                                  <label className="text-xs font-medium block mb-1">
                                    Trigger Keywords (comma separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={tool.settings.keywords}
                                    onChange={(e) => handleToolSettingChange(
                                      tool.id, 
                                      'keywords', 
                                      e.target.value
                                    )}
                                    placeholder="search, find, look up, etc."
                                    className="w-full p-1 text-xs border rounded-md bg-background"
                                  />
                                </div>
                              )}
                              
                              <div>
                                <label className="text-xs font-medium block mb-1">
                                  API Key
                                </label>
                                <div className="bg-muted/20 rounded p-1 text-xs text-muted-foreground">
                                  {tool.settings.apiKey === 'ALREADY_CONFIGURED' 
                                    ? 'API key is configured and ready to use' 
                                    : 'API key not configured'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
        
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