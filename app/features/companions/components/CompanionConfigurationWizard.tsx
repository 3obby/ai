'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  Companion,
  PersonalityConfigType, 
  KnowledgeConfigType, 
  InteractionConfigType,
  ToolConfigType,
  DEFAULT_PERSONALITY_CONFIG,
  DEFAULT_KNOWLEDGE_CONFIG,
  DEFAULT_INTERACTION_CONFIG,
  DEFAULT_TOOL_CONFIG
} from '@/app/shared/types/companion';
import { Button } from '@/app/shared/components/ui/button';
import { Input } from '@/app/shared/components/ui/input';
import { Textarea } from '@/app/shared/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/shared/components/ui/tabs';
import { Slider } from '@/app/shared/components/ui/slider';
import { Switch } from '@/app/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/app/shared/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/shared/components/ui/select';
import { Checkbox } from '@/app/shared/components/ui/checkbox';

interface CompanionConfigurationWizardProps {
  companion?: Companion;
  userId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function CompanionConfigurationWizard({
  companion,
  userId,
  onSuccess,
  onCancel,
  isEditing = false,
}: CompanionConfigurationWizardProps) {
  const router = useRouter();
  
  // Basic companion information
  const [name, setName] = useState(companion?.name || '');
  const [description, setDescription] = useState(companion?.description || '');
  const [instructions, setInstructions] = useState(companion?.instructions || '');
  const [imageUrl, setImageUrl] = useState(companion?.src || '');
  const [categoryId, setCategoryId] = useState(companion?.categoryId || null);
  
  // Configuration states
  const [personalityConfig, setPersonalityConfig] = useState<PersonalityConfigType>(
    companion?.personalityConfig || DEFAULT_PERSONALITY_CONFIG
  );
  const [knowledgeConfig, setKnowledgeConfig] = useState<KnowledgeConfigType>(
    companion?.knowledgeConfig || DEFAULT_KNOWLEDGE_CONFIG
  );
  const [interactionConfig, setInteractionConfig] = useState<InteractionConfigType>(
    companion?.interactionConfig || DEFAULT_INTERACTION_CONFIG
  );
  const [toolConfig, setToolConfig] = useState<ToolConfigType>(
    companion?.toolConfig || DEFAULT_TOOL_CONFIG
  );
  
  // UI states
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  // Fetch categories on mount
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Update personality configuration
  const updatePersonality = (
    key: keyof PersonalityConfigType['traits'] | keyof PersonalityConfigType['voice'],
    value: number
  ) => {
    setPersonalityConfig(prev => {
      if (key in prev.traits) {
        return {
          ...prev,
          traits: {
            ...prev.traits,
            [key]: value
          }
        };
      } else {
        return {
          ...prev,
          voice: {
            ...prev.voice,
            [key]: value
          }
        };
      }
    });
  };

  // Update response format
  const updateResponseFormat = (
    key: 'length' | 'style',
    value: string
  ) => {
    setPersonalityConfig(prev => ({
      ...prev,
      responseFormat: {
        ...prev.responseFormat,
        [key]: value
      }
    }));
  };

  // Update knowledge configuration
  const updateKnowledge = (field: string, value: any) => {
    setKnowledgeConfig(prev => {
      if (field === 'primaryDomain') {
        return {
          ...prev,
          expertise: {
            ...prev.expertise,
            primaryDomain: value
          }
        };
      } else if (field === 'knowledgeDepth') {
        return {
          ...prev,
          expertise: {
            ...prev.expertise,
            knowledgeDepth: value
          }
        };
      } else if (field === 'uncertaintyThreshold') {
        return {
          ...prev,
          confidence: {
            uncertaintyThreshold: value
          }
        };
      } else if (field === 'citationStyle') {
        return {
          ...prev,
          sources: {
            ...prev.sources,
            citationStyle: value
          }
        };
      }
      
      return prev;
    });
  };

  // Update interaction configuration
  const updateInteraction = (field: keyof InteractionConfigType, value: any) => {
    setInteractionConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update tool configuration
  const updateToolConfig = (field: string, value: any) => {
    setToolConfig(prev => {
      if (field === 'webSearchEnabled') {
        return {
          ...prev,
          webSearch: {
            ...prev.webSearch,
            enabled: value
          }
        };
      } else if (field === 'codeExecutionEnabled') {
        return {
          ...prev,
          codeExecution: {
            ...prev.codeExecution,
            enabled: value
          }
        };
      } else if (field === 'dataVisualization' || field === 'documentAnalysis' || field === 'calculationTools') {
        return {
          ...prev,
          [field]: value
        };
      }
      
      return prev;
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      setActiveTab('basic');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const companionData = {
        name,
        description,
        instructions,
        src: imageUrl,
        categoryId,
        personalityConfig,
        knowledgeConfig,
        interactionConfig,
        toolConfig,
        userId
      };
      
      if (isEditing && companion) {
        // Update existing companion
        await axios.patch(`/api/companions/${companion.id}`, companionData);
      } else {
        // Create new companion
        await axios.post('/api/companions', companionData);
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving companion:', error);
      setError('Failed to save companion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-background rounded-lg shadow-lg">
      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Configuration tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="interaction">Interaction & Tools</TabsTrigger>
        </TabsList>
        
        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4 p-4">
          <h2 className="text-2xl font-bold">Basic Information</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter companion name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a brief description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="instructions" className="text-sm font-medium">
                Instructions
              </label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter detailed instructions"
                rows={5}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="imageUrl" className="text-sm font-medium">
                Profile Image URL
              </label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter image URL"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Select 
                value={categoryId || ''} 
                onValueChange={(value) => setCategoryId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setActiveTab('personality')}>
              Next: Personality
            </Button>
          </div>
        </TabsContent>
        
        {/* Personality Tab */}
        <TabsContent value="personality" className="space-y-4 p-4">
          <h2 className="text-2xl font-bold">Personality Configuration</h2>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personality Traits</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Analytical vs. Creative</label>
                    <span className="text-sm">{personalityConfig.traits.analytical}/10</span>
                  </div>
                  <Slider
                    value={[personalityConfig.traits.analytical]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updatePersonality('analytical', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Analytical</span>
                    <span>Creative</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Formal vs. Casual</label>
                    <span className="text-sm">{personalityConfig.traits.formal}/10</span>
                  </div>
                  <Slider
                    value={[personalityConfig.traits.formal]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updatePersonality('formal', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Formal</span>
                    <span>Casual</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Serious vs. Humorous</label>
                    <span className="text-sm">{personalityConfig.traits.serious}/10</span>
                  </div>
                  <Slider
                    value={[personalityConfig.traits.serious]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updatePersonality('serious', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Serious</span>
                    <span>Humorous</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Voice Attributes</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Humor Level</label>
                    <span className="text-sm">{personalityConfig.voice.humor}/10</span>
                  </div>
                  <Slider
                    value={[personalityConfig.voice.humor]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updatePersonality('humor', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minimal</span>
                    <span>Frequent</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Directness</label>
                    <span className="text-sm">{personalityConfig.voice.directness}/10</span>
                  </div>
                  <Slider
                    value={[personalityConfig.voice.directness]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updatePersonality('directness', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Indirect</span>
                    <span>Direct</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Response Format</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Length</label>
                  <Select 
                    value={personalityConfig.responseFormat.length} 
                    onValueChange={(value: any) => updateResponseFormat('length', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Style</label>
                  <Select 
                    value={personalityConfig.responseFormat.style} 
                    onValueChange={(value: any) => updateResponseFormat('style', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="narrative">Narrative</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveTab('basic')}>
              Back
            </Button>
            <Button onClick={() => setActiveTab('knowledge')}>
              Next: Knowledge
            </Button>
          </div>
        </TabsContent>
        
        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="space-y-4 p-4">
          <h2 className="text-2xl font-bold">Knowledge Configuration</h2>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Expertise Areas</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="primaryDomain" className="text-sm font-medium">
                    Primary Domain of Expertise
                  </label>
                  <Input
                    id="primaryDomain"
                    value={knowledgeConfig.expertise.primaryDomain}
                    onChange={(e) => updateKnowledge('primaryDomain', e.target.value)}
                    placeholder="E.g., Computer Science, History, Medicine"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Knowledge Depth</label>
                    <span className="text-sm">{knowledgeConfig.expertise.knowledgeDepth}/10</span>
                  </div>
                  <Slider
                    value={[knowledgeConfig.expertise.knowledgeDepth]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateKnowledge('knowledgeDepth', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>General</span>
                    <span>Specialized</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Confidence Settings</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Uncertainty Threshold</label>
                  <span className="text-sm">{knowledgeConfig.confidence.uncertaintyThreshold}/10</span>
                </div>
                <Slider
                  value={[knowledgeConfig.confidence.uncertaintyThreshold]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(value) => updateKnowledge('uncertaintyThreshold', value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Express uncertainty often</span>
                  <span>Express uncertainty rarely</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Citation Settings</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Citation Style</label>
                <Select 
                  value={knowledgeConfig.sources.citationStyle} 
                  onValueChange={(value: any) => updateKnowledge('citationStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="footnote">Footnote</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveTab('personality')}>
              Back
            </Button>
            <Button onClick={() => setActiveTab('interaction')}>
              Next: Interaction & Tools
            </Button>
          </div>
        </TabsContent>
        
        {/* Interaction & Tools Tab */}
        <TabsContent value="interaction" className="space-y-4 p-4">
          <h2 className="text-2xl font-bold">Interaction & Tools</h2>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Interaction Style</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Initiative Level</label>
                    <span className="text-sm">{interactionConfig.initiative}/10</span>
                  </div>
                  <Slider
                    value={[interactionConfig.initiative]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateInteraction('initiative', value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Passive</span>
                    <span>Proactive</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Memory Level</label>
                  <Select 
                    value={interactionConfig.memory} 
                    onValueChange={(value: any) => updateInteraction('memory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="extensive">Extensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Follow-up Behavior</label>
                  <Select 
                    value={interactionConfig.followUp} 
                    onValueChange={(value: any) => updateInteraction('followUp', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="occasional">Occasional</SelectItem>
                      <SelectItem value="frequent">Frequent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="feedbackRequests"
                    checked={interactionConfig.feedbackRequests}
                    onCheckedChange={(checked) => updateInteraction('feedbackRequests', Boolean(checked))}
                  />
                  <label
                    htmlFor="feedbackRequests"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Ask for feedback on responses
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multiTurnReasoning"
                    checked={interactionConfig.multiTurnReasoning}
                    onCheckedChange={(checked) => updateInteraction('multiTurnReasoning', Boolean(checked))}
                  />
                  <label
                    htmlFor="multiTurnReasoning"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enable step-by-step reasoning for complex topics
                  </label>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tool Access</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Web Search</label>
                  <Switch
                    checked={toolConfig.webSearch.enabled}
                    onCheckedChange={(checked) => updateToolConfig('webSearchEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Code Execution</label>
                  <Switch
                    checked={toolConfig.codeExecution.enabled}
                    onCheckedChange={(checked) => updateToolConfig('codeExecutionEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Data Visualization</label>
                  <Switch
                    checked={toolConfig.dataVisualization}
                    onCheckedChange={(checked) => updateToolConfig('dataVisualization', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Document Analysis</label>
                  <Switch
                    checked={toolConfig.documentAnalysis}
                    onCheckedChange={(checked) => updateToolConfig('documentAnalysis', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Calculation Tools</label>
                  <Switch
                    checked={toolConfig.calculationTools}
                    onCheckedChange={(checked) => updateToolConfig('calculationTools', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveTab('knowledge')}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Companion' : 'Create Companion'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Cancel button */}
      {onCancel && (
        <div className="p-4 border-t">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
} 