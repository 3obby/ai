"use client";

import { useState, useEffect } from "react";
import { PersonalityConfigType, PersonalityTemplateType, PERSONALITY_TEMPLATES } from "@/types/companion";
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
  const [values, setValues] = useState<PersonalityConfigType>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleApplyTemplate = (templateId: string) => {
    const template = PERSONALITY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newValues = {
        ...template.config,
        templateId: templateId
      };
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Personality</CardTitle>
        <CardDescription>
          Configure your companion&apos;s personality traits and communication style
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-medium">Apply Template</h3>
            <Select 
              value={values.templateId || ""}
              onValueChange={handleApplyTemplate}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {PERSONALITY_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PERSONALITY_TEMPLATES.map((template) => (
              <Button
                key={template.id}
                variant={values.templateId === template.id ? "default" : "outline"}
                onClick={() => handleApplyTemplate(template.id)}
                className="h-auto p-4 justify-start flex-col items-start"
              >
                <div className="font-semibold mb-1">{template.name}</div>
                <div className="text-sm text-left">{template.description}</div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personality Traits</h3>

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
                {values.traits.analytical_creative <= 3 ? 'Highly analytical, logical, and systematic' : 
                 values.traits.analytical_creative >= 7 ? 'Highly creative, innovative, and imaginative' : 
                 'Balanced between analytical and creative thinking'}
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
                {values.traits.formal_casual <= 3 ? 'Very formal, proper, and professional' : 
                 values.traits.formal_casual >= 7 ? 'Very casual, relaxed, and conversational' : 
                 'Balanced between formal and casual tone'}
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
                 values.traits.serious_humorous >= 7 ? 'Light-hearted and humorous' : 
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

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Communication Style</h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Response Length</Label>
              <RadioGroup 
                value={values.responseLength}
                onValueChange={(value) => handleChange('responseLength', value as PersonalityConfigType['responseLength'])}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="concise" id="concise" />
                  <Label htmlFor="concise">Concise - Brief and to the point</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced">Balanced - Moderate level of detail</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="detailed" />
                  <Label htmlFor="detailed">Detailed - Thorough and comprehensive</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Writing Style</Label>
              <RadioGroup 
                value={values.writingStyle}
                onValueChange={(value) => handleChange('writingStyle', value as PersonalityConfigType['writingStyle'])}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="academic" id="academic" />
                  <Label htmlFor="academic">Academic - Formal, precise, citation-focused</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conversational" id="conversational" />
                  <Label htmlFor="conversational">Conversational - Natural, approachable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="technical" id="technical" />
                  <Label htmlFor="technical">Technical - Precise, detailed, specialized</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="narrative" id="narrative" />
                  <Label htmlFor="narrative">Narrative - Storytelling, engaging</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual">Casual - Relaxed, colloquial</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 