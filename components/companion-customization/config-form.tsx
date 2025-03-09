"use client";

import { useState } from "react";
import { PersonalityForm } from "@/components/companion-customization/personality-form";
import { KnowledgeForm } from "@/components/companion-customization/knowledge-form";
import { InteractionForm } from "@/components/companion-customization/interaction-form";
import { ToolForm } from "@/components/companion-customization/tool-form";
import { useCompanionConfig } from "@/hooks/use-companion-config";
import { Button } from "@/components/ui/button";
import { Loader2, SaveIcon, CheckCircle } from "lucide-react";
import { Companion } from "@prisma/client";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface CompanionConfigFormProps {
  companion: Companion;
  companionId: string;
}

export const CompanionConfigForm = ({
  companion,
  companionId
}: CompanionConfigFormProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personality");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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
      const success = await saveAllChanges();
      
      if (success) {
        setSaveSuccess(true);
        toast({
          title: "Configuration saved",
          description: "Your companion's configuration has been updated successfully.",
        });
        
        // Reset success indicator after a moment
        setTimeout(() => setSaveSuccess(false), 3000);
        
        // Refresh the page data
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to save",
          description: "There was an error saving your companion's configuration.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
        <h3 className="font-bold mb-2">Error Loading Configuration</h3>
        <p>{error}</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => router.refresh()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="interaction">Interaction</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="ml-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

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
    </div>
  );
}; 