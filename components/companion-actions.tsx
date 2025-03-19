"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Companion } from "@prisma/client";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Globe, Loader2 } from "lucide-react";

interface CompanionActionsProps {
  companion: Companion;
  currentUser?: { id: string } | null;
  availableTokens?: number;
}

const PUBLISH_TOKEN_COST = 100000;

export const CompanionActions = ({
  companion,
  currentUser,
  availableTokens = 0,
}: CompanionActionsProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const isOwner = currentUser?.id === companion.userId;
  const isPublic = !companion.private;
  
  // Check if the companion name already includes "Copy of"
  const isACopy = companion.name.startsWith("Copy of");

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      
      const response = await axios.post(`/api/companion/${companion.id}/publish`);
      
      toast({
        title: "Success!",
        description: "Your companion has been published and is now available to everyone.",
        duration: 5000,
      });
      
      router.refresh();
    } catch (error: any) {
      console.error("Error publishing companion:", error);
      
      toast({
        title: "Error",
        description: error.response?.data || "Failed to publish companion. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // If user is the owner and companion is private, show publish option
  if (isOwner && !isPublic) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1.5"
          >
            <Globe className="h-4 w-4" />
            Publish
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish companion to the community</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing your companion will make it available to all users.
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-200">
                <strong>Cost: {PUBLISH_TOKEN_COST.toLocaleString()} tokens</strong>
                <div className="text-xs mt-1">
                  You currently have {availableTokens.toLocaleString()} tokens available.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={isPublishing || availableTokens < PUBLISH_TOKEN_COST}
              className={availableTokens < PUBLISH_TOKEN_COST ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>Publish</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  
  return null;
} 