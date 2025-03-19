"use client";

import { Companion } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface CharacterFrameworkDisplayProps {
  companion: Companion;
}

export const CharacterFrameworkDisplay = ({
  companion
}: CharacterFrameworkDisplayProps) => {
  const [accordionValue, setAccordionValue] = useState<string | undefined>("personality");
  
  // Extract personality data from the companion
  const getPersonalityConfig = () => {
    try {
      if (typeof companion.personalityConfig === 'string') {
        return JSON.parse(companion.personalityConfig);
      }
      return companion.personalityConfig || {};
    } catch (e) {
      return {};
    }
  };
  
  // Extract knowledge data from the companion
  const getKnowledgeConfig = () => {
    try {
      if (typeof companion.knowledgeConfig === 'string') {
        return JSON.parse(companion.knowledgeConfig);
      }
      return companion.knowledgeConfig || {};
    } catch (e) {
      return {};
    }
  };
  
  // Extract interaction data from the companion
  const getInteractionConfig = () => {
    try {
      if (typeof companion.interactionConfig === 'string') {
        return JSON.parse(companion.interactionConfig);
      }
      return companion.interactionConfig || {};
    } catch (e) {
      return {};
    }
  };
  
  const personalityConfig = getPersonalityConfig();
  const knowledgeConfig = getKnowledgeConfig();
  const interactionConfig = getInteractionConfig();
  
  const hasPersonalityData = personalityConfig.traits || personalityConfig.values || personalityConfig.cognitiveStyle;
  const hasKnowledgeData = knowledgeConfig.background;
  const hasExamples = interactionConfig.examples && interactionConfig.examples.length > 0;
  
  if (!hasPersonalityData && !hasKnowledgeData && !hasExamples) {
    return null;
  }
  
  return (
    <Card className="w-full mb-4 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <span className="mr-2">Character Framework</span>
          <Badge className="ml-auto">v2</Badge>
        </CardTitle>
        <CardDescription>
          Detailed profile of {companion.name}&apos;s personality and background
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="w-full"
        >
          {hasPersonalityData && (
            <AccordionItem value="personality">
              <AccordionTrigger className="text-md font-medium">
                Personality Profile
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {personalityConfig.traits?.dominant?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Dominant Traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {personalityConfig.traits.dominant.map((trait: string) => (
                        <Badge key={trait} variant="secondary" className="bg-primary/20">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {personalityConfig.traits?.secondary?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Secondary Traits</h4>
                    <div className="flex flex-wrap gap-1">
                      {personalityConfig.traits.secondary.map((trait: string) => (
                        <Badge key={trait} variant="secondary" className="bg-muted">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {personalityConfig.traits?.situational?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Situational Behaviors</h4>
                    <div className="flex flex-wrap gap-1">
                      {personalityConfig.traits.situational.map((trait: string) => (
                        <Badge key={trait} variant="secondary" className="bg-background text-muted-foreground">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {personalityConfig.values?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Core Values</h4>
                    <div className="flex flex-wrap gap-1">
                      {personalityConfig.values.map((value: string) => (
                        <Badge key={value} variant="default" className="bg-accent text-accent-foreground">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {personalityConfig.cognitiveStyle && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Cognitive Style</h4>
                    <div className="space-y-2 text-sm">
                      {personalityConfig.cognitiveStyle.thinking && (
                        <div>
                          <span className="font-medium">Thought Process:</span> {personalityConfig.cognitiveStyle.thinking}
                        </div>
                      )}
                      {personalityConfig.cognitiveStyle.decisions && (
                        <div>
                          <span className="font-medium">Decision Making:</span> {personalityConfig.cognitiveStyle.decisions}
                        </div>
                      )}
                      {personalityConfig.cognitiveStyle.attention && (
                        <div>
                          <span className="font-medium">Attention Focus:</span> {personalityConfig.cognitiveStyle.attention}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {hasKnowledgeData && (
            <AccordionItem value="background">
              <AccordionTrigger className="text-md font-medium">
                Background & Experiences
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {knowledgeConfig.background?.upbringing && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Upbringing</h4>
                    <p className="text-sm">{knowledgeConfig.background.upbringing}</p>
                  </div>
                )}
                
                {knowledgeConfig.background?.formativeEvents?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Formative Experiences</h4>
                    <div className="space-y-2">
                      {knowledgeConfig.background.formativeEvents.map((event: any, index: number) => (
                        <div key={index} className="p-2 rounded bg-card border text-sm">
                          <div className="font-medium">
                            {event.age ? `Age ${event.age}: ` : ''}{event.event}
                          </div>
                          <div className="text-muted-foreground">
                            Impact: {event.impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {hasExamples && (
            <AccordionItem value="examples">
              <AccordionTrigger className="text-md font-medium">
                Conversation Examples
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {interactionConfig.examples.map((example: any, index: number) => (
                  <div key={index} className="border rounded-md p-3">
                    <h4 className="text-sm font-semibold mb-2">{example.context}</h4>
                    <div className="whitespace-pre-line text-sm text-muted-foreground bg-muted p-2 rounded">
                      {example.dialogue}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}; 