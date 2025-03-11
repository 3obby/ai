"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFilesContext } from "../../context/FilesContext";
import { cn } from "@/lib/utils";

interface FileSearchProps {
  className?: string;
}

export const FileSearch = ({ className }: FileSearchProps) => {
  const { searchQuery, setSearchQuery } = useFilesContext();
  
  const handleClear = () => {
    setSearchQuery("");
  };
  
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search files..."
        className="pl-9 pr-9 w-full"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}; 