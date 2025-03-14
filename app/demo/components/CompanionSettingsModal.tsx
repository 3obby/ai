'use client';

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { ScrollArea } from "@/app/shared/components/ui/scroll-area";
import { Separator } from "@/app/shared/components/ui/separator";
import { Label } from "@/app/shared/components/ui/label";
import { Slider } from "@/app/shared/components/ui/slider";
import { Switch } from "@/app/shared/components/ui/switch";
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
import { Companion } from "../types/companions";
import { VoiceChatSettings, AISettings } from "../types/settings";
import { ServerAvatar } from "@/app/shared/components/ui/server-avatar";

interface CompanionSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companion: Companion;
  updateCompanionConfig: (companionId: string, config: Partial<Companion>) => void;
  globalVoiceSettings: VoiceChatSettings;
  globalAISettings: AISettings;
}

export default function CompanionSettingsModal({
  isOpen,
  onOpenChange,
  companion,
  updateCompanionConfig,
  globalVoiceSettings,
  globalAISettings
}: CompanionSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center gap-3">
          <ServerAvatar 
            src={companion.imageUrl}
            alt={companion.name}
            className="h-12 w-12"
          />
          <div>
            <DialogTitle>{companion.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{companion.role}</p>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Personality Traits */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Personality Traits</h3>
              <Separator />
              
              {Object.entries(companion.personality).map(([trait, value]) => (
                <div key={trait} className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`${companion.id}-${trait}`}>
                      {trait.charAt(0).toUpperCase() + trait.slice(1)}
                    </Label>
                    <span className="text-sm text-muted-foreground">{value}/10</span>
                  </div>
                  <Slider
                    id={`${companion.id}-${trait}`}
                    min={1}
                    max={10}
                    step={1}
                    value={[value]}
                    onValueChange={(val) => {
                      updateCompanionConfig(companion.id, {
                        personality: {
                          ...companion.personality,
                          [trait]: val[0]
                        }
                      });
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Domain Interests */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Domain Interests</h3>
              <Separator />
              
              {Object.entries(companion.domainInterests).map(([domain, value]) => (
                <div key={domain} className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`${companion.id}-${domain}`}>
                      {domain.charAt(0).toUpperCase() + domain.slice(1)}
                    </Label>
                    <span className="text-sm text-muted-foreground">{value}/10</span>
                  </div>
                  <Slider
                    id={`${companion.id}-${domain}`}
                    min={1}
                    max={10}
                    step={1}
                    value={[value]}
                    onValueChange={(val) => {
                      updateCompanionConfig(companion.id, {
                        domainInterests: {
                          ...companion.domainInterests,
                          [domain]: val[0]
                        }
                      });
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Response Effort */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Response Effort</h3>
              <Separator />
              
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`${companion.id}-effort`}>
                    Effort Level
                  </Label>
                  <span className="text-sm text-muted-foreground">{companion.effort}/10</span>
                </div>
                <Slider
                  id={`${companion.id}-effort`}
                  min={1}
                  max={10}
                  step={1}
                  value={[companion.effort]}
                  onValueChange={(val) => {
                    updateCompanionConfig(companion.id, {
                      effort: val[0]
                    });
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Higher effort results in more detailed responses but takes longer.
                </p>
              </div>
            </div>
            
            {/* Voice Configuration */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Voice Settings</h3>
              <Separator />
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor={`${companion.id}-voice`}>Voice</Label>
                  <Select
                    value={companion.voiceConfig?.voice || globalVoiceSettings.voice || 'sage'}
                    onValueChange={(value) => {
                      updateCompanionConfig(companion.id, {
                        voiceConfig: {
                          ...companion.voiceConfig,
                          voice: value as any
                        }
                      });
                    }}
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
                  <Label htmlFor={`${companion.id}-modality`}>Response Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div 
                      className={`px-3 py-2 rounded-md text-center text-sm cursor-pointer ${
                        (companion.voiceConfig?.modality || globalVoiceSettings.modality) === 'both' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            modality: 'both'
                          }
                        });
                      }}
                    >
                      Both
                    </div>
                    <div 
                      className={`px-3 py-2 rounded-md text-center text-sm cursor-pointer ${
                        (companion.voiceConfig?.modality || globalVoiceSettings.modality) === 'text' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            modality: 'text'
                          }
                        });
                      }}
                    >
                      Text
                    </div>
                    <div 
                      className={`px-3 py-2 rounded-md text-center text-sm cursor-pointer ${
                        (companion.voiceConfig?.modality || globalVoiceSettings.modality) === 'audio' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            modality: 'audio'
                          }
                        });
                      }}
                    >
                      Audio
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger>Advanced Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Temperature - Override Global */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={`${companion.id}-temperature`}>Temperature</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {companion.voiceConfig?.temperature !== undefined 
                              ? companion.voiceConfig.temperature 
                              : globalAISettings.temperature || 0.8}
                          </span>
                          {companion.voiceConfig?.temperature !== undefined && (
                            <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full">Custom</span>
                          )}
                        </div>
                      </div>
                      <Slider
                        id={`${companion.id}-temperature`}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        value={[companion.voiceConfig?.temperature !== undefined 
                          ? companion.voiceConfig.temperature 
                          : globalAISettings.temperature || 0.8]}
                        onValueChange={(val) => {
                          updateCompanionConfig(companion.id, {
                            voiceConfig: {
                              ...companion.voiceConfig,
                              temperature: val[0]
                            }
                          });
                        }}
                      />
                      <div className="flex justify-between">
                        <p className="text-xs text-muted-foreground">More precise</p>
                        <p className="text-xs text-muted-foreground">More creative</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 