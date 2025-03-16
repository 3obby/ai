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
import { Badge } from "@/app/shared/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/app/shared/components/ui/radio-group";
import { ToolCallingSettings } from "../../types/settings";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ToolCallingSettingsComponentProps {
  settings: ToolCallingSettings;
  updateSettings: (settings: Partial<ToolCallingSettings>) => void;
}

export default function ToolCallingSettingsComponent({
  settings,
  updateSettings
}: ToolCallingSettingsComponentProps) {
  // Local state for tool search
  const [toolSearch, setToolSearch] = useState("");
  
  // State for API key visibility
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Available tools (in a real implementation, these would be fetched from an API)
  const availableTools = [
    { id: 'brave_search', name: 'Brave Search', description: 'Search the web for information using Brave Search API' },
    { id: 'web_search', name: 'Web Search', description: 'Search the web for information' },
    { id: 'code_interpreter', name: 'Code Interpreter', description: 'Run code and return results' },
    { id: 'image_generator', name: 'Image Generator', description: 'Generate images from text prompts' },
    { id: 'data_analysis', name: 'Data Analysis', description: 'Analyze tabular data' },
    { id: 'knowledge_base', name: 'Knowledge Base', description: 'Search internal knowledge base' },
    { id: 'file_browser', name: 'File Browser', description: 'Browse and manage files' },
  ];
  
  // Filter tools based on search input
  const filteredTools = availableTools.filter(tool => 
    tool.name.toLowerCase().includes(toolSearch.toLowerCase()) || 
    tool.description.toLowerCase().includes(toolSearch.toLowerCase())
  );
  
  // Check if Brave Search is enabled
  const isBraveSearchEnabled = (settings.allowedTools || []).includes('brave_search');
  
  // Ensure Brave Search is enabled when tool calling is enabled
  useEffect(() => {
    if (settings.enabled && !isBraveSearchEnabled) {
      // If tool calling is enabled but Brave Search isn't in the allowed tools, add it
      const currentTools = settings.allowedTools || [];
      if (!currentTools.includes('brave_search')) {
        console.log('Automatically enabling Brave Search tool');
        updateSettings({ 
          allowedTools: [...currentTools, 'brave_search'] 
        });
      }
    }
  }, [settings.enabled, isBraveSearchEnabled, settings.allowedTools, updateSettings]);

  return (
    <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Tool Calling Settings</h2>
      <Separator />
      
      <div className="space-y-6 mt-4">
        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="tool-calling"
            checked={settings.enabled}
            onCheckedChange={(value) => updateSettings({ enabled: value })}
          />
          <Label htmlFor="tool-calling" className="text-base">Enable tool calling capability</Label>
        </div>
        
        <p className="text-xs text-muted-foreground">
          This enables the tool calling infrastructure. You'll still need to enable tool calling for individual companions in their settings.
        </p>
        
        {settings.enabled && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="tool-selection">
              <AccordionTrigger>Available Tools</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="tool-search" className="text-base">Search Tools</Label>
                  <Input
                    id="tool-search"
                    placeholder="Search for tools..."
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4 mt-2">
                  {filteredTools.map(tool => (
                    <div key={tool.id} className="flex items-center justify-between bg-background p-3 rounded-md">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tool.name}</span>
                          {(settings.allowedTools || []).includes(tool.id) && (
                            <Badge variant="secondary" className="text-xs">Enabled</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                      <Switch
                        checked={(settings.allowedTools || []).includes(tool.id)}
                        onCheckedChange={(checked) => {
                          const currentTools = settings.allowedTools || [];
                          const newTools = checked
                            ? [...currentTools, tool.id]
                            : currentTools.filter(id => id !== tool.id);
                          updateSettings({ allowedTools: newTools });
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Brave Search API key input if Brave Search is enabled */}
                {isBraveSearchEnabled && (
                  <div className="mt-4 p-3 space-y-3 bg-secondary/20 rounded-md">
                    <h3 className="font-medium text-sm">Brave Search Configuration</h3>
                    <p className="text-xs text-muted-foreground">
                      To enable Brave Search, provide a valid API key.
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="brave-search-api-key" className="text-sm">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="brave-search-api-key"
                          type={showApiKey ? "text" : "password"}
                          placeholder="Enter your Brave Search API key"
                          value={settings.braveSearchApiKey || ''}
                          onChange={(e) => updateSettings({ 
                            braveSearchApiKey: e.target.value 
                          })}
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="icon"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">{showApiKey ? 'Hide' : 'Show'} API key</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can also specify the API key in the URL using ?BRAVE_BASE_AI=your_key
                      </p>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="tool-config">
              <AccordionTrigger>Tool Call Configuration</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="max-tool-calls" className="text-base">Max Tool Calls</Label>
                    <span className="text-sm text-muted-foreground">{settings.maxToolCalls || 5}</span>
                  </div>
                  <Slider
                    id="max-tool-calls"
                    min={1}
                    max={20}
                    step={1}
                    value={[settings.maxToolCalls || 5]}
                    onValueChange={(value) => updateSettings({ maxToolCalls: value[0] })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of tool calls allowed per conversation
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="tool-call-timeout" className="text-base">Tool Call Timeout (ms)</Label>
                    <span className="text-sm text-muted-foreground">{settings.toolCallTimeout || 30000}</span>
                  </div>
                  <Slider
                    id="tool-call-timeout"
                    min={5000}
                    max={60000}
                    step={5000}
                    value={[settings.toolCallTimeout || 30000]}
                    onValueChange={(value) => updateSettings({ toolCallTimeout: value[0] })}
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to wait for a tool call to complete before timing out
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="response-format" className="text-base">Response Format</Label>
                  <RadioGroup 
                    id="response-format" 
                    value={settings.responseFormat || 'markdown'}
                    onValueChange={(value) => updateSettings({ 
                      responseFormat: value as 'json' | 'markdown' | 'text' 
                    })}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="json" id="json" />
                      <Label htmlFor="json" className="cursor-pointer">JSON</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="markdown" id="markdown" />
                      <Label htmlFor="markdown" className="cursor-pointer">Markdown</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="text" />
                      <Label htmlFor="text" className="cursor-pointer">Plain Text</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Format for tool call responses
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {!settings.enabled && (
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">
              Enable tool calling to allow companions to use external tools and APIs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 