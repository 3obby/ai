"use client";

import { useState, useEffect } from 'react';
import { 
  CompanionConfigType, 
  DEFAULT_PERSONALITY_CONFIG, 
  DEFAULT_KNOWLEDGE_CONFIG, 
  DEFAULT_INTERACTION_CONFIG, 
  DEFAULT_TOOL_CONFIG 
} from '@/types/companion';

export const useCompanionConfig = (companionId: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<CompanionConfigType>({
    personality: DEFAULT_PERSONALITY_CONFIG,
    knowledge: DEFAULT_KNOWLEDGE_CONFIG,
    interaction: DEFAULT_INTERACTION_CONFIG,
    tools: DEFAULT_TOOL_CONFIG
  });

  // Fetch the current configuration when companionId changes
  useEffect(() => {
    const fetchConfig = async () => {
      if (!companionId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/companion/${companionId}/config`);
        
        if (!response.ok) {
          throw new Error(`Error fetching configuration: ${response.statusText}`);
        }
        
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error('Failed to fetch companion config:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch companion configuration');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfig();
  }, [companionId]);

  // Function to update the configuration
  const updateConfig = async (newConfig: CompanionConfigType) => {
    if (!companionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/companion/${companionId}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });
      
      if (!response.ok) {
        throw new Error(`Error updating configuration: ${response.statusText}`);
      }
      
      setConfig(newConfig);
      return true;
    } catch (err) {
      console.error('Failed to update companion config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update companion configuration');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Functions to update specific parts of the configuration
  const updatePersonality = (personality: typeof config.personality) => {
    setConfig(prev => ({ ...prev, personality }));
  };
  
  const updateKnowledge = (knowledge: typeof config.knowledge) => {
    setConfig(prev => ({ ...prev, knowledge }));
  };
  
  const updateInteraction = (interaction: typeof config.interaction) => {
    setConfig(prev => ({ ...prev, interaction }));
  };
  
  const updateTools = (tools: typeof config.tools) => {
    setConfig(prev => ({ ...prev, tools }));
  };

  // Function to save all changes
  const saveAllChanges = async () => {
    return await updateConfig(config);
  };

  return {
    config,
    isLoading,
    error,
    updatePersonality,
    updateKnowledge,
    updateInteraction,
    updateTools,
    saveAllChanges
  };
}; 