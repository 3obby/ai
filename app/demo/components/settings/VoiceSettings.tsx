'use client';

import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent } from "@/app/shared/components/ui/card";
import { Separator } from "@/app/shared/components/ui/separator";
import { Badge } from "@/app/shared/components/ui/badge";
import { Label } from "@/app/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/shared/components/ui/select";
import { TbMicrophone, TbMicrophoneOff } from "react-icons/tb";
import { Companion } from "../../types/companions";

interface VoiceSettingsProps {
  companions: Companion[];
  activeCompanionId: string | null;
  setActiveCompanionId: (id: string | null) => void;
  isStreaming: boolean;
  handleStopStream?: () => void;
}

export default function VoiceSettings({
  companions,
  activeCompanionId,
  setActiveCompanionId,
  isStreaming,
  handleStopStream
}: VoiceSettingsProps) {
  return (
    <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Voice Settings</h2>
      <Separator />
      
      <div className="space-y-6 mt-4">
        <div className="space-y-2">
          <Label htmlFor="active-companion" className="text-base">Active Voice Companion</Label>
          <Select
            value={activeCompanionId || companions[0]?.id}
            onValueChange={(value) => setActiveCompanionId(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select companion for voice chat" />
            </SelectTrigger>
            <SelectContent>
              {companions.map(companion => (
                <SelectItem key={companion.id} value={companion.id}>
                  {companion.name} - {companion.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Select which AI companion will respond to your voice
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="voice-chat-control" className="text-base">Voice Chat Controls</Label>
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <Badge variant="destructive" className="animate-pulse">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Voice Chat</p>
                  {isStreaming ? (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleStopStream}
                      className="flex items-center gap-1"
                    >
                      <TbMicrophoneOff className="h-4 w-4" />
                      <span>Stop Voice Chat</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex items-center gap-1"
                      disabled={true}
                    >
                      <TbMicrophone className="h-4 w-4" />
                      <span>Start Voice Chat</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isStreaming 
                    ? "Voice chat is currently active. Changing settings will end the current voice session." 
                    : "Use the microphone button in the chat to start a voice session."}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <p className="text-xs text-muted-foreground mt-2">
            Voice chat uses WebRTC to securely connect to OpenAI's Realtime API. 
            Configure each companion's voice settings in their individual settings panels.
          </p>
        </div>
      </div>
    </div>
  );
} 