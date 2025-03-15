'use client';

import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent } from "@/app/shared/components/ui/card";
import { Separator } from "@/app/shared/components/ui/separator";
import { Badge } from "@/app/shared/components/ui/badge";
import { Label } from "@/app/shared/components/ui/label";
import { Input } from "@/app/shared/components/ui/input";
import { Slider } from "@/app/shared/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/shared/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/app/shared/components/ui/accordion";
import { TbMicrophone, TbMicrophoneOff } from "react-icons/tb";
import { VoiceChatSettings } from "../../types/settings";

interface EnhancedVoiceSettingsProps {
  activeCompanionId: string | null;
  setActiveCompanionId: (id: string | null) => void;
  isStreaming: boolean;
  handleStopStream?: () => void;
  settings: VoiceChatSettings;
  updateSettings: (settings: Partial<VoiceChatSettings>) => void;
}

export default function EnhancedVoiceSettings({
  activeCompanionId,
  setActiveCompanionId,
  isStreaming,
  handleStopStream,
  settings,
  updateSettings
}: EnhancedVoiceSettingsProps) {
  return (
    <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Voice Settings</h2>
      <Separator />
      
      <div className="space-y-6 mt-4">
        <div className="space-y-2">
          <Label className="text-base">Companion Voice Settings</Label>
          <Card>
            <CardContent className="p-4 text-sm">
              <p>Companion-specific voice settings are now accessible directly from each companion in the chat.</p>
              <p className="text-xs text-muted-foreground mt-2">Click on a companion's avatar in the chat to access their voice settings.</p>
            </CardContent>
          </Card>
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

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="vad-settings">
            <AccordionTrigger>Voice Activity Detection (VAD)</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="vad-mode" className="text-base">VAD Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={settings.vadMode === 'auto' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateSettings({ vadMode: 'auto' })}
                  >
                    Normal
                  </Button>
                  <Button
                    type="button"
                    variant={settings.vadMode === 'sensitive' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateSettings({ vadMode: 'sensitive' })}
                  >
                    Sensitive
                  </Button>
                  <Button
                    type="button"
                    variant={settings.vadMode === 'manual' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateSettings({ vadMode: 'manual' })}
                  >
                    Manual
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Controls how voice chat detects when you're speaking
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="vad-threshold" className="text-base">VAD Sensitivity</Label>
                  <span className="text-sm text-muted-foreground">{settings.vadThreshold || 0.5}</span>
                </div>
                <Slider
                  id="vad-threshold"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={[settings.vadThreshold || 0.5]}
                  onValueChange={(value) => updateSettings({ vadThreshold: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Lower values make voice detection more sensitive (only for Auto mode)
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="prefix-padding" className="text-base">Prefix Padding (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.prefixPaddingMs || 300}</span>
                </div>
                <Slider
                  id="prefix-padding"
                  min={100}
                  max={1000}
                  step={50}
                  value={[settings.prefixPaddingMs || 300]}
                  onValueChange={(value) => updateSettings({ prefixPaddingMs: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Amount of audio to include before speech is detected
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="silence-duration" className="text-base">Silence Duration (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.silenceDurationMs || 500}</span>
                </div>
                <Slider
                  id="silence-duration"
                  min={200}
                  max={2000}
                  step={100}
                  value={[settings.silenceDurationMs || 500]}
                  onValueChange={(value) => updateSettings({ silenceDurationMs: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  How long to wait in silence before ending a voice segment
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="audio-settings">
            <AccordionTrigger>Audio Processing</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="audio-format" className="text-base">Audio Format</Label>
                <Select
                  value={settings.audioFormat || 'pcm16'}
                  onValueChange={(value) => updateSettings({ audioFormat: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audio format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcm16">PCM-16</SelectItem>
                    <SelectItem value="g711_ulaw">G.711 μ-law</SelectItem>
                    <SelectItem value="g711_alaw">G.711 A-law</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Audio encoding format for streaming
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sample-rate" className="text-base">Sample Rate (Hz)</Label>
                <Select
                  value={String(settings.sampleRate || 16000)}
                  onValueChange={(value) => updateSettings({ sampleRate: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sample rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8000">8000 Hz</SelectItem>
                    <SelectItem value="16000">16000 Hz</SelectItem>
                    <SelectItem value="24000">24000 Hz</SelectItem>
                    <SelectItem value="44100">44100 Hz</SelectItem>
                    <SelectItem value="48000">48000 Hz</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Audio sample rate in Hz
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="turn-detection">
            <AccordionTrigger>Turn Detection</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="turn-threshold" className="text-base">Turn Detection Threshold</Label>
                  <span className="text-sm text-muted-foreground">{settings.turnDetection?.threshold || 0.5}</span>
                </div>
                <Slider
                  id="turn-threshold"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={[settings.turnDetection?.threshold || 0.5]}
                  onValueChange={(value) => updateSettings({ 
                    turnDetection: {
                      ...(settings.turnDetection || {}),
                      threshold: value[0]
                    }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Threshold for detecting when your turn has ended
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="turn-prefix" className="text-base">Turn Prefix Padding (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.turnDetection?.prefixPaddingMs || 300}</span>
                </div>
                <Slider
                  id="turn-prefix"
                  min={100}
                  max={1000}
                  step={50}
                  value={[settings.turnDetection?.prefixPaddingMs || 300]}
                  onValueChange={(value) => updateSettings({ 
                    turnDetection: {
                      ...(settings.turnDetection || {}),
                      prefixPaddingMs: value[0]
                    }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Amount of audio to include before your turn
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="turn-silence" className="text-base">Turn Silence Duration (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.turnDetection?.silenceDurationMs || 500}</span>
                </div>
                <Slider
                  id="turn-silence"
                  min={200}
                  max={2000}
                  step={100}
                  value={[settings.turnDetection?.silenceDurationMs || 500]}
                  onValueChange={(value) => updateSettings({ 
                    turnDetection: {
                      ...(settings.turnDetection || {}),
                      silenceDurationMs: value[0]
                    }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  How long to wait in silence before ending your turn
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="voice-modality">
            <AccordionTrigger>Assistant Voice</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="default-voice" className="text-base">Default Voice</Label>
                <Select
                  value={settings.voice || 'sage'}
                  onValueChange={(value) => updateSettings({ voice: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="ash">Ash</SelectItem>
                    <SelectItem value="ballad">Ballad</SelectItem>
                    <SelectItem value="coral">Coral</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="sage">Sage</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                    <SelectItem value="verse">Verse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="response-modality" className="text-base">Response Modality</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={settings.modality === 'both' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateSettings({ modality: 'both' })}
                  >
                    Text & Voice
                  </Button>
                  <Button
                    type="button"
                    variant={settings.modality === 'text' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateSettings({ modality: 'text' })}
                  >
                    Text Only
                  </Button>
                  <Button
                    type="button"
                    variant={settings.modality === 'audio' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => updateSettings({ modality: 'audio' })}
                  >
                    Voice Only
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  How the assistant should respond in voice conversations
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
} 