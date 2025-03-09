"use client";

import { useState, useEffect } from "react";
import { InteractionConfigType } from "@/types/companion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  RadioGroup, 
  RadioGroupItem 
} from "@/components/ui/radio-group";

interface InteractionFormProps {
  initialValues: InteractionConfigType;
  onChange: (values: InteractionConfigType) => void;
}

export const InteractionForm = ({
  initialValues,
  onChange
}: InteractionFormProps) => {
  const [values, setValues] = useState<InteractionConfigType>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = <K extends keyof InteractionConfigType>(
    key: K, 
    value: InteractionConfigType[K]
  ) => {
    const newValues = {
      ...values,
      [key]: value
    };
    setValues(newValues);
    onChange(newValues);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Interaction Patterns</CardTitle>
        <CardDescription>
          Configure how your companion interacts in conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Initiative Level</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Passive</Label>
              <Label>Proactive</Label>
            </div>
            <Slider 
              value={[values.initiativeLevel]} 
              min={0} 
              max={10} 
              step={1}
              onValueChange={(value) => handleChange('initiativeLevel', value[0])}
            />
            <div className="text-sm text-muted-foreground text-center">
              {values.initiativeLevel <= 3 ? 'Primarily responds to questions, minimal unprompted suggestions' : 
               values.initiativeLevel >= 7 ? 'Proactively offers suggestions, asks follow-up questions, and guides the conversation' : 
               'Balanced between responding and offering some guidance'}
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Conversational Memory</h3>
          
          <RadioGroup 
            value={values.conversationalMemory}
            onValueChange={(value) => 
              handleChange('conversationalMemory', value as InteractionConfigType['conversationalMemory'])
            }
            className="space-y-3"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="minimal" id="minimal-memory" className="mt-1" />
              <div>
                <Label htmlFor="minimal-memory">Minimal Memory</Label>
                <p className="text-sm text-muted-foreground">
                  Focuses primarily on the most recent messages with limited recall of earlier conversation
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="moderate" id="moderate-memory" className="mt-1" />
              <div>
                <Label htmlFor="moderate-memory">Moderate Memory</Label>
                <p className="text-sm text-muted-foreground">
                  Remembers key information from the current conversation
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="extensive" id="extensive-memory" className="mt-1" />
              <div>
                <Label htmlFor="extensive-memory">Extensive Memory</Label>
                <p className="text-sm text-muted-foreground">
                  Maintains detailed knowledge of the conversation history and references past interactions
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Follow-Up Behavior</h3>
          
          <RadioGroup 
            value={values.followUpBehavior}
            onValueChange={(value) => 
              handleChange('followUpBehavior', value as InteractionConfigType['followUpBehavior'])
            }
            className="space-y-3"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="none" id="none-followup" className="mt-1" />
              <div>
                <Label htmlFor="none-followup">No Follow-up Questions</Label>
                <p className="text-sm text-muted-foreground">
                  Responds directly without asking clarifying or follow-up questions
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="occasional" id="occasional-followup" className="mt-1" />
              <div>
                <Label htmlFor="occasional-followup">Occasional Follow-ups</Label>
                <p className="text-sm text-muted-foreground">
                  Sometimes asks clarifying questions when necessary
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="frequent" id="frequent-followup" className="mt-1" />
              <div>
                <Label htmlFor="frequent-followup">Frequent Follow-ups</Label>
                <p className="text-sm text-muted-foreground">
                  Regularly asks clarifying questions and explores topics in depth
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Advanced Interaction Options</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="feedback-loop" className="text-base">Feedback Loop</Label>
                <p className="text-sm text-muted-foreground">
                  Occasionally ask for feedback on response quality
                </p>
              </div>
              <Switch 
                id="feedback-loop"
                checked={values.feedbackLoop}
                onCheckedChange={(checked) => handleChange('feedbackLoop', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="multi-turn" className="text-base">Multi-turn Reasoning</Label>
                <p className="text-sm text-muted-foreground">
                  Break down complex responses into step-by-step explanations
                </p>
              </div>
              <Switch 
                id="multi-turn"
                checked={values.multiTurnReasoning}
                onCheckedChange={(checked) => handleChange('multiTurnReasoning', checked)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 