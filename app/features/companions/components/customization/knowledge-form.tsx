"use client";

import { useState, useEffect } from "react";
import { KnowledgeConfigType, DEFAULT_KNOWLEDGE_CONFIG } from "@/types/companion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface KnowledgeFormProps {
  initialValues: KnowledgeConfigType;
  onChange: (values: KnowledgeConfigType) => void;
}

// Common knowledge domains for suggestions
const KNOWLEDGE_DOMAINS = [
  "Arts & Culture",
  "Business & Finance",
  "Education",
  "Engineering",
  "Health & Medicine",
  "History",
  "Law",
  "Literature",
  "Mathematics",
  "Philosophy",
  "Politics",
  "Psychology",
  "Science",
  "Technology",
  "Sports & Recreation"
];

export const KnowledgeForm = ({
  initialValues,
  onChange
}: KnowledgeFormProps) => {
  // Ensure all required fields are present by merging with defaults
  const ensureCompleteValues = (values: KnowledgeConfigType): KnowledgeConfigType => {
    return {
      expertiseAreas: values.expertiseAreas || DEFAULT_KNOWLEDGE_CONFIG.expertiseAreas,
      primaryExpertise: values.primaryExpertise || DEFAULT_KNOWLEDGE_CONFIG.primaryExpertise,
      secondaryExpertise: values.secondaryExpertise || DEFAULT_KNOWLEDGE_CONFIG.secondaryExpertise,
      knowledgeDepth: values.knowledgeDepth ?? DEFAULT_KNOWLEDGE_CONFIG.knowledgeDepth,
      confidenceThreshold: values.confidenceThreshold ?? DEFAULT_KNOWLEDGE_CONFIG.confidenceThreshold,
      sourcePreferences: values.sourcePreferences || DEFAULT_KNOWLEDGE_CONFIG.sourcePreferences,
      citationStyle: values.citationStyle || DEFAULT_KNOWLEDGE_CONFIG.citationStyle,
    };
  };

  // Apply safety check to initial values
  const safeInitialValues = ensureCompleteValues(initialValues || DEFAULT_KNOWLEDGE_CONFIG);
  const [values, setValues] = useState<KnowledgeConfigType>(safeInitialValues);
  const [newExpertise, setNewExpertise] = useState<string>("");

  useEffect(() => {
    // Make sure any updates from parent also get the same safety check
    setValues(ensureCompleteValues(initialValues || DEFAULT_KNOWLEDGE_CONFIG));
  }, [initialValues]);

  const handleChange = <K extends keyof KnowledgeConfigType>(
    key: K, 
    value: KnowledgeConfigType[K]
  ) => {
    const newValues = {
      ...values,
      [key]: value
    };
    setValues(newValues);
    onChange(newValues);
  };

  const handleAddExpertise = () => {
    if (newExpertise && !values.expertiseAreas.includes(newExpertise)) {
      const newAreas = [...values.expertiseAreas, newExpertise];
      const newValues = {
        ...values,
        expertiseAreas: newAreas,
        // Set as primary if it's the first one added
        primaryExpertise: values.primaryExpertise || newExpertise
      };
      setValues(newValues);
      onChange(newValues);
      setNewExpertise("");
    }
  };

  const handleRemoveExpertise = (expertise: string) => {
    const newAreas = values.expertiseAreas.filter(e => e !== expertise);
    const newSecondary = values.secondaryExpertise.filter(e => e !== expertise);
    
    const newValues = {
      ...values,
      expertiseAreas: newAreas,
      secondaryExpertise: newSecondary,
      // Clear primary if removed
      primaryExpertise: values.primaryExpertise === expertise 
        ? (newAreas.length > 0 ? newAreas[0] : '')
        : values.primaryExpertise
    };
    
    setValues(newValues);
    onChange(newValues);
  };

  const handleSetPrimary = (expertise: string) => {
    if (values.expertiseAreas.includes(expertise)) {
      const newValues = {
        ...values,
        primaryExpertise: expertise,
        // Remove from secondary if present
        secondaryExpertise: values.secondaryExpertise.filter(e => e !== expertise)
      };
      setValues(newValues);
      onChange(newValues);
    }
  };

  const handleToggleSecondary = (expertise: string) => {
    if (values.expertiseAreas.includes(expertise) && expertise !== values.primaryExpertise) {
      let newSecondary;
      
      if (values.secondaryExpertise.includes(expertise)) {
        // Remove if present
        newSecondary = values.secondaryExpertise.filter(e => e !== expertise);
      } else {
        // Add if not present
        newSecondary = [...values.secondaryExpertise, expertise];
      }
      
      const newValues = {
        ...values,
        secondaryExpertise: newSecondary
      };
      
      setValues(newValues);
      onChange(newValues);
    }
  };

  const handleSourcePreferenceChange = (source: KnowledgeConfigType['sourcePreferences'][number], checked: boolean) => {
    let newSourcePreferences;
    
    if (checked && !values.sourcePreferences.includes(source)) {
      newSourcePreferences = [...values.sourcePreferences, source];
    } else if (!checked && values.sourcePreferences.includes(source)) {
      newSourcePreferences = values.sourcePreferences.filter(s => s !== source);
    } else {
      // No change needed
      return;
    }
    
    const newValues = {
      ...values,
      sourcePreferences: newSourcePreferences
    };
    
    setValues(newValues);
    onChange(newValues);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge & Expertise</CardTitle>
        <CardDescription>
          Customize your companion's knowledge areas and information sources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Expertise Areas</h3>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Add expertise area:</Label>
              <div className="flex space-x-2">
                <Input 
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  placeholder="Enter an expertise area"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExpertise();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddExpertise}
                  disabled={!newExpertise}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
            
            <div className="pt-2">
              <Label>Suggested domains:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {KNOWLEDGE_DOMAINS.map((domain) => (
                  <div 
                    key={domain}
                    className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold bg-secondary text-secondary-foreground cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      setNewExpertise(domain);
                    }}
                  >
                    {domain}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {values.expertiseAreas && values.expertiseAreas.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label>Current expertise areas:</Label>
              <div className="border rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {values.expertiseAreas.map((expertise) => (
                    <div key={expertise} className="flex flex-col gap-2 p-3 border rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{expertise}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveExpertise(expertise)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            id={`primary-${expertise}`}
                            checked={values.primaryExpertise === expertise}
                            onChange={() => handleSetPrimary(expertise)}
                          />
                          <Label htmlFor={`primary-${expertise}`} className="text-sm">Primary expertise</Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`secondary-${expertise}`}
                            checked={values.secondaryExpertise.includes(expertise)}
                            disabled={values.primaryExpertise === expertise}
                            onChange={() => handleToggleSecondary(expertise)}
                          />
                          <Label htmlFor={`secondary-${expertise}`} className="text-sm">Secondary expertise</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Knowledge Depth & Style</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Knowledge Depth</Label>
                <span className="text-sm">{values.knowledgeDepth}/10</span>
              </div>
              <Slider 
                value={[values.knowledgeDepth]} 
                min={0} 
                max={10} 
                step={1}
                onValueChange={(value) => handleChange('knowledgeDepth', value[0])}
              />
              <div className="text-sm text-muted-foreground">
                {values.knowledgeDepth <= 3 ? 'General knowledge, broad but less technical' : 
                 values.knowledgeDepth >= 7 ? 'Specialized, technical depth in expertise areas' : 
                 'Balanced knowledge depth'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Confidence Threshold</Label>
                <span className="text-sm">{values.confidenceThreshold}/10</span>
              </div>
              <Slider 
                value={[values.confidenceThreshold]} 
                min={0} 
                max={10} 
                step={1}
                onValueChange={(value) => handleChange('confidenceThreshold', value[0])}
              />
              <div className="text-sm text-muted-foreground">
                {values.confidenceThreshold <= 3 ? 'Expresses uncertainty often, very cautious' : 
                 values.confidenceThreshold >= 7 ? 'Higher confidence, rarely expresses uncertainty' : 
                 'Balanced - expresses uncertainty when appropriate'}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Citation Style</Label>
              <Select 
                value={values.citationStyle} 
                onValueChange={(value) => handleChange('citationStyle', value as KnowledgeConfigType['citationStyle'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - No citations</SelectItem>
                  <SelectItem value="inline">Inline - Brief citations in text</SelectItem>
                  <SelectItem value="footnote">Footnotes - Detailed but separated</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive - Academic style</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source Preferences</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="academic" 
                    checked={values.sourcePreferences.includes('academic')}
                    onCheckedChange={(checked) => handleSourcePreferenceChange('academic', checked === true)}
                  />
                  <Label htmlFor="academic">Academic sources</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="industry" 
                    checked={values.sourcePreferences.includes('industry')}
                    onCheckedChange={(checked) => handleSourcePreferenceChange('industry', checked === true)}
                  />
                  <Label htmlFor="industry">Industry publications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="news" 
                    checked={values.sourcePreferences.includes('news')}
                    onCheckedChange={(checked) => handleSourcePreferenceChange('news', checked === true)}
                  />
                  <Label htmlFor="news">News sources</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="general" 
                    checked={values.sourcePreferences.includes('general')}
                    onCheckedChange={(checked) => handleSourcePreferenceChange('general', checked === true)}
                  />
                  <Label htmlFor="general">General knowledge</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 