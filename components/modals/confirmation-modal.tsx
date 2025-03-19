"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg rounded-lg">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {description}
        </p>
        <div className="mt-4 flex justify-end space-x-2">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={onConfirm}
            variant="destructive"
          >
            {isLoading ? (
              <div className="flex items-center gap-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Removing...
              </div>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 