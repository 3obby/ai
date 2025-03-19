"use client";

import { useState, useEffect } from "react";
import { PersonalityConfigType, PersonalityTemplateType, PERSONALITY_TEMPLATES, DEFAULT_PERSONALITY_CONFIG } from "@/types/companion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  RadioGroup, 
  RadioGroupItem 
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface PersonalityFormProps {
  initialValues: PersonalityConfigType;
  onChange: (values: PersonalityConfigType) => void;
}

export const PersonalityForm = ({
  initialValues,
  onChange
}: PersonalityFormProps) => {
  // Ensure all required fields are present by merging with defaults
  const ensureCompleteValues = (values: PersonalityConfigType): PersonalityConfigType => {
    return {
      traits: {
        analytical_creative: values.traits?.analytical_creative ?? DEFAULT_PERSONALITY_CONFIG.traits.analytical_creative,
        formal_casual: values.traits?.formal_casual ?? DEFAULT_PERSONALITY_CONFIG.traits.formal_casual,
        serious_humorous: values.traits?.serious_humorous ?? DEFAULT_PERSONALITY_CONFIG.traits.serious_humorous,
        reserved_enthusiastic: values.traits?.reserved_enthusiastic ?? DEFAULT_PERSONALITY_CONFIG.traits.reserved_enthusiastic,
        practical_theoretical: values.traits?.practical_theoretical ?? DEFAULT_PERSONALITY_CONFIG.traits.practical_theoretical,
      },
      voice: {
        humor: values.voice?.humor ?? DEFAULT_PERSONALITY_CONFIG.voice.humor,
        directness: values.voice?.directness ?? DEFAULT_PERSONALITY_CONFIG.voice.directness,
        warmth: values.voice?.warmth ?? DEFAULT_PERSONALITY_CONFIG.voice.warmth,
      },
      responseLength: values.responseLength ?? DEFAULT_PERSONALITY_CONFIG.responseLength,
      writingStyle: values.writingStyle ?? DEFAULT_PERSONALITY_CONFIG.writingStyle,
      templateId: values.templateId
    };
  };

  // Apply safety check to initial values
  const safeInitialValues = ensureCompleteValues(initialValues || DEFAULT_PERSONALITY_CONFIG);
  const [values, setValues] = useState<PersonalityConfigType>(safeInitialValues);

  useEffect(() => {
    // Make sure any updates from parent also get the same safety check
    setValues(ensureCompleteValues(initialValues || DEFAULT_PERSONALITY_CONFIG));
  }, [initialValues]);

  const handleApplyTemplate = (templateId: string) => {
    const template = PERSONALITY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newValues = ensureCompleteValues({
        ...template.config,
        templateId: templateId
      });
      setValues(newValues);
      onChange(newValues);
    }
  };

  const handleChange = <K extends keyof PersonalityConfigType>(
    key: K, 
    value: PersonalityConfigType[K]
  ) => {
    const newValues = {
      ...values,
      [key]: value
    };
    setValues(newValues);
    onChange(newValues);
  };

  const handleTraitChange = (trait: keyof PersonalityConfigType['traits'], value: number) => {
    const newValues = {
      ...values,
      traits: {
        ...values.traits,
        [trait]: value
      }
    };
    setValues(newValues);
    onChange(newValues);
  };

  const handleVoiceChange = (voice: keyof PersonalityConfigType['voice'], value: number) => {
    const newValues = {
      ...values,
      voice: {
        ...values.voice,
        [voice]: value
      }
    };
    setValues(newValues);
    onChange(newValues);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personality & Communication Style</CardTitle>
        <CardDescription>
          Customize how your companion thinks and expresses itself
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Apply Personality Template</Label>
            <Select 
              value={values.templateId || ""}
              onValueChange={handleApplyTemplate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Custom</SelectItem>
                {PERSONALITY_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Response Style</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Response Length</Label>
                <RadioGroup 
                  value={values.responseLength} 
                  onValueChange={(value) => handleChange('responseLength', value as PersonalityConfigType['responseLength'])}
                  className="flex space-x-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="concise" id="concise" />
                    <Label htmlFor="concise" className="cursor-pointer">Concise</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" />
                    <Label htmlFor="balanced" className="cursor-pointer">Balanced</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="detailed" id="detailed" />
                    <Label htmlFor="detailed" className="cursor-pointer">Detailed</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Writing Style</Label>
                <Select 
                  value={values.writingStyle} 
                  onValueChange={(value) => handleChange('writingStyle', value as PersonalityConfigType['writingStyle'])}
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

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Character Traits</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Analytical</Label>
                  <Label>Creative</Label>
                </div>
                <Slider 
                  value={[values.traits.analytical_creative]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleTraitChange('analytical_creative', value[0])}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {values.traits.analytical_creative <= 3 ? 'Highly analytical and logical' : 
                   values.traits.analytical_creative >= 7 ? 'Highly creative and imaginative' : 
                   'Balanced between analytical and creative'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Formal</Label>
                  <Label>Casual</Label>
                </div>
                <Slider 
                  value={[values.traits.formal_casual]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleTraitChange('formal_casual', value[0])}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {values.traits.formal_casual <= 3 ? 'Very formal and proper' : 
                   values.traits.formal_casual >= 7 ? 'Very casual and relaxed' : 
                   'Balanced between formal and casual'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Serious</Label>
                  <Label>Humorous</Label>
                </div>
                <Slider 
                  value={[values.traits.serious_humorous]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleTraitChange('serious_humorous', value[0])}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {values.traits.serious_humorous <= 3 ? 'Very serious and straightforward' : 
                   values.traits.serious_humorous >= 7 ? 'Playful with frequent humor' : 
                   'Balanced between serious and humorous'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Reserved</Label>
                  <Label>Enthusiastic</Label>
                </div>
                <Slider 
                  value={[values.traits.reserved_enthusiastic]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleTraitChange('reserved_enthusiastic', value[0])}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {values.traits.reserved_enthusiastic <= 3 ? 'Reserved, calm, and measured' : 
                   values.traits.reserved_enthusiastic >= 7 ? 'Enthusiastic, passionate, and energetic' : 
                   'Balanced between reserved and enthusiastic'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Practical</Label>
                  <Label>Theoretical</Label>
                </div>
                <Slider 
                  value={[values.traits.practical_theoretical]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleTraitChange('practical_theoretical', value[0])}
                />
                <div className="text-sm text-muted-foreground text-center">
                  {values.traits.practical_theoretical <= 3 ? 'Practical, hands-on, and application-focused' : 
                   values.traits.practical_theoretical >= 7 ? 'Theoretical, conceptual, and abstract' : 
                   'Balanced between practical and theoretical'}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Voice & Tone</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Humor Level</Label>
                  <span className="text-sm">{values.voice.humor}/10</span>
                </div>
                <Slider 
                  value={[values.voice.humor]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleVoiceChange('humor', value[0])}
                />
                <div className="text-sm text-muted-foreground">
                  {values.voice.humor <= 3 ? 'Minimal humor or wit' : 
                   values.voice.humor >= 7 ? 'Frequent jokes and humor' : 
                   'Moderate, appropriate humor'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Directness</Label>
                  <span className="text-sm">{values.voice.directness}/10</span>
                </div>
                <Slider 
                  value={[values.voice.directness]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleVoiceChange('directness', value[0])}
                />
                <div className="text-sm text-muted-foreground">
                  {values.voice.directness <= 3 ? 'Indirect, gentle, and diplomatic' : 
                   values.voice.directness >= 7 ? 'Very direct and straightforward' : 
                   'Balanced directness'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Warmth</Label>
                  <span className="text-sm">{values.voice.warmth}/10</span>
                </div>
                <Slider 
                  value={[values.voice.warmth]} 
                  min={0} 
                  max={10} 
                  step={1}
                  onValueChange={(value) => handleVoiceChange('warmth', value[0])}
                />
                <div className="text-sm text-muted-foreground">
                  {values.voice.warmth <= 3 ? 'Cool, detached, and professional' : 
                   values.voice.warmth >= 7 ? 'Very warm, friendly, and approachable' : 
                   'Balanced warmth'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 