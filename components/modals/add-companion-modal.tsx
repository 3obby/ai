"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BotAvatar } from "@/components/bot-avatar";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface AddCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (companionId: string) => void;
  existingCompanionIds: string[];
  isLoading?: boolean;
}

interface Companion {
  id: string;
  name: string;
  src: string;
  description: string;
}

export const AddCompanionModal = ({
  isOpen,
  onClose,
  onConfirm,
  existingCompanionIds,
  isLoading,
}: AddCompanionModalProps) => {
  const { toast } = useToast();
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const fetchCompanions = async () => {
      try {
        const response = await fetch("/api/companions");
        if (!response.ok) throw new Error("Failed to fetch companions");
        
        const data = await response.json();
        // Filter out companions that are already in the group
        const availableCompanions = data.filter(
          (companion: Companion) => !existingCompanionIds.includes(companion.id)
        );
        setCompanions(availableCompanions);
      } catch (error) {
        toast({
          variant: "destructive",
          description: "Failed to load companions"
        });
      }
    };

    if (isOpen) {
      fetchCompanions();
    }
  }, [isOpen, existingCompanionIds, toast]);

  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Bot to Group</DialogTitle>
          <DialogDescription>
            Select a bot to add to the group chat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading companions...</p>
            ) : companions.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No available bots to add
              </p>
            ) : (
              companions.map((companion) => (
                <div
                  key={companion.id}
                  className={`
                    flex items-center gap-x-2 p-2 rounded-lg cursor-pointer hover:bg-primary/5
                    ${selectedId === companion.id ? "bg-primary/10" : ""}
                  `}
                  onClick={() => setSelectedId(companion.id)}
                >
                  <BotAvatar src={companion.src} />
                  <div className="flex flex-col">
                    <p className="font-semibold">{companion.name}</p>
                    <p className="text-xs text-muted-foreground">{companion.description}</p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedId || isLoading}
            onClick={() => onConfirm(selectedId)}
          >
            {isLoading ? (
              <div className="flex items-center gap-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </div>
            ) : (
              "Add to Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 