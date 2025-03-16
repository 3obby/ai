'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/shared/components/ui/dialog";
import { Button } from "@/app/shared/components/ui/button";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import CompanionSettings from "./settings/CompanionSettings";
import VoiceSettings from "./settings/VoiceSettings";
import EnhancedVoiceSettings from "./settings/EnhancedVoiceSettings";
import APISettings from "./settings/APISettings";
import AISettings from "./settings/AISettings";
import ToolCallingSettings from "./settings/ToolCallingSettings";
import { Companion } from "../types/companions";
import { RealtimeAPISettings } from "../types/settings";

interface DemoSettingsDialogProps {
  companions: Companion[];
  selectedCompanion: Companion | null;
  activeCompanionId: string | null;
  updateCompanionConfig: (companionId: string, config: Partial<Companion>) => void;
  onVoiceSettingsChange: (companionId: string, settings: any) => void;
  onEnhancedVoiceSettingsChange: (settings: any) => void;
  onAPISettingsChange: (settings: RealtimeAPISettings) => void;
  onAISettingsChange: (settings: any) => void;
  onToolCallingSettingsChange: (settings: any) => void;
}

export function DemoSettingsDialog({
  companions,
  selectedCompanion,
  activeCompanionId,
  updateCompanionConfig,
  onVoiceSettingsChange,
  onEnhancedVoiceSettingsChange,
  onAPISettingsChange,
  onAISettingsChange,
  onToolCallingSettingsChange,
}: DemoSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure companions, voice, API keys, and other settings.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="companions" className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="companions">Companions</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="companions" className="mt-4">
            {selectedCompanion && (
              <CompanionSettings
                companion={selectedCompanion}
                updateCompanionConfig={updateCompanionConfig}
              />
            )}
          </TabsContent>
          <TabsContent value="voice" className="mt-4">
            <VoiceSettings
              companions={companions}
              activeCompanionId={activeCompanionId}
              onSettingsChange={onVoiceSettingsChange}
            />
          </TabsContent>
          <TabsContent value="enhanced" className="mt-4">
            <EnhancedVoiceSettings
              onSettingsChange={onEnhancedVoiceSettingsChange}
            />
          </TabsContent>
          <TabsContent value="api" className="mt-4">
            <APISettings
              onSettingsChange={onAPISettingsChange}
            />
          </TabsContent>
          <TabsContent value="ai" className="mt-4">
            <AISettings
              onSettingsChange={onAISettingsChange}
            />
          </TabsContent>
          <TabsContent value="tools" className="mt-4">
            <ToolCallingSettings
              onSettingsChange={onToolCallingSettingsChange}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 