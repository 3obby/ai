// This is a non-hook version, for use in server components
import { Companion } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

interface SimpleBadgeProps {
  companion: Companion;
}

export const SimpleBadge = ({
  companion
}: SimpleBadgeProps) => {
  // Check if companion has rich character data
  const hasFancyTraits = () => {
    try {
      const config = typeof companion.personalityConfig === 'string' 
        ? JSON.parse(companion.personalityConfig)
        : companion.personalityConfig;
        
      return !!(config?.traits?.dominant?.length);
    } catch (e) {
      return false;
    }
  };
  
  if (!hasFancyTraits()) {
    return null;
  }
  
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/10">
      <Brain className="h-3 w-3" />
      <span>Rich Character</span>
    </div>
  );
}; 