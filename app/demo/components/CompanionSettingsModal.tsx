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
import { 
  ALL_TOOLS, 
  BRAVE_SEARCH_TOOLS, 
  BRAVE_WEB_SEARCH_TOOL, 
  BRAVE_SUMMARIZER_TOOL,
  DEFAULT_TOOL_SETTINGS
} from "../types/tools";
import { Card } from "@/app/shared/components/ui/card";

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
  // Early return if companion is undefined
  if (!companion) {
    return null;
  }

  const [personality, setPersonality] = useState<Record<string, number>>(
    companion?.personality || {}
  );
  const [domainInterests, setDomainInterests] = useState<Record<string, number>>(
    companion?.domainInterests || {}
  );
  const [effort, setEffort] = useState<number>(companion?.effort || 0.5);
  const [voiceConfig, setVoiceConfig] = useState(companion?.voiceConfig || {});

  const handleSave = () => {
    updateCompanionConfig(companion.id, {
      personality,
      domainInterests,
      effort,
      voiceConfig,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center gap-3">
          <div className="flex items-center gap-4 mb-4">
            <ServerAvatar
              src={companion.avatar}
              alt={companion.name}
              className="h-10 w-10"
            />
            <div>
              <h3 className="text-lg font-semibold">{companion.name}</h3>
              <p className="text-sm text-muted-foreground">{companion.role}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Personality Traits */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Personality Traits</h3>
              <Separator />
              
              {Object.entries(personality).map(([trait, value]) => (
                <div key={trait} className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={trait}>
                      {trait.charAt(0).toUpperCase() + trait.slice(1)}
                    </Label>
                    <span className="text-sm text-muted-foreground">{value}/1</span>
                  </div>
                  <Slider
                    id={trait}
                    max={1}
                    step={0.1}
                    value={[value]}
                    onValueChange={(val) => {
                      setPersonality((prev) => ({
                        ...prev,
                        [trait]: val[0],
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Domain Interests */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Domain Interests</h3>
              <Separator />
              
              {Object.entries(domainInterests).map(([domain, value]) => (
                <div key={domain} className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={domain}>
                      {domain.charAt(0).toUpperCase() + domain.slice(1)}
                    </Label>
                    <span className="text-sm text-muted-foreground">{value}/1</span>
                  </div>
                  <Slider
                    id={domain}
                    max={1}
                    step={0.1}
                    value={[value]}
                    onValueChange={(val) => {
                      setDomainInterests((prev) => ({
                        ...prev,
                        [domain]: val[0],
                      }));
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
                  <Label htmlFor="effort">
                    Effort Level
                  </Label>
                  <span className="text-sm text-muted-foreground">{effort}/1</span>
                </div>
                <Slider
                  id="effort"
                  max={1}
                  step={0.1}
                  value={[effort]}
                  onValueChange={(val) => setEffort(val[0])}
                />
              </div>
            </div>
            
            {/* Voice Configuration */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Voice Configuration</h3>
              <Separator />
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="modality">Modality</Label>
                  <Select
                    value={voiceConfig.modality}
                    onValueChange={(value) =>
                      setVoiceConfig((prev) => ({ ...prev, modality: value as 'text' | 'voice' | 'both' | 'audio' }))
                    }
                  >
                    <SelectTrigger id="modality">
                      <SelectValue placeholder="Select modality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vadMode">VAD Mode</Label>
                  <Select
                    value={voiceConfig.vadMode}
                    onValueChange={(value) =>
                      setVoiceConfig((prev) => ({ ...prev, vadMode: value as 'auto' | 'manual' | 'hybrid' }))
                    }
                  >
                    <SelectTrigger id="vadMode">
                      <SelectValue placeholder="Select VAD mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="temperature">Temperature</Label>
                    <span className="text-sm text-muted-foreground">
                      {voiceConfig.temperature || 0}/1
                    </span>
                  </div>
                  <Slider
                    id="temperature"
                    max={1}
                    step={0.1}
                    value={[voiceConfig.temperature || 0]}
                    onValueChange={(val) =>
                      setVoiceConfig((prev) => ({ ...prev, temperature: val[0] }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Tool Calling Settings */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Tool Calling</h3>
              <Separator />
              
              <div className="space-y-4 mt-4">
                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id={`${companion.id}-tool-calling`}
                    checked={companion.toolCallingEnabled || 
                            (companion.toolSettings?.enabled !== undefined ? 
                             companion.toolSettings.enabled : 
                             companion.toolCallingEnabled || false)}
                    onCheckedChange={(value) => {
                      // Update both the legacy field and the new structure
                      updateCompanionConfig(companion.id, {
                        toolCallingEnabled: value,
                        toolSettings: {
                          enabled: value,
                          toolConfig: companion.toolSettings?.toolConfig || DEFAULT_TOOL_SETTINGS
                        }
                      });
                    }}
                  />
                  <Label htmlFor={`${companion.id}-tool-calling`} className="text-base">
                    Enable tool calling
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, this companion will have access to external tools like web search.
                </p>
                
                {(companion.toolCallingEnabled || (companion.toolSettings?.enabled ?? false)) && (
                  <div className="mt-4 space-y-4">
                    <h4 className="text-sm font-medium">Tool Configuration</h4>
                    
                    {/* Brave Search Tools Section */}
                    <Card className="p-4 space-y-3">
                      <h5 className="text-sm font-medium">Brave Search</h5>
                      <p className="text-xs text-muted-foreground">
                        Tools powered by the Brave Search API for retrieving information from the web.
                      </p>
                      
                      <div className="space-y-2 pt-1">
                        {/* Web Search Tool */}
                        <div className="flex items-center justify-between py-1">
                          <div className="space-y-0.5">
                            <Label className="text-sm">{BRAVE_WEB_SEARCH_TOOL.name}</Label>
                            <p className="text-xs text-muted-foreground">{BRAVE_WEB_SEARCH_TOOL.description}</p>
                          </div>
                          <Switch
                            id={`${companion.id}-${BRAVE_WEB_SEARCH_TOOL.id}`}
                            checked={companion.toolSettings?.toolConfig?.[BRAVE_WEB_SEARCH_TOOL.id] !== false}
                            onCheckedChange={(value) => {
                              updateCompanionConfig(companion.id, {
                                toolSettings: {
                                  enabled: companion.toolSettings?.enabled ?? companion.toolCallingEnabled ?? false,
                                  toolConfig: {
                                    ...(companion.toolSettings?.toolConfig || DEFAULT_TOOL_SETTINGS),
                                    [BRAVE_WEB_SEARCH_TOOL.id]: value
                                  }
                                }
                              });
                            }}
                          />
                        </div>
                        
                        {/* Summarizer Tool */}
                        <div className="flex items-center justify-between py-1">
                          <div className="space-y-0.5">
                            <Label className="text-sm">{BRAVE_SUMMARIZER_TOOL.name}</Label>
                            <p className="text-xs text-muted-foreground">{BRAVE_SUMMARIZER_TOOL.description}</p>
                          </div>
                          <Switch
                            id={`${companion.id}-${BRAVE_SUMMARIZER_TOOL.id}`}
                            checked={companion.toolSettings?.toolConfig?.[BRAVE_SUMMARIZER_TOOL.id] !== false}
                            onCheckedChange={(value) => {
                              updateCompanionConfig(companion.id, {
                                toolSettings: {
                                  enabled: companion.toolSettings?.enabled ?? companion.toolCallingEnabled ?? false,
                                  toolConfig: {
                                    ...(companion.toolSettings?.toolConfig || DEFAULT_TOOL_SETTINGS),
                                    [BRAVE_SUMMARIZER_TOOL.id]: value
                                  }
                                }
                              });
                            }}
                          />
                        </div>
                      </div>
                    </Card>
                    
                    {/* Other tool categories can be added here as they're implemented */}
                  </div>
                )}
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

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-gray-600 px-4 py-2 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 