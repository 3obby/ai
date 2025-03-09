"use client";

import { useState, useEffect } from "react";
import { KnowledgeConfigType } from "@/types/companion";
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
  const [values, setValues] = useState<KnowledgeConfigType>(initialValues);
  const [newExpertise, setNewExpertise] = useState("");

  useEffect(() => {
    setValues(initialValues);
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
    if (newExpertise.trim() && !values.expertiseAreas.includes(newExpertise.trim())) {
      const updatedExpertise = [...values.expertiseAreas, newExpertise.trim()];
      handleChange('expertiseAreas', updatedExpertise);
      setNewExpertise("");
    }
  };

  const handleRemoveExpertise = (expertise: string) => {
    const updatedExpertise = values.expertiseAreas.filter(e => e !== expertise);
    handleChange('expertiseAreas', updatedExpertise);
    
    // Also remove from primary/secondary if needed
    if (values.primaryExpertise === expertise) {
      handleChange('primaryExpertise', '');
    }
    
    if (values.secondaryExpertise.includes(expertise)) {
      handleChange('secondaryExpertise', values.secondaryExpertise.filter(e => e !== expertise));
    }
  };

  const handleSetPrimary = (expertise: string) => {
    handleChange('primaryExpertise', expertise);
    
    // Remove from secondary if it's there
    if (values.secondaryExpertise.includes(expertise)) {
      handleChange('secondaryExpertise', values.secondaryExpertise.filter(e => e !== expertise));
    }
  };

  const handleToggleSecondary = (expertise: string) => {
    if (expertise === values.primaryExpertise) return; // Can't be both primary and secondary
    
    const newSecondary = values.secondaryExpertise.includes(expertise)
      ? values.secondaryExpertise.filter(e => e !== expertise)
      : [...values.secondaryExpertise, expertise];
      
    handleChange('secondaryExpertise', newSecondary);
  };

  const handleSourcePreferenceChange = (source: KnowledgeConfigType['sourcePreferences'][number], checked: boolean) => {
    const newPreferences = checked
      ? [...values.sourcePreferences, source]
      : values.sourcePreferences.filter(s => s !== source);
      
    handleChange('sourcePreferences', newPreferences);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Knowledge Configuration</CardTitle>
        <CardDescription>
          Define your companion&apos;s expertise areas and knowledge preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Expertise Areas</h3>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-grow">
                <Input
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  placeholder="Add an expertise area..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpertise()}
                />
              </div>
              <Button onClick={handleAddExpertise} type="button">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            
            <div className="pt-2">
              <Label>Suggested domains:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {KNOWLEDGE_DOMAINS.map((domain) => (
                  <Badge 
                    key={domain}
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      setNewExpertise(domain);
                    }}
                  >
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {values.expertiseAreas.length > 0 && (
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
                            disabled={values.primaryExpertise === expertise}
                            checked={values.secondaryExpertise.includes(expertise)}
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
                <Label>General Knowledge</Label>
                <Label>Specialized Knowledge</Label>
              </div>
              <Slider 
                value={[values.knowledgeDepth]} 
                min={0} 
                max={10} 
                step={1}
                onValueChange={(value) => handleChange('knowledgeDepth', value[0])}
              />
              <div className="text-sm text-muted-foreground text-center">
                {values.knowledgeDepth <= 3 ? 'Broad general knowledge across many domains' : 
                 values.knowledgeDepth >= 7 ? 'Highly specialized, deep expertise in specific areas' : 
                 'Balanced depth of knowledge'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Confidence Threshold: {values.confidenceThreshold}/10</Label>
              </div>
              <Slider 
                value={[values.confidenceThreshold]} 
                min={0} 
                max={10} 
                step={1}
                onValueChange={(value) => handleChange('confidenceThreshold', value[0])}
              />
              <div className="text-sm text-muted-foreground">
                {values.confidenceThreshold <= 3 ? 'Expresses uncertainty frequently, cautious with claims' : 
                 values.confidenceThreshold >= 7 ? 'Only expresses uncertainty when very unsure' : 
                 'Balanced approach to expressing confidence'}
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Source Preferences</h3>
          
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="academic"
                  checked={values.sourcePreferences.includes('academic')}
                  onCheckedChange={(checked) => 
                    handleSourcePreferenceChange('academic', checked as boolean)
                  }
                />
                <Label htmlFor="academic">Academic - Scholarly articles, research papers</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="industry"
                  checked={values.sourcePreferences.includes('industry')}
                  onCheckedChange={(checked) => 
                    handleSourcePreferenceChange('industry', checked as boolean)
                  }
                />
                <Label htmlFor="industry">Industry - Blogs, white papers, reports</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="news"
                  checked={values.sourcePreferences.includes('news')}
                  onCheckedChange={(checked) => 
                    handleSourcePreferenceChange('news', checked as boolean)
                  }
                />
                <Label htmlFor="news">News - Current events, news outlets</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="general"
                  checked={values.sourcePreferences.includes('general')}
                  onCheckedChange={(checked) => 
                    handleSourcePreferenceChange('general', checked as boolean)
                  }
                />
                <Label htmlFor="general">General - Encyclopedic, broad sources</Label>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Citation Style</h3>
          
          <div>
            <Select 
              value={values.citationStyle}
              onValueChange={(value) => 
                handleChange('citationStyle', value as KnowledgeConfigType['citationStyle'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select citation style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - No citations included</SelectItem>
                <SelectItem value="inline">Inline - Brief source mentions within text</SelectItem>
                <SelectItem value="footnote">Footnote - Numbered references at end</SelectItem>
                <SelectItem value="comprehensive">Comprehensive - Detailed bibliography</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-2 text-sm text-muted-foreground">
              {values.citationStyle === 'none' && 
                'The companion will not provide source citations unless explicitly asked.'}
              {values.citationStyle === 'inline' && 
                'The companion will briefly mention sources within responses when relevant.'}
              {values.citationStyle === 'footnote' && 
                'The companion will provide numbered references at the end of responses.'}
              {values.citationStyle === 'comprehensive' && 
                'The companion will provide detailed bibliographic information for sources.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 