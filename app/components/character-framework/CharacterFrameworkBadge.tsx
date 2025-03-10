"use client";

import { Companion } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { CharacterFrameworkDisplay } from "./CharacterFrameworkDisplay";
import { Brain } from "lucide-react";

interface CharacterFrameworkBadgeProps {
  companion: Companion;
}

export const CharacterFrameworkBadge = ({
  companion
}: CharacterFrameworkBadgeProps) => {
  const [open, setOpen] = useState<boolean>(false);
  
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
  
  const personalityConfig = getPersonalityConfig();
  const hasTraits = personalityConfig.traits?.dominant?.length > 0;
  
  if (!hasTraits) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 gap-1 px-2 rounded-full bg-primary/10 hover:bg-primary/20"
        >
          <Brain className="h-3.5 w-3.5" />
          <span className="text-xs">Character Profile</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {companion.name}&apos;s Character Profile
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CharacterFrameworkDisplay companion={companion} />
        </div>
      </DialogContent>
    </Dialog>
  );
}; 