"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Companion } from "@prisma/client";
import { CompanionConfigForm } from "@/components/companion-customization/config-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CompanionConfigPageProps {
  params: {
    companionId: string;
  };
}

export default function CompanionConfigPage({
  params
}: CompanionConfigPageProps) {
  const router = useRouter();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanion = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/companion/${params.companionId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Companion not found");
          } else if (response.status === 401) {
            throw new Error("Unauthorized access");
          } else {
            throw new Error(`Error fetching companion: ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        setCompanion(data);
      } catch (err) {
        console.error("Failed to fetch companion:", err);
        setError(err instanceof Error ? err.message : "Failed to load companion data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCompanion();
  }, [params.companionId]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading companion configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
              <Button onClick={() => router.push("/dashboard")} variant="outline">
                Return to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Companion Not Found</AlertTitle>
          <AlertDescription>
            The companion you are trying to configure does not exist or you don't have permission to access it.
            <div className="mt-4">
              <Button onClick={() => router.push("/dashboard")} variant="outline">
                Return to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full p-4 space-y-6 overflow-y-auto max-w-5xl mx-auto pb-20">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configure Companion</h1>
        <p className="text-sm text-muted-foreground">
          Customize {companion.name}&apos;s behavior and capabilities
        </p>
      </div>
      
      <CompanionConfigForm 
        companion={companion}
        companionId={params.companionId}
      />
    </div>
  );
} 