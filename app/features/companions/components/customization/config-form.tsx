"use client";

import { useState } from "react";
import { PersonalityForm } from "@/components/companion-customization/personality-form";
import { KnowledgeForm } from "@/components/companion-customization/knowledge-form";
import { InteractionForm } from "@/components/companion-customization/interaction-form";
import { ToolForm } from "@/components/companion-customization/tool-form";
import { useCompanionConfig } from "@/hooks/use-companion-config";
import { Button } from "@/components/ui/button";
import { Loader2, SaveIcon, CheckCircle, User, Brain, MessageSquare, Wrench, Pencil } from "lucide-react";
import { Companion } from "@prisma/client";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";

interface CompanionConfigFormProps {
  companion: Companion;
  companionId: string;
}

export const CompanionConfigForm = ({
  companion,
  companionId
}: CompanionConfigFormProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imageUrl, setImageUrl] = useState(companion.src);
  const [name, setName] = useState(companion.name);
  
  const { 
    config, 
    isLoading, 
    error, 
    updatePersonality, 
    updateKnowledge, 
    updateInteraction,
    updateTools,
    saveAllChanges
  } = useCompanionConfig(companionId);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // If image or name has changed, update them first
      if (imageUrl !== companion.src || name !== companion.name) {
        await axios.patch(`/api/companion/${companionId}`, {
          src: imageUrl,
          name: name,
          instructions: companion.instructions,
          categoryId: companion.categoryId,
          private: companion.private
        });
      }
      
      // Save the rest of the configuration
      await saveAllChanges();
      
      setSaveSuccess(true);
      toast({
        title: "Saved successfully",
        description: "Your companion configuration has been updated.",
      });
      
      // Reload the companion data
      router.refresh();
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "There was an error saving your changes."
      });
    } finally {
      setIsSaving(false);
      // Hide success check mark after 3 seconds
      if (saveSuccess) {
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        <p>Error loading companion configuration: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Basic Info</span>
          </TabsTrigger>
          <TabsTrigger value="personality" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Personality</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="interaction" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Interaction</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Tools</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your companion's name and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-full max-w-[200px]">
                  <ImageUpload
                    value={imageUrl}
                    onChange={setImageUrl}
                    disabled={isSaving}
                  />
                </div>
                <div className="w-full max-w-md">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="personality" className="mt-6">
          <PersonalityForm
            initialValues={config.personality}
            onChange={updatePersonality}
          />
        </TabsContent>
        
        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeForm
            initialValues={config.knowledge}
            onChange={updateKnowledge}
          />
        </TabsContent>
        
        <TabsContent value="interaction" className="mt-6">
          <InteractionForm
            initialValues={config.interaction}
            onChange={updateInteraction}
          />
        </TabsContent>
        
        <TabsContent value="tools" className="mt-6">
          <ToolForm
            initialValues={config.tools}
            onChange={updateTools}
          />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-6">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-32 flex items-center justify-center"
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saveSuccess && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
          {isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}; 