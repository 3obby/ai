'use client';

import { Button } from "@/app/shared/components/ui/button";
import { Label } from "@/app/shared/components/ui/label";
import { Slider } from "@/app/shared/components/ui/slider";
import { Separator } from "@/app/shared/components/ui/separator";
import { Bot } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/app/shared/components/ui/sheet";
import { ScrollArea } from "@/app/shared/components/ui/scroll-area";
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

import { Companion } from "../../types/companions";

interface CompanionSettingsProps {
  companion: Companion;
  updateCompanionConfig: (companionId: string, config: Partial<Companion>) => void;
}

export default function CompanionSettings({
  companion,
  updateCompanionConfig
}: CompanionSettingsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">{companion.name}</p>
              <p className="text-xs text-muted-foreground">{companion.role}</p>
            </div>
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit {companion.name}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="space-y-6 py-4 pr-4">
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
            
            {/* Voice Configuration Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Voice Settings</h3>
              <Separator />
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor={`${companion.id}-voice`}>Voice</Label>
                  <Select
                    value={companion.voiceConfig?.voice || 'sage'}
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
                  <Label htmlFor={`${companion.id}-vad`}>Voice Detection Sensitivity</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={companion.voiceConfig?.vadMode === 'auto' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            vadMode: 'auto'
                          }
                        });
                      }}
                    >
                      Normal
                    </Button>
                    <Button
                      type="button"
                      variant={companion.voiceConfig?.vadMode === 'sensitive' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            vadMode: 'sensitive'
                          }
                        });
                      }}
                    >
                      Sensitive
                    </Button>
                    <Button
                      type="button"
                      variant={companion.voiceConfig?.vadMode === 'manual' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            vadMode: 'manual'
                          }
                        });
                      }}
                    >
                      Manual
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`${companion.id}-modality`}>Response Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={companion.voiceConfig?.modality === 'both' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            modality: 'both'
                          }
                        });
                      }}
                    >
                      Text + Audio
                    </Button>
                    <Button
                      type="button"
                      variant={companion.voiceConfig?.modality === 'text' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            modality: 'text'
                          }
                        });
                      }}
                    >
                      Text Only
                    </Button>
                    <Button
                      type="button"
                      variant={companion.voiceConfig?.modality === 'audio' ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => {
                        updateCompanionConfig(companion.id, {
                          voiceConfig: {
                            ...companion.voiceConfig,
                            modality: 'audio'
                          }
                        });
                      }}
                    >
                      Audio Only
                    </Button>
                  </div>
                </div>
                
                <Accordion type="single" collapsible className="space-y-2">
                  <AccordionItem value="advanced-settings" className="border-none">
                    <AccordionTrigger className="py-2 px-0 hover:no-underline">
                      <span className="text-sm font-medium">Advanced Voice Settings</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {/* Temperature Control */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={`${companion.id}-temperature`}>
                            Temperature
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {companion.voiceConfig?.temperature?.toFixed(1) || '0.8'}
                          </span>
                        </div>
                        <Slider
                          id={`${companion.id}-temperature`}
                          min={0.6}
                          max={1.2}
                          step={0.1}
                          value={[companion.voiceConfig?.temperature || 0.8]}
                          onValueChange={(val) => {
                            updateCompanionConfig(companion.id, {
                              voiceConfig: {
                                ...companion.voiceConfig,
                                temperature: val[0]
                              }
                            });
                          }}
                        />
                      </div>
                      
                      {/* Turn Detection Threshold */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={`${companion.id}-threshold`}>
                            Voice Detection Threshold
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {companion.voiceConfig?.turnDetection?.threshold?.toFixed(1) || '0.5'}
                          </span>
                        </div>
                        <Slider
                          id={`${companion.id}-threshold`}
                          min={0.1}
                          max={0.9}
                          step={0.1}
                          value={[companion.voiceConfig?.turnDetection?.threshold || 0.5]}
                          onValueChange={(val) => {
                            updateCompanionConfig(companion.id, {
                              voiceConfig: {
                                ...companion.voiceConfig,
                                turnDetection: {
                                  ...companion.voiceConfig?.turnDetection,
                                  threshold: val[0]
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 