"use client";

import { useState } from "react";
import { PenIcon, TrashIcon, CheckIcon, XIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileData } from "../../types";
import { formatBytes, formatFileType, getColorForFileType } from "../../utils/format";
import { cn } from "@/lib/utils";

interface FileListItemProps {
  file: FileData;
  onEdit?: (file: FileData, newText: string) => void;
  onDelete?: (file: FileData) => void;
  onView?: (file: FileData) => void;
  className?: string;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

export const FileListItem = ({
  file,
  onEdit,
  onDelete,
  onView,
  className,
  isDragging = false,
  isSelected = false,
  onSelect,
}: FileListItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(file.description || "");

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(file.description || "");
  };

  const handleSave = () => {
    if (onEdit) {
      onEdit(file, editText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(file.description || "");
  };

  const fileTypeColor = getColorForFileType(file.type);
  const formattedType = formatFileType(file.type);
  const formattedSize = formatBytes(file.size);

  return (
    <div 
      className={cn(
        "grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/30 transition-colors",
        isSelected && "bg-primary/10",
        isDragging && "opacity-50",
        className
      )}
      onClick={onSelect}
    >
      <div className="col-span-5 md:col-span-6 flex items-center space-x-3">
        <div 
          className={cn(
            "w-8 h-8 rounded flex items-center justify-center text-white flex-shrink-0",
            fileTypeColor
          )}
        >
          {formattedType.slice(0, 2).toUpperCase()}
        </div>
        <div className="truncate">
          <p className="font-medium truncate">{file.name}</p>
          {!isEditing && file.description && (
            <p className="text-xs text-muted-foreground truncate">{file.description}</p>
          )}
          {isEditing && (
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="mt-1 h-7 text-xs"
              placeholder="Add a description..."
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          )}
        </div>
      </div>
      
      <div className="col-span-3 md:col-span-2 text-sm text-muted-foreground">
        {formattedType}
      </div>
      
      <div className="col-span-2 text-sm text-muted-foreground">
        {formattedSize}
      </div>
      
      <div className="col-span-2 flex items-center space-x-1 justify-end">
        {isEditing ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-green-500" 
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-destructive" 
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {onView && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={(e) => {
                  e.stopPropagation();
                  onView(file);
                }}
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
            >
              <PenIcon className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file);
                }}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 