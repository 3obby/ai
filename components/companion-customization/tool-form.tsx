"use client";

import { useState, useEffect } from "react";
import { ToolConfigType } from "@/types/companion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Search,
  Code,
  PieChart,
  FileText,
  Calculator,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ToolFormProps {
  initialValues: ToolConfigType;
  onChange: (values: ToolConfigType) => void;
}

export const ToolForm = ({
  initialValues,
  onChange
}: ToolFormProps) => {
  const [values, setValues] = useState<ToolConfigType>(initialValues);

  useEffect(() => {
    // Ensure we have default values for nested objects
    const ensureCompleteValues = (values: ToolConfigType): ToolConfigType => {
      return {
        ...values,
        webSearch: values.webSearch || { enabled: false },
        codeExecution: values.codeExecution || { enabled: false },
        dataVisualization: values.dataVisualization || { enabled: false },
        documentAnalysis: values.documentAnalysis || { enabled: false },
        calculationTools: values.calculationTools || { enabled: false },
        otherTools: values.otherTools || {}
      };
    };
    
    setValues(ensureCompleteValues(initialValues));
  }, [initialValues]);

  const handleChange = <K extends keyof ToolConfigType>(
    key: K, 
    value: ToolConfigType[K]
  ) => {
    const newValues = {
      ...values,
      [key]: value
    };
    setValues(newValues);
    onChange(newValues);
  };

  const handleWebSearchChange = <K extends keyof ToolConfigType['webSearch']>(
    key: K, 
    value: any
  ) => {
    const newValues = {
      ...values,
      webSearch: {
        ...values.webSearch,
        [key]: value
      }
    };
    setValues(newValues);
    onChange(newValues);
  };

  const handleCodeExecutionChange = <K extends keyof ToolConfigType['codeExecution']>(
    key: K, 
    value: any
  ) => {
    const newValues = {
      ...values,
      codeExecution: {
        ...values.codeExecution,
        [key]: value
      }
    };
    setValues(newValues);
    onChange(newValues);
  };

  const toggleOtherTool = (toolName: string, enabled: boolean) => {
    const newOtherTools = { ...values.otherTools, [toolName]: enabled };
    handleChange('otherTools', newOtherTools);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tool Integration</CardTitle>
        <CardDescription>
          Enable external tools and capabilities for your companion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="core-tools" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="core-tools">Core Tools</TabsTrigger>
            <TabsTrigger value="advanced-tools">Advanced Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="core-tools" className="space-y-6 pt-4">
            {/* Web Search */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Web Search</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow your companion to search the web for up-to-date information
                      </p>
                    </div>
                    <Switch 
                      checked={values.webSearch?.enabled || false}
                      onCheckedChange={(checked) => handleWebSearchChange('enabled', checked)}
                    />
                  </div>

                  {values.webSearch?.enabled && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Search Provider</Label>
                        <Select 
                          value={values.webSearch?.searchProvider || 'google'}
                          onValueChange={(value) => 
                            handleWebSearchChange('searchProvider', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select search provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google">Google</SelectItem>
                            <SelectItem value="bing">Bing</SelectItem>
                            <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Max Results</Label>
                        <Select 
                          value={String(values.webSearch?.maxResults || 5)}
                          onValueChange={(value) => 
                            handleWebSearchChange('maxResults', parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select max results" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 results</SelectItem>
                            <SelectItem value="5">5 results</SelectItem>
                            <SelectItem value="10">10 results</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Code Execution */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Code className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Code Execution</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow your companion to execute code snippets
                      </p>
                    </div>
                    <Switch 
                      checked={values.codeExecution.enabled}
                      onCheckedChange={(checked) => handleCodeExecutionChange('enabled', checked)}
                    />
                  </div>

                  {values.codeExecution.enabled && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Supported Languages</Label>
                        <div className="flex flex-wrap gap-2">
                          {['javascript', 'python', 'typescript', 'bash', 'ruby', 'go'].map(lang => (
                            <Button
                              key={lang}
                              variant={values.codeExecution.languages?.includes(lang) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const currentLangs = values.codeExecution.languages || [];
                                const newLangs = currentLangs.includes(lang)
                                  ? currentLangs.filter(l => l !== lang)
                                  : [...currentLangs, lang];
                                handleCodeExecutionChange('languages', newLangs);
                              }}
                            >
                              {lang}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Data Visualization */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-md">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Data Visualization</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow your companion to generate charts and visualizations
                      </p>
                    </div>
                    <Switch 
                      checked={values.dataVisualization.enabled}
                      onCheckedChange={(checked) => {
                        const newValues = {
                          ...values,
                          dataVisualization: { enabled: checked }
                        };
                        setValues(newValues);
                        onChange(newValues);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced-tools" className="space-y-6 pt-4">
            {/* Document Analysis */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-md">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Document Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow your companion to process and analyze documents
                      </p>
                    </div>
                    <Switch 
                      checked={values.documentAnalysis.enabled}
                      onCheckedChange={(checked) => {
                        const newValues = {
                          ...values,
                          documentAnalysis: { enabled: checked }
                        };
                        setValues(newValues);
                        onChange(newValues);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calculation Tools */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Calculation Tools</h3>
                      <p className="text-sm text-muted-foreground">
                        Allow your companion to perform complex calculations
                      </p>
                    </div>
                    <Switch 
                      checked={values.calculationTools.enabled}
                      onCheckedChange={(checked) => {
                        const newValues = {
                          ...values,
                          calculationTools: { enabled: checked }
                        };
                        setValues(newValues);
                        onChange(newValues);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Tools */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-4">Custom Tools</h3>
              <div className="space-y-4">
                {Object.entries(values.otherTools).map(([name, enabled]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span>{name}</span>
                    </div>
                    <Switch 
                      checked={enabled}
                      onCheckedChange={(checked) => toggleOtherTool(name, checked)}
                    />
                  </div>
                ))}

                <div className="pt-2 border-t">
                  <div className="flex gap-2">
                    <Input placeholder="Add custom tool name..." id="custom-tool" />
                    <Button 
                      onClick={() => {
                        const inputElement = document.getElementById('custom-tool') as HTMLInputElement;
                        const toolName = inputElement?.value.trim();
                        if (toolName && !Object.keys(values.otherTools).includes(toolName)) {
                          toggleOtherTool(toolName, true);
                          inputElement.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Note on Advanced Tools</h4>
                  <p className="text-sm text-yellow-800/80 dark:text-yellow-300/80 mt-1">
                    Some advanced tools require additional setup and may have usage limits. 
                    Tool availability may also depend on your subscription tier.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 