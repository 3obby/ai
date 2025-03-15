'use client';

import { Button } from "@/app/shared/components/ui/button";
import { Separator } from "@/app/shared/components/ui/separator";
import { Label } from "@/app/shared/components/ui/label";
import { Input } from "@/app/shared/components/ui/input";
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
import { Textarea } from "@/app/shared/components/ui/textarea";
import { AISettings } from "../../types/settings";
import { RefreshCw } from "lucide-react";

interface AISettingsComponentProps {
  settings: AISettings;
  updateSettings: (settings: Partial<AISettings>) => void;
  restartChat: () => void;
}

export default function AISettingsComponent({
  settings,
  updateSettings,
  restartChat
}: AISettingsComponentProps) {
  return (
    <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
      <h2 className="text-xl font-semibold">AI Settings</h2>
      <Separator />
      
      <div className="space-y-6 mt-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="response-speed" className="text-base">Response Speed</Label>
            <span className="text-sm text-muted-foreground">{settings.responseSpeed || 5}/10</span>
          </div>
          <Slider
            id="response-speed"
            min={1}
            max={10}
            step={1}
            value={[settings.responseSpeed || 5]}
            onValueChange={(value) => updateSettings({ responseSpeed: value[0] })}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Controls how quickly companions respond to messages.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="all-respond"
            checked={settings.allRespond || false}
            onCheckedChange={(value) => updateSettings({ allRespond: value })}
          />
          <Label htmlFor="all-respond" className="text-base">All companions respond to every message</Label>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="model-params">
            <AccordionTrigger>Model Parameters</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-base">Model</Label>
                <Select
                  value={settings.model || 'gpt-4o'}
                  onValueChange={(value) => updateSettings({ model: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The model to use for generating responses
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="temperature" className="text-base">Temperature</Label>
                  <span className="text-sm text-muted-foreground">{settings.temperature || 0.8}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={[settings.temperature || 0.8]}
                  onValueChange={(value) => updateSettings({ temperature: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Controls randomness in outputs (higher = more creative)
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="top-p" className="text-base">Top P</Label>
                  <span className="text-sm text-muted-foreground">{settings.topP || 1.0}</span>
                </div>
                <Slider
                  id="top-p"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={[settings.topP || 1.0]}
                  onValueChange={(value) => updateSettings({ topP: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Controls diversity of outputs
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="freq-penalty" className="text-base">Frequency Penalty</Label>
                  <span className="text-sm text-muted-foreground">{settings.frequencyPenalty || 0}</span>
                </div>
                <Slider
                  id="freq-penalty"
                  min={-2.0}
                  max={2.0}
                  step={0.1}
                  value={[settings.frequencyPenalty || 0]}
                  onValueChange={(value) => updateSettings({ frequencyPenalty: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Reduces repetition of token sequences
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="pres-penalty" className="text-base">Presence Penalty</Label>
                  <span className="text-sm text-muted-foreground">{settings.presencePenalty || 0}</span>
                </div>
                <Slider
                  id="pres-penalty"
                  min={-2.0}
                  max={2.0}
                  step={0.1}
                  value={[settings.presencePenalty || 0]}
                  onValueChange={(value) => updateSettings({ presencePenalty: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Increases likelihood of discussing new topics
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-tokens" className="text-base">Max Response Tokens</Label>
                <Select
                  value={String(settings.maxResponseTokens || 'inf')}
                  onValueChange={(value) => updateSettings({ maxResponseTokens: value === 'inf' ? 'inf' : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select max tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inf">Unlimited</SelectItem>
                    <SelectItem value="512">512 tokens</SelectItem>
                    <SelectItem value="1024">1024 tokens</SelectItem>
                    <SelectItem value="2048">2048 tokens</SelectItem>
                    <SelectItem value="4096">4096 tokens</SelectItem>
                    <SelectItem value="8192">8192 tokens</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Maximum number of tokens in each response
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="system-message">
            <AccordionTrigger>System Message</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="system-message" className="text-base">System Message</Label>
                <Textarea
                  id="system-message"
                  placeholder="You are a helpful assistant in a group chat environment."
                  value={settings.systemMessage || "You are a helpful assistant in a group chat environment."}
                  onChange={(e) => updateSettings({ systemMessage: e.target.value })}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Base instructions provided to all companions in the chat
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="safety-settings">
            <AccordionTrigger>Safety Settings</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="moderation"
                  checked={settings.moderationEnabled || false}
                  onCheckedChange={(value) => updateSettings({ moderationEnabled: value })}
                />
                <Label htmlFor="moderation" className="text-base">Enable content moderation</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hate-filter" className="text-base">Hate Speech Filter</Label>
                <Select
                  value={settings.contentFiltering?.hate || 'medium'}
                  onValueChange={(value) => updateSettings({ 
                    contentFiltering: {
                      ...(settings.contentFiltering || {}),
                      hate: value as 'none' | 'low' | 'medium' | 'high'
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="self-harm-filter" className="text-base">Self-Harm Filter</Label>
                <Select
                  value={settings.contentFiltering?.selfHarm || 'medium'}
                  onValueChange={(value) => updateSettings({ 
                    contentFiltering: {
                      ...(settings.contentFiltering || {}),
                      selfHarm: value as 'none' | 'low' | 'medium' | 'high'
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sexual-filter" className="text-base">Sexual Content Filter</Label>
                <Select
                  value={settings.contentFiltering?.sexual || 'medium'}
                  onValueChange={(value) => updateSettings({ 
                    contentFiltering: {
                      ...(settings.contentFiltering || {}),
                      sexual: value as 'none' | 'low' | 'medium' | 'high'
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="violence-filter" className="text-base">Violence Filter</Label>
                <Select
                  value={settings.contentFiltering?.violence || 'medium'}
                  onValueChange={(value) => updateSettings({ 
                    contentFiltering: {
                      ...(settings.contentFiltering || {}),
                      violence: value as 'none' | 'low' | 'medium' | 'high'
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <Button onClick={restartChat} variant="outline" className="w-full mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Restart Chat
        </Button>
      </div>
    </div>
  );
} 