"use client";

import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFilesContext } from "../../context/FilesContext";
import { cn } from "@/lib/utils";

interface StorageUsageProps {
  className?: string;
}

export const StorageUsage = ({ className }: StorageUsageProps) => {
  const { totalStorage, storageLimit, storagePercentage } = useFilesContext();
  
  // Format sizes
  const formatStorage = (bytes: number) => {
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(1)} GB`;
    } else if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${bytes} B`;
    }
  };
  
  // Determine color based on usage
  const getColorClass = () => {
    if (storagePercentage >= 90) {
      return "text-destructive";
    } else if (storagePercentage >= 75) {
      return "text-amber-500";
    } else {
      return "text-primary";
    }
  };
  
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-1">
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Storage:</span>
          <span className={cn("font-medium", getColorClass())}>
            {formatStorage(totalStorage)} / {formatStorage(storageLimit)}
          </span>
        </div>
        <span className={cn("font-medium", getColorClass())}>
          {storagePercentage}%
        </span>
      </div>
      <Progress 
        value={storagePercentage} 
        className="h-1.5"
      />
    </div>
  );
} 