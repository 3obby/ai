"use client";

import { Companion, Message } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger
} from "@/components/ui/sheet";
import { MessagesSquare, Bot, ExternalLink } from "lucide-react";
import { SimpleBadge } from '@/app/components/character-framework/SimpleBadge';
import Link from 'next/link';

interface ChatHeaderProps {
  companion: Companion;
  chatMessages: Message[];
}

export const ChatHeader = ({
  companion,
  chatMessages,
}: ChatHeaderProps) => {
  // Get the companion description safely
  const getDescription = () => {
    try {
      // @ts-ignore - We know this field exists in our updated schema
      return companion.description || "A helpful AI companion.";
    } catch (error) {
      return "A helpful AI companion.";
    }
  };
  
  const description = getDescription();
  
  // Check if companion has rich character data
  const hasRichProfile = () => {
    try {
      const config = typeof companion.personalityConfig === 'string' 
        ? JSON.parse(companion.personalityConfig)
        : companion.personalityConfig;
        
      return !!(config?.traits?.dominant?.length);
    } catch (e) {
      return false;
    }
  };
  
  return (
    <div className="flex w-full justify-between items-center border-b border-primary/10 pb-4">
      <div className="flex gap-x-2 items-center">
        <Button size="icon" variant="ghost">
          <MessagesSquare className="h-6 w-6" />
        </Button>
        <div className="flex flex-col gap-y-1">
          <div className="flex items-center gap-x-2">
            <p className="font-bold">{companion.name}</p>
            <SimpleBadge companion={companion} />
          </div>
          <p className="text-xs text-muted-foreground">
            {chatMessages.length} messages with {companion.name}
          </p>
        </div>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Bot className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>{companion.name}</SheetTitle>
            <SheetDescription className="text-sm">
              {description}
            </SheetDescription>
          </SheetHeader>
          {hasRichProfile() && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-2">Character Profile</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {companion.name} has a rich character framework with personality traits, 
                cognitive style, and example dialogues.
              </p>
              <Link href={`/character/${companion.id}`} className="block">
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <span>View Full Character Profile</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}; 