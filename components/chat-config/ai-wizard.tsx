"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useConfig } from "./config-provider";
import { 
  ChatConfig, 
  TemplateCategoryType, 
  ResponseOrderingType, 
  SessionPersistenceType, 
  InputConsiderationType 
} from "@/types/chat-config";

interface AIWizardProps {
  companionId?: string;
  groupChatId?: string;
}

export const AIWizard: React.FC<AIWizardProps> = ({
  companionId,
  groupChatId,
}) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<ChatConfig | null>(null);
  const { toast } = useToast();
  const { createConfig } = useConfig();

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const generateConfig = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please describe how you want your chat to behave.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, this would call an API endpoint that uses OpenAI
      // to generate a configuration based on the user's prompt
      const response = await fetch("/api/chat-config/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          companionId,
          groupChatId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate configuration");
      }

      const data = await response.json();
      setGeneratedConfig(data);
      
      toast({
        title: "Configuration generated",
        description: "Your AI-generated configuration is ready to use.",
      });
    } catch (error) {
      console.error("Error generating config:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate configuration. Please try again.",
        variant: "destructive",
      });
      
      // Fallback to a template if the API fails
      setGeneratedConfig({
        name: "AI-Generated Configuration",
        description: "Based on your description: " + prompt.substring(0, 50) + "...",
        isTemplate: false,
        dynamics: {
          responseOrdering: ResponseOrderingType.ROUND_ROBIN,
          sessionPersistence: SessionPersistenceType.PERSISTENT,
          typingIndicatorDelay: 1000,
          minResponseDelay: 500,
          maxResponseDelay: 2000,
        },
        inputHandling: {
          inputConsideration: InputConsiderationType.USER_ONLY,
          maxContextWindowSize: 10,
        },
        executionRules: {
          toolPermissions: [],
          computeIntensity: 5,
        },
        companionId,
        groupChatId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!generatedConfig) return;
    
    try {
      await createConfig(generatedConfig);
      setOpen(false);
      setPrompt("");
      setGeneratedConfig(null);
      
      toast({
        title: "Configuration saved",
        description: "Your AI-generated configuration has been saved.",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Save failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Wand2 className="h-4 w-4" />
        AI Wizard
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>AI Configuration Wizard</DialogTitle>
            <DialogDescription>
              Describe how you want your chat to behave, and our AI will generate a configuration for you.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Example: I want a chat where bots take turns responding, with a focus on creative brainstorming. The bots should be able to search the web and access my files. I want thorough responses even if they use more tokens."
              value={prompt}
              onChange={handlePromptChange}
              rows={5}
              className="resize-none"
              disabled={isLoading || !!generatedConfig}
            />
            
            {!generatedConfig && (
              <Button 
                onClick={generateConfig} 
                disabled={isLoading || !prompt.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Configuration
                  </>
                )}
              </Button>
            )}
            
            {generatedConfig && (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-2">{generatedConfig.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{generatedConfig.description}</p>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium">Response Ordering:</span>
                      <span className="text-xs ml-2">{generatedConfig.dynamics.responseOrdering.replace(/_/g, " ")}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium">Session Type:</span>
                      <span className="text-xs ml-2">{generatedConfig.dynamics.sessionPersistence.replace(/_/g, " ")}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium">Input Consideration:</span>
                      <span className="text-xs ml-2">{generatedConfig.inputHandling.inputConsideration.replace(/_/g, " ")}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium">Compute Intensity:</span>
                      <span className="text-xs ml-2">{generatedConfig.executionRules.computeIntensity}/10</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium">Tool Permissions:</span>
                      <span className="text-xs ml-2">
                        {generatedConfig.executionRules.toolPermissions?.length 
                          ? generatedConfig.executionRules.toolPermissions.map(t => t.replace(/_/g, " ")).join(", ") 
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOpen(false);
              setPrompt("");
              setGeneratedConfig(null);
            }}>
              Cancel
            </Button>
            {generatedConfig && (
              <Button onClick={handleSaveConfig}>
                Save Configuration
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 