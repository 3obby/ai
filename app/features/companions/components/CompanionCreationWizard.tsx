'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import axios from 'axios';
import { Button } from '@/app/shared/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/app/shared/components/ui/card';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/app/shared/components/ui/form';
import { Input } from '@/app/shared/components/ui/input';
import { Textarea } from '@/app/shared/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/app/shared/components/ui/select';
import { Slider } from '@/app/shared/components/ui/slider';
import { useToast } from '@/app/shared/hooks/use-toast';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { BotIcon, ArrowRight, ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/app/shared/components/ui/progress';

// Step 1: Basic Information Schema
const basicInfoSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  category: z.string().min(1, { message: "Please select a category" }),
  imageUrl: z.string().url({ message: "Please provide a valid image URL" }).optional(),
});

// Step 2: Personality Schema
const personalitySchema = z.object({
  instructions: z.string().min(20, { message: "Instructions must be at least 20 characters" }),
  analyticalCreative: z.number().min(0).max(10),
  formalCasual: z.number().min(0).max(10),
  seriousHumorous: z.number().min(0).max(10),
  reservedEnthusiastic: z.number().min(0).max(10),
  practicalTheoretical: z.number().min(0).max(10),
});

// Step 3: Knowledge Schema
const knowledgeSchema = z.object({
  primaryExpertise: z.string().min(1, { message: "Please provide a primary expertise area" }),
  secondaryExpertise: z.string().optional(),
  knowledgeDepth: z.number().min(0).max(10),
  confidenceThreshold: z.number().min(0).max(10),
  sourcePreference: z.string(),
  citationStyle: z.string(),
});

// Define wizard steps
const STEPS = [
  { id: 'basic', title: 'Basic Information', schema: basicInfoSchema },
  { id: 'personality', title: 'Personality Configuration', schema: personalitySchema },
  { id: 'knowledge', title: 'Knowledge Configuration', schema: knowledgeSchema },
  { id: 'review', title: 'Review & Create', schema: z.object({}) }
];

export default function CompanionCreationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    basic: {
      name: '',
      description: '',
      category: '',
      imageUrl: 'https://ui-avatars.com/api/?background=random',
    },
    personality: {
      instructions: '',
      analyticalCreative: 5,
      formalCasual: 5,
      seriousHumorous: 5,
      reservedEnthusiastic: 5,
      practicalTheoretical: 5,
    },
    knowledge: {
      primaryExpertise: '',
      secondaryExpertise: '',
      knowledgeDepth: 5,
      confidenceThreshold: 7,
      sourcePreference: 'balanced',
      citationStyle: 'none',
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Create form for current step
  const currentStepData = STEPS[currentStep];
  const form = useForm({
    resolver: zodResolver(currentStepData.schema),
    defaultValues: formData[currentStepData.id === 'review' ? 'basic' : currentStepData.id],
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Handle step submission
  const onSubmit = async (values) => {
    // Update form data with new values
    setFormData({
      ...formData,
      [currentStepData.id]: values,
    });

    // If we're on the last step, submit the form
    if (currentStep === STEPS.length - 1) {
      try {
        setIsSubmitting(true);
        
        // Consolidate form data
        const { basic, personality, knowledge } = formData;
        
        // Prepare personalization configs
        const personalityConfig = {
          traits: {
            analyticalCreative: personality.analyticalCreative,
            formalCasual: personality.formalCasual,
            seriousHumorous: personality.seriousHumorous,
            reservedEnthusiastic: personality.reservedEnthusiastic,
            practicalTheoretical: personality.practicalTheoretical,
          }
        };
        
        const knowledgeConfig = {
          primaryExpertise: knowledge.primaryExpertise,
          secondaryExpertise: knowledge.secondaryExpertise || '',
          knowledgeDepth: knowledge.knowledgeDepth,
          confidenceThreshold: knowledge.confidenceThreshold,
          sourcePreference: knowledge.sourcePreference,
          citationStyle: knowledge.citationStyle,
        };
        
        // Submit to API
        await axios.post('/api/companion', {
          name: basic.name,
          description: basic.description,
          instructions: personality.instructions,
          category: basic.category,
          imageUrl: basic.imageUrl,
          personalityConfig: JSON.stringify(personalityConfig),
          knowledgeConfig: JSON.stringify(knowledgeConfig),
        });
        
        // Show success toast
        toast({
          title: "Companion created!",
          description: `${basic.name} has been successfully created.`,
        });
        
        // Redirect to companions page
        router.push('/companions');
        
      } catch (error) {
        console.error(error);
        toast({
          title: "Error creating companion",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Move to next step
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle going back to previous step
  const onBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render appropriate form fields based on current step
  const renderFormFields = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Math Tutor" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your AI companion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="productivity">Productivity</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="health">Health & Wellness</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The category that best describes your companion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel>Avatar URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to an image for your companion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <div className="mb-4 flex justify-center">
                  <ServerAvatar
                    src={form.watch('imageUrl') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(form.watch('name') || 'AI Companion')}
                    alt={form.watch('name') || 'AI Companion'}
                    className="w-24 h-24"
                    fallback={<BotIcon className="w-12 h-12" />}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="A helpful companion that can..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of what your companion does
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        );
        
      case 1: // Personality Configuration
        return (
          <>
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="You are an AI companion that helps users with..." 
                      className="min-h-[150px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed instructions for how your companion should behave and respond
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="mt-6 space-y-6">
              <FormField
                control={form.control}
                name="analyticalCreative"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analytical vs. Creative</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Analytical</span>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value]}
                          min={0}
                          max={10}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">Creative</span>
                    </div>
                    <FormDescription>
                      How analytical or creative your companion should be
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="formalCasual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formal vs. Casual</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Formal</span>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value]}
                          min={0}
                          max={10}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">Casual</span>
                    </div>
                    <FormDescription>
                      The formality level of your companion's communication style
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="seriousHumorous"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serious vs. Humorous</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Serious</span>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value]}
                          min={0}
                          max={10}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">Humorous</span>
                    </div>
                    <FormDescription>
                      How serious or humorous your companion should be
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );
        
      case 2: // Knowledge Configuration
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="primaryExpertise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Expertise</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mathematics, History, Programming" {...field} />
                    </FormControl>
                    <FormDescription>
                      The main area of expertise for your companion
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="secondaryExpertise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Expertise (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Physics, Geography" {...field} />
                    </FormControl>
                    <FormDescription>
                      A secondary area of expertise (if applicable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="mt-6 space-y-6">
              <FormField
                control={form.control}
                name="knowledgeDepth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Knowledge Depth (General to Specialized)</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">General</span>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value]}
                          min={0}
                          max={10}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">Specialized</span>
                    </div>
                    <FormDescription>
                      How general or specialized your companion's knowledge should be
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confidenceThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence Threshold</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Lower</span>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value]}
                          min={0}
                          max={10}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">Higher</span>
                    </div>
                    <FormDescription>
                      Threshold for expressing uncertainty (higher value means more certainty required before answering)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sourcePreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Preference</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="industry">Industry</SelectItem>
                          <SelectItem value="news">News</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Preferred sources of information
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="citationStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Citation Style</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select citation style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="inline">Inline</SelectItem>
                          <SelectItem value="footnote">Footnote</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How your companion should cite information
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        );
        
      case 3: // Review & Create
        const { basic, personality, knowledge } = formData;
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <ServerAvatar
                src={basic.imageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(basic.name)}
                alt={basic.name}
                className="w-24 h-24 mx-auto"
                fallback={<BotIcon className="w-12 h-12" />}
              />
              <h3 className="text-xl font-semibold mt-3">{basic.name}</h3>
              <p className="text-muted-foreground">{basic.category}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-medium mb-2">Basic Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground">{basic.description}</p>
                  </div>
                </div>
                
                <h4 className="text-lg font-medium mt-6 mb-2">Personality Configuration</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Instructions:</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{personality.instructions}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div>
                      <span className="text-sm font-medium">Analytical-Creative:</span>
                      <p className="text-sm text-muted-foreground">{personality.analyticalCreative}/10</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Formal-Casual:</span>
                      <p className="text-sm text-muted-foreground">{personality.formalCasual}/10</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Serious-Humorous:</span>
                      <p className="text-sm text-muted-foreground">{personality.seriousHumorous}/10</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-2">Knowledge Configuration</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Primary Expertise:</span>
                    <p className="text-sm text-muted-foreground">{knowledge.primaryExpertise}</p>
                  </div>
                  {knowledge.secondaryExpertise && (
                    <div>
                      <span className="text-sm font-medium">Secondary Expertise:</span>
                      <p className="text-sm text-muted-foreground">{knowledge.secondaryExpertise}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div>
                      <span className="text-sm font-medium">Knowledge Depth:</span>
                      <p className="text-sm text-muted-foreground">{knowledge.knowledgeDepth}/10</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Confidence Threshold:</span>
                      <p className="text-sm text-muted-foreground">{knowledge.confidenceThreshold}/10</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Source Preference:</span>
                      <p className="text-sm text-muted-foreground">{knowledge.sourcePreference}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Citation Style:</span>
                      <p className="text-sm text-muted-foreground">{knowledge.citationStyle}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your AI Companion</CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            {renderFormFields()}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={currentStep === 0 || isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Companion
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 