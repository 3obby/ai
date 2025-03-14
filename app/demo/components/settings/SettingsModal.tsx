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
import { Slider } from "@/app/shared/components/ui/slider";
import { Switch } from "@/app/shared/components/ui/switch";
import { Label } from "@/app/shared/components/ui/label";
import { useState } from "react";
import { useToast } from "@/app/shared/hooks/use-toast";

import CompanionSettings from "./CompanionSettings";
import VoiceSettings from "./VoiceSettings";
import { Companion } from "../../types/companions";

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  companions: Companion[];
  updateCompanionConfig: (companionId: string, config: Partial<Companion>) => void;
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
  companions,
  updateCompanionConfig,
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6">
          <div className="space-y-8 py-4">
            {/* Chat Settings Section */}
            <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Chat Settings</h2>
              <Separator />
              
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="response-speed" className="text-base">Response Speed</Label>
                    <span className="text-sm text-muted-foreground">{responseSpeed}/10</span>
                  </div>
                  <Slider
                    id="response-speed"
                    min={1}
                    max={10}
                    step={1}
                    value={[responseSpeed]}
                    onValueChange={(value) => setResponseSpeed(value[0])}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Controls how quickly companions respond to messages.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="all-respond"
                    checked={allRespond}
                    onCheckedChange={setAllRespond}
                  />
                  <Label htmlFor="all-respond" className="text-base">All companions respond to every message</Label>
                </div>
                
                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="tool-calling"
                    checked={isToolCallingEnabled}
                    onCheckedChange={toggleToolCalling}
                  />
                  <Label htmlFor="tool-calling" className="text-base">Enable tool calling for companions</Label>
                </div>
                
                <Button onClick={restartChat} variant="outline" className="w-full mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Chat
                </Button>
              </div>
            </div>
            
            {/* Voice Settings Section */}
            <VoiceSettings 
              companions={companions}
              activeCompanionId={activeCompanionId}
              setActiveCompanionId={setActiveCompanionId}
              isStreaming={isStreaming}
              handleStopStream={handleStopStream}
            />
            
            {/* Companions Section */}
            <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Companions</h2>
              <Separator />
              
              <div className="grid gap-4 mt-4">
                {companions.map((companion) => (
                  <CompanionSettings 
                    key={companion.id}
                    companion={companion}
                    updateCompanionConfig={updateCompanionConfig}
                  />
                ))}
              </div>
              
              <Button onClick={resetConfiguration} variant="outline" className="w-full mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset All Settings
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 