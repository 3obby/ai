'use client';

import { Companion } from "../types/companions";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/shared/components/ui/avatar";

interface TypingIndicatorProps {
  typingCompanions: Companion[];
}

export function TypingIndicator({ typingCompanions }: TypingIndicatorProps) {
  if (typingCompanions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
      <div className="flex -space-x-2">
        {typingCompanions.map((companion) => (
          <Avatar key={companion.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={companion.avatar} alt={companion.name} />
            <AvatarFallback>{companion.name[0]}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center">
        <span className="mr-2">
          {typingCompanions.length === 1
            ? `${typingCompanions[0].name} is typing`
            : `${typingCompanions.length} companions are typing`}
        </span>
        <span className="flex">
          <span className="animate-bounce">.</span>
          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
        </span>
      </div>
    </div>
  );
} 