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
  const [activeTab, setActiveTab] = useState('identity');
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
        enableReprocessing: bot.enableReprocessing,
        reprocessingCriteria: bot.reprocessingCriteria || '',
        reprocessingInstructions: bot.reprocessingInstructions || ''
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
        <div className="flex border-b overflow-x-auto">
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'identity' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('identity')}
          >
            Identity
          </button>
          <button
            type="button"
            className={`px-4 py-2 ${activeTab === 'model' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('model')}
          >
            Model
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
        
        {/* Identity Tab */}
        {activeTab === 'identity' && (
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

              <label className="block text-sm font-medium">
                System Prompt
                <textarea
                  name="systemPrompt"
                  value={formValues.systemPrompt || ''}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 w-full p-2 border rounded-md bg-background"
                />
                <span className="text-xs text-muted-foreground">
                  Core instructions that define this bot's personality and capabilities
                </span>
              </label>
            </div>
          </div>
        )}
        
        {/* Model Tab */}
        {activeTab === 'model' && (
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
                <span className="text-xs text-muted-foreground">
                  Maximum number of tokens (words/characters) in each response
                </span>
              </label>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="enabled"
                  name="enabled"
                  checked={formValues.enabled}
                  onChange={handleChange}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor="enabled" className="ml-2 text-sm font-medium">
                  Bot Enabled
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Processing Tab */}
        {activeTab === 'processing' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Processing Settings</h3>
            
            <div className="p-3 bg-muted/10 rounded-md space-y-3">
              <h4 className="text-sm font-medium">Pre-Processing</h4>
              
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="has-preprocessing"
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
                        preProcessingPrompt: 'Process the user input by: \n1. Analyzing key points\n2. Identifying main questions or requests'
                      }));
                    }
                  }}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor="has-preprocessing" className="ml-2 text-sm">
                  Enable Pre-Processing
                </label>
              </div>
              
              {formValues.preProcessingPrompt && (
                <div>
                  <label className="block text-sm font-medium">
                    Pre-Processing Instructions
                    <textarea
                      name="preProcessingPrompt"
                      value={formValues.preProcessingPrompt || ''}
                      onChange={handleChange}
                      rows={3}
                      className="mt-1 w-full p-2 border rounded-md bg-background"
                    />
                    <span className="text-xs text-muted-foreground">
                      Instructions for processing user messages before they reach the bot
                    </span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-muted/10 rounded-md space-y-3">
              <h4 className="text-sm font-medium">Post-Processing</h4>
              
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="has-postprocessing"
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
                        postProcessingPrompt: 'Refine the bot response by:\n1. Improving clarity and tone\n2. Ensuring accuracy\n3. Removing redundancy'
                      }));
                    }
                  }}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor="has-postprocessing" className="ml-2 text-sm">
                  Enable Post-Processing
                </label>
              </div>
              
              {formValues.postProcessingPrompt && (
                <div>
                  <label className="block text-sm font-medium">
                    Post-Processing Instructions
                    <textarea
                      name="postProcessingPrompt"
                      value={formValues.postProcessingPrompt || ''}
                      onChange={handleChange}
                      rows={3}
                      className="mt-1 w-full p-2 border rounded-md bg-background"
                    />
                    <span className="text-xs text-muted-foreground">
                      Instructions for processing bot responses before displaying to the user
                    </span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-muted/10 rounded-md space-y-3">
              <h4 className="text-sm font-medium">Reprocessing</h4>
              
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="enableReprocessing"
                  name="enableReprocessing"
                  checked={formValues.enableReprocessing && !!formValues.reprocessingCriteria}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setFormValues(prev => ({
                        ...prev,
                        enableReprocessing: false,
                        reprocessingCriteria: ''
                      }));
                    } else {
                      setFormValues(prev => ({
                        ...prev,
                        enableReprocessing: true,
                        reprocessingCriteria: prev.reprocessingCriteria || 'The response is vague or lacks specific details.',
                        reprocessingInstructions: prev.reprocessingInstructions || 'Please be more specific and provide concrete examples.'
                      }));
                    }
                  }}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor="enableReprocessing" className="ml-2 text-sm font-medium">
                  Enable Reprocessing
                </label>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, the bot's final response proposal will be evaluated against specified criteria and regenerated if needed
              </p>
              
              {formValues.enableReprocessing && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Try this again if...
                      <textarea
                        name="reprocessingCriteria"
                        value={formValues.reprocessingCriteria || ''}
                        onChange={(e) => {
                          const criteria = e.target.value;
                          setFormValues(prev => ({
                            ...prev,
                            reprocessingCriteria: criteria,
                            // Automatically disable reprocessing if criteria is empty
                            enableReprocessing: criteria.trim().length > 0
                          }));
                        }}
                        rows={2}
                        placeholder="E.g.: The response is vague or lacks specific details"
                        className="mt-1 w-full p-2 border rounded-md bg-background"
                      />
                      <span className="text-xs text-muted-foreground">
                        Define specific criteria that will trigger a response to be regenerated. A fresh GPT instance will evaluate if the response meets these criteria.
                      </span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium">
                      Reprocessing Instructions
                      <textarea
                        name="reprocessingInstructions"
                        value={formValues.reprocessingInstructions || ''}
                        onChange={(e) => {
                          const instructions = e.target.value;
                          setFormValues(prev => ({
                            ...prev,
                            reprocessingInstructions: instructions
                          }));
                        }}
                        rows={2}
                        placeholder="E.g.: Please be more specific and provide concrete examples"
                        className="mt-1 w-full p-2 border rounded-md bg-background"
                      />
                      <span className="text-xs text-muted-foreground">
                        Additional instructions to include when reprocessing. These will be combined with the original prompt to guide the improved response.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Tool Access</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useTools"
                  name="useTools"
                  checked={formValues.useTools}
                  onChange={handleChange}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor="useTools" className="ml-2 text-sm font-medium">
                  Enable Tool Usage
                </label>
              </div>
            </div>
            
            {formValues.useTools && (
              <div className="space-y-4 mt-4">
                {availableTools.map(tool => (
                  <div 
                    key={tool.id} 
                    className="p-3 border rounded-md bg-muted/5 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Wrench className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <h4 className="text-sm font-medium">{tool.name}</h4>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`tool-${tool.id}`}
                          checked={tool.isEnabled}
                          onChange={() => handleToolSelection(tool.id)}
                          className="h-4 w-4 rounded-sm border-gray-300"
                        />
                        <label htmlFor={`tool-${tool.id}`} className="ml-2 text-sm cursor-pointer">
                          {tool.isEnabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>
                    </div>
                    
                    {tool.isEnabled && (
                      <div className="mt-3 pl-6 border-l-2 border-primary/20">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium">
                            Usage Frequency
                            <select
                              value={tool.settings.usageFrequency}
                              onChange={(e) => handleToolSettingChange(
                                tool.id,
                                'usageFrequency',
                                e.target.value as 'always' | 'keywords' | 'uncertainty'
                              )}
                              className="mt-1 w-full p-1.5 border rounded-md bg-background text-xs"
                            >
                              <option value="always">Always Available</option>
                              <option value="keywords">When Specific Keywords Present</option>
                              <option value="uncertainty">Only When Uncertain</option>
                            </select>
                          </label>
                          
                          {tool.settings.usageFrequency === 'keywords' && (
                            <label className="block text-xs font-medium">
                              Trigger Keywords
                              <input
                                type="text"
                                value={tool.settings.keywords}
                                onChange={(e) => handleToolSettingChange(
                                  tool.id,
                                  'keywords',
                                  e.target.value
                                )}
                                placeholder="search, find, lookup, information"
                                className="mt-1 w-full p-1.5 border rounded-md bg-background text-xs"
                              />
                              <span className="text-xs text-muted-foreground">
                                Comma-separated list of keywords that will trigger this tool
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
} 