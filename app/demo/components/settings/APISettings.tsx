'use client';

import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent } from "@/app/shared/components/ui/card";
import { Separator } from "@/app/shared/components/ui/separator";
import { Label } from "@/app/shared/components/ui/label";
import { Input } from "@/app/shared/components/ui/input";
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
import { Switch } from "@/app/shared/components/ui/switch";
import { Slider } from "@/app/shared/components/ui/slider";
import { RealtimeAPISettings } from "../../types/settings";
import { useState } from "react";

interface APISettingsProps {
  settings: RealtimeAPISettings;
  updateSettings: (settings: Partial<RealtimeAPISettings>) => void;
}

export default function APISettings({
  settings,
  updateSettings
}: APISettingsProps) {
  // Local state for handling input values
  const [apiEndpoint, setApiEndpoint] = useState(settings.apiEndpoint || '');
  const [apiVersion, setApiVersion] = useState(settings.apiVersion || '');
  
  // Handle endpoint input and update
  const handleEndpointChange = (value: string) => {
    setApiEndpoint(value);
  };
  
  const handleEndpointBlur = () => {
    if (apiEndpoint !== settings.apiEndpoint) {
      updateSettings({ apiEndpoint });
    }
  };
  
  // Handle version input and update
  const handleVersionChange = (value: string) => {
    setApiVersion(value);
  };
  
  const handleVersionBlur = () => {
    if (apiVersion !== settings.apiVersion) {
      updateSettings({ apiVersion });
    }
  };
  
  return (
    <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Real-time API Settings</h2>
      <Separator />
      
      <div className="space-y-6 mt-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="endpoint-settings">
            <AccordionTrigger>API Configuration</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="api-endpoint" className="text-base">API Endpoint</Label>
                <Input
                  id="api-endpoint"
                  placeholder="https://api.openai.com"
                  value={apiEndpoint}
                  onChange={(e) => handleEndpointChange(e.target.value)}
                  onBlur={handleEndpointBlur}
                />
                <p className="text-xs text-muted-foreground">
                  The OpenAI API endpoint for real-time transcription
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-version" className="text-base">API Version</Label>
                <Input
                  id="api-version"
                  placeholder="2023-03-01-alpha"
                  value={apiVersion}
                  onChange={(e) => handleVersionChange(e.target.value)}
                  onBlur={handleVersionBlur}
                />
                <p className="text-xs text-muted-foreground">
                  The API version to use for real-time functionality
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="connection-settings">
            <AccordionTrigger>Connection Settings</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="reconnect-attempts" className="text-base">Reconnect Attempts</Label>
                  <span className="text-sm text-muted-foreground">{settings.reconnectAttempts || 3}</span>
                </div>
                <Slider
                  id="reconnect-attempts"
                  min={1}
                  max={10}
                  step={1}
                  value={[settings.reconnectAttempts || 3]}
                  onValueChange={(value) => updateSettings({ reconnectAttempts: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of reconnection attempts if connection is lost
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="reconnect-interval" className="text-base">Reconnect Interval (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.reconnectInterval || 2000}</span>
                </div>
                <Slider
                  id="reconnect-interval"
                  min={1000}
                  max={10000}
                  step={500}
                  value={[settings.reconnectInterval || 2000]}
                  onValueChange={(value) => updateSettings({ reconnectInterval: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Time interval between reconnection attempts (milliseconds)
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="session-settings">
            <AccordionTrigger>Session Configuration</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="session-timeout" className="text-base">Session Timeout (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.sessionTimeout || 300000}</span>
                </div>
                <Slider
                  id="session-timeout"
                  min={60000}
                  max={1800000}
                  step={60000}
                  value={[settings.sessionTimeout || 300000]}
                  onValueChange={(value) => updateSettings({ sessionTimeout: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  How long a session can remain idle before timing out (milliseconds)
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="keep-alive" className="text-base">Keep-Alive Interval (ms)</Label>
                  <span className="text-sm text-muted-foreground">{settings.keepAliveInterval || 30000}</span>
                </div>
                <Slider
                  id="keep-alive"
                  min={10000}
                  max={60000}
                  step={5000}
                  value={[settings.keepAliveInterval || 30000]}
                  onValueChange={(value) => updateSettings({ keepAliveInterval: value[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  How frequently to send keep-alive messages (milliseconds)
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
} 