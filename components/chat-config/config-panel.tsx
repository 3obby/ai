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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Settings, Save, Trash2, PlusCircle, Copy, Brain, Wand2 } from "lucide-react";

import { useConfig } from "./config-provider";
import { AIWizard } from "./ai-wizard";
import {
  chatConfigSchema,
  ResponseOrderingType,
  SessionPersistenceType,
  InputConsiderationType,
  ToolPermissionType,
  TemplateCategoryType,
  ChatConfig,
} from "@/types/chat-config";

interface ConfigPanelProps {
  companionId?: string;
  groupChatId?: string;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  companionId,
  groupChatId,
}) => {
  const {
    activeConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    applyTemplate,
  } = useConfig();
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dynamics");
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  
  const form = useForm<ChatConfig>({
    resolver: zodResolver(chatConfigSchema),
    defaultValues: activeConfig || {
      name: "Default Configuration",
      description: "",
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
    },
  });
  
  // Update form when activeConfig changes
  React.useEffect(() => {
    if (activeConfig) {
      form.reset(activeConfig);
    }
  }, [activeConfig, form]);
  
  const handleSubmit = async (data: ChatConfig) => {
    try {
      if (activeConfig?.id) {
        await updateConfig(activeConfig.id, data);
      } else {
        await createConfig({
          ...data,
          companionId,
          groupChatId,
        });
      }
      setOpen(false);
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };
  
  const handleDelete = async () => {
    if (activeConfig?.id) {
      await deleteConfig(activeConfig.id);
      setOpen(false);
    }
  };
  
  const handleTemplateSelect = (templateType: TemplateCategoryType) => {
    applyTemplate(templateType, companionId, groupChatId);
    setTemplateSelectOpen(false);
    
    // Update the form with the new template
    const templateConfig = {
      ...activeConfig,
      isTemplate: false,
      companionId,
      groupChatId,
    };
    form.reset(templateConfig);
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-orange-500 hover:text-orange-600 hover:bg-orange-100/20"
      >
        <Settings className="h-4 w-4" />
        Chat
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chat Configuration</DialogTitle>
            <DialogDescription>
              Configure how this chat behaves, processes inputs, and responds.
            </DialogDescription>
          </DialogHeader>
          
          {showAIWizard ? (
            <div className="space-y-4">
              <AIWizard 
                companionId={companionId} 
                groupChatId={groupChatId} 
              />
              <Button
                variant="outline"
                onClick={() => setShowAIWizard(false)}
                className="mt-4"
              >
                Back to Manual Configuration
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic configuration */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Configuration name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional description" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Template selector and AI wizard buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Dialog open={templateSelectOpen} onOpenChange={setTemplateSelectOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="gap-2">
                          <Copy className="h-4 w-4" />
                          Apply Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select a Template</DialogTitle>
                          <DialogDescription>
                            Choose a pre-built configuration template to start with.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-4 py-4">
                          {Object.values(TemplateCategoryType).map((templateType) => (
                            <Button
                              key={templateType}
                              type="button"
                              variant="outline"
                              className="justify-start h-auto py-4 px-4"
                              onClick={() => handleTemplateSelect(templateType)}
                            >
                              <div className="flex flex-col items-start text-left">
                                <span className="text-lg font-semibold">
                                  {templateType.replace(/_/g, " ")}
                                </span>
                                <span className="text-sm text-muted-foreground mt-1">
                                  {getTemplateDescription(templateType)}
                                </span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => setShowAIWizard(true)}
                    >
                      <Wand2 className="h-4 w-4" />
                      AI Wizard
                    </Button>
                  </div>
                  
                  {/* Compute intensity slider */}
                  <div className="flex flex-col gap-2 flex-grow ml-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Thinking Power
                      </label>
                      <span className="text-sm">
                        {form.watch("executionRules.computeIntensity")} / 10
                      </span>
                    </div>
                    <FormField
                      control={form.control}
                      name="executionRules.computeIntensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Slider
                              min={1}
                              max={10}
                              step={1}
                              defaultValue={[field.value || 5]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Higher values = more thorough responses, but burn more tokens
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Configuration tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="dynamics">Chat Dynamics</TabsTrigger>
                    <TabsTrigger value="input">Input Handling</TabsTrigger>
                    <TabsTrigger value="rules">Execution Rules</TabsTrigger>
                  </TabsList>
                  
                  {/* Chat Dynamics Tab */}
                  <TabsContent value="dynamics" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="dynamics.responseOrdering"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Ordering</FormLabel>
                          <FormControl>
                            <Select
                              defaultValue={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select response order" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ResponseOrderingType.ROUND_ROBIN}>
                                  Round Robin (Each bot responds in turn)
                                </SelectItem>
                                <SelectItem value={ResponseOrderingType.CUSTOM_ORDER}>
                                  Custom Order (Define specific response order)
                                </SelectItem>
                                <SelectItem value={ResponseOrderingType.PARALLEL}>
                                  Parallel (All bots respond at once)
                                </SelectItem>
                                <SelectItem value={ResponseOrderingType.CONDITIONAL_BRANCHING}>
                                  Conditional (Responses depend on user input)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            How companion responses should be ordered in this chat
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dynamics.sessionPersistence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Persistence</FormLabel>
                          <FormControl>
                            <Select
                              defaultValue={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select persistence type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={SessionPersistenceType.PERSISTENT}>
                                  Persistent (Chat history is saved)
                                </SelectItem>
                                <SelectItem value={SessionPersistenceType.ONE_TIME}>
                                  One-time (Chat history is discarded)
                                </SelectItem>
                                <SelectItem value={SessionPersistenceType.SCHEDULED}>
                                  Scheduled (Runs on a specific schedule)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            How this chat session's data is persisted
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dynamics.typingIndicatorDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Typing Indicator (ms)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={5000}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dynamics.minResponseDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Response Delay (ms)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={5000}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dynamics.maxResponseDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Response Delay (ms)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={10000}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Input Handling Tab */}
                  <TabsContent value="input" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="inputHandling.inputConsideration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Input Consideration</FormLabel>
                          <FormControl>
                            <Select
                              defaultValue={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select input consideration" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={InputConsiderationType.USER_ONLY}>
                                  User Only (Companions only see user messages)
                                </SelectItem>
                                <SelectItem value={InputConsiderationType.USER_AND_BOTS}>
                                  User & Bots (Companions see all messages)
                                </SelectItem>
                                <SelectItem value={InputConsiderationType.SELECTED_PARTICIPANTS}>
                                  Selected Participants (Only specific messages)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Which messages companions should consider when responding
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="inputHandling.maxContextWindowSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Context Window Size</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of previous messages to include as context (higher values use more tokens)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* Execution Rules Tab */}
                  <TabsContent value="rules" className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="executionRules.toolPermissions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tool Permissions</FormLabel>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {Object.values(ToolPermissionType).map((tool) => (
                              <FormItem
                                key={tool}
                                className="flex items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(tool)}
                                    onCheckedChange={(checked: boolean) => {
                                      let updatedTools = [...(field.value || [])];
                                      if (checked) {
                                        updatedTools.push(tool);
                                      } else {
                                        updatedTools = updatedTools.filter((t) => t !== tool);
                                      }
                                      field.onChange(updatedTools);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {formatToolName(tool)}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </div>
                          <FormDescription>
                            External tools that companions can access during conversations
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="executionRules.tokenBudgetCeiling"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Budget Ceiling</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Max tokens per session (optional)"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => 
                                field.onChange(e.target.value ? Number(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum tokens to spend in this chat session (leave empty for no limit)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="executionRules.allowedBehaviors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allowed Behaviors</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List behaviors companions are allowed to exhibit"
                                className="min-h-[80px]"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="executionRules.disallowedBehaviors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Disallowed Behaviors</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List behaviors companions should avoid"
                                className="min-h-[80px]"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="flex items-center justify-between">
                  {activeConfig?.id && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper functions
function formatToolName(tool: ToolPermissionType): string {
  return tool
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTemplateDescription(templateType: TemplateCategoryType): string {
  switch (templateType) {
    case TemplateCategoryType.ENTREPRENEURIAL_ADVISOR:
      return "Strategic business advice from multiple expert perspectives";
    case TemplateCategoryType.DND_GAME_MASTER:
      return "Interactive role-playing game with storytelling and character dynamics";
    case TemplateCategoryType.BRAINSTORMING:
      return "Collaborative idea generation with diverse perspectives";
    case TemplateCategoryType.TECHNICAL_DEBUGGING:
      return "Collaborative problem-solving for technical issues";
    case TemplateCategoryType.CUSTOM:
      return "Build a custom configuration from scratch";
    default:
      return "";
  }
} 