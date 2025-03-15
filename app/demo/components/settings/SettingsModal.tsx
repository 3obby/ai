'use client';

import { ScrollArea } from "@/app/shared/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/app/shared/components/ui/dialog";
import { Settings, RefreshCw, Bot } from "lucide-react";
import { Button } from "@/app/shared/components/ui/button";
import { Separator } from "@/app/shared/components/ui/separator";
import { useState, useEffect } from "react";
import { useToast } from "@/app/shared/hooks/use-toast";

import EnhancedVoiceSettings from "./EnhancedVoiceSettings";
import AISettingsComponent from "./AISettings";
import ToolCallingSettingsComponent from "./ToolCallingSettings";
import APISettings from "./APISettings";
import { DemoSettings, DEFAULT_SETTINGS } from "../../types/settings";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  resetConfiguration: () => void;
  restartChat: () => void;
  responseSpeed: number;
  setResponseSpeed: (value: number) => void;
  allRespond: boolean;
  setAllRespond: (value: boolean) => void;
  isToolCallingEnabled: boolean;
  toggleToolCalling: () => void;
  activeCompanionId: string | null;
  setActiveCompanionId: (id: string | null) => void;
  isStreaming: boolean;
  handleStopStream?: () => void;
}

export default function SettingsModal({
  isOpen,
  onOpenChange,
  trigger,
  resetConfiguration,
  restartChat,
  responseSpeed,
  setResponseSpeed,
  allRespond,
  setAllRespond,
  isToolCallingEnabled,
  toggleToolCalling,
  activeCompanionId,
  setActiveCompanionId,
  isStreaming,
  handleStopStream
}: SettingsModalProps) {
  const { toast } = useToast();
  
  // Initialize with default settings but override with current prop values
  const [settings, setSettings] = useState<DemoSettings>({
    ...DEFAULT_SETTINGS,
    ai: {
      ...DEFAULT_SETTINGS.ai,
      responseSpeed,
      allRespond
    },
    toolCalling: {
      ...DEFAULT_SETTINGS.toolCalling,
      enabled: isToolCallingEnabled
    },
    voiceChat: {
      ...DEFAULT_SETTINGS.voiceChat
    }
  });

  // Update settings when props change
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        responseSpeed,
        allRespond
      },
      toolCalling: {
        ...prev.toolCalling,
        enabled: isToolCallingEnabled
      }
    }));
  }, [responseSpeed, allRespond, isToolCallingEnabled]);

  // Handle dialog open change - if streaming, warn and stop
  const handleOpenChange = (open: boolean) => {
    if (!open && isStreaming && handleStopStream) {
      handleStopStream();
      toast({
        title: "Voice chat ended",
        description: "Voice chat has been ended to allow settings changes",
      });
    }
    onOpenChange(open);
  };
  
  // Settings update handlers
  const updateAPISettings = (apiSettings: Partial<typeof settings.realtimeAPI>) => {
    setSettings(prev => ({
      ...prev,
      realtimeAPI: {
        ...prev.realtimeAPI,
        ...apiSettings
      }
    }));
  };
  
  const updateVoiceSettings = (voiceSettings: Partial<typeof settings.voiceChat>) => {
    setSettings(prev => ({
      ...prev,
      voiceChat: {
        ...prev.voiceChat,
        ...voiceSettings
      }
    }));
  };
  
  const updateAISettings = (aiSettings: Partial<typeof settings.ai>) => {
    // Update both internal state and parent component state
    setSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        ...aiSettings
      }
    }));
    
    // Sync with parent component state where needed
    if (aiSettings.responseSpeed !== undefined) {
      setResponseSpeed(aiSettings.responseSpeed);
    }
    
    if (aiSettings.allRespond !== undefined) {
      setAllRespond(aiSettings.allRespond);
    }
  };
  
  const updateToolCallingSettings = (toolSettings: Partial<typeof settings.toolCalling>) => {
    setSettings(prev => ({
      ...prev,
      toolCalling: {
        ...prev.toolCalling,
        ...toolSettings
      }
    }));
    
    // Sync with parent component state where needed
    if (toolSettings.enabled !== undefined && toolSettings.enabled !== isToolCallingEnabled) {
      toggleToolCalling();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Global Settings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-8 py-4">
            {/* AI Settings Section */}
            <AISettingsComponent 
              settings={settings.ai}
              updateSettings={updateAISettings}
              restartChat={restartChat}
            />
            
            {/* Voice Settings Section */}
            <EnhancedVoiceSettings
              activeCompanionId={activeCompanionId}
              setActiveCompanionId={setActiveCompanionId}
              isStreaming={isStreaming}
              handleStopStream={handleStopStream}
              settings={settings.voiceChat}
              updateSettings={updateVoiceSettings}
            />
            
            {/* Tool Calling Settings Section */}
            <ToolCallingSettingsComponent
              settings={settings.toolCalling}
              updateSettings={updateToolCallingSettings}
            />
            
            {/* API Settings Section */}
            <APISettings
              settings={settings.realtimeAPI}
              updateSettings={updateAPISettings}
            />
            
            <Button onClick={resetConfiguration} variant="outline" className="w-full mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset All Settings
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 