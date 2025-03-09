"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

import { ChatConfig, CHAT_CONFIG_TEMPLATES, TemplateCategoryType } from "@/types/chat-config";

interface ConfigContextType {
  configs: ChatConfig[];
  templates: ChatConfig[];
  activeConfig: ChatConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfigs: (companionId?: string, groupChatId?: string) => Promise<void>;
  createConfig: (config: ChatConfig) => Promise<ChatConfig | null>;
  updateConfig: (id: string, config: ChatConfig) => Promise<ChatConfig | null>;
  deleteConfig: (id: string) => Promise<boolean>;
  setActiveConfig: (config: ChatConfig | null) => void;
  applyTemplate: (templateType: TemplateCategoryType, companionId?: string, groupChatId?: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};

interface ConfigProviderProps {
  children: ReactNode;
  initialCompanionId?: string;
  initialGroupChatId?: string;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({
  children,
  initialCompanionId,
  initialGroupChatId,
}) => {
  const [configs, setConfigs] = useState<ChatConfig[]>([]);
  const [templates, setTemplates] = useState<ChatConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<ChatConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async (companionId?: string, groupChatId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (companionId) params.append("companionId", companionId);
      if (groupChatId) params.append("groupChatId", groupChatId);

      // Fetch user configs
      const userConfigsResponse = await axios.get(`/api/chat-config?${params.toString()}`);
      
      // Fetch template configs
      const templateConfigsResponse = await axios.get(`/api/chat-config?templateOnly=true`);
      
      setConfigs(userConfigsResponse.data.filter((config: ChatConfig) => !config.isTemplate));
      setTemplates(templateConfigsResponse.data);
      
      // Set active config to the most recent one that matches our criteria, if any
      const relevantConfigs = userConfigsResponse.data.filter((config: ChatConfig) => 
        (companionId ? config.companionId === companionId : true) && 
        (groupChatId ? config.groupChatId === groupChatId : true) &&
        !config.isTemplate
      );
      
      if (relevantConfigs.length > 0) {
        setActiveConfig(relevantConfigs[0]);
      } else {
        // If no existing config, create a default one
        const defaultTemplate = CHAT_CONFIG_TEMPLATES[TemplateCategoryType.CUSTOM];
        setActiveConfig({
          ...defaultTemplate,
          isTemplate: false,
          companionId: companionId || null,
          groupChatId: groupChatId || null,
        });
      }
    } catch (err) {
      console.error("Error fetching chat configs:", err);
      setError("Failed to load configurations");
      toast.error("Failed to load chat configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const createConfig = async (config: ChatConfig): Promise<ChatConfig | null> => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/chat-config", config);
      setConfigs((prev) => [response.data, ...prev]);
      setActiveConfig(response.data);
      toast.success("Configuration saved");
      return response.data;
    } catch (err) {
      console.error("Error creating chat config:", err);
      toast.error("Failed to save configuration");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (id: string, config: ChatConfig): Promise<ChatConfig | null> => {
    setIsLoading(true);
    try {
      const response = await axios.patch(`/api/chat-config/${id}`, config);
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? response.data : c))
      );
      if (activeConfig?.id === id) {
        setActiveConfig(response.data);
      }
      toast.success("Configuration updated");
      return response.data;
    } catch (err) {
      console.error("Error updating chat config:", err);
      toast.error("Failed to update configuration");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConfig = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await axios.delete(`/api/chat-config/${id}`);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      if (activeConfig?.id === id) {
        setActiveConfig(null);
      }
      toast.success("Configuration deleted");
      return true;
    } catch (err) {
      console.error("Error deleting chat config:", err);
      toast.error("Failed to delete configuration");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = (
    templateType: TemplateCategoryType,
    companionId?: string,
    groupChatId?: string
  ) => {
    const template = CHAT_CONFIG_TEMPLATES[templateType];
    setActiveConfig({
      ...template,
      isTemplate: false,
      companionId: companionId || null,
      groupChatId: groupChatId || null,
    });
  };

  // Load configs on initial mount
  useEffect(() => {
    fetchConfigs(initialCompanionId, initialGroupChatId);
  }, [initialCompanionId, initialGroupChatId]);

  const value: ConfigContextType = {
    configs,
    templates,
    activeConfig,
    isLoading,
    error,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    setActiveConfig,
    applyTemplate,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}; 