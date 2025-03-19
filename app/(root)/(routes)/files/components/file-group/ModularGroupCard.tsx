"use client";

import { useState } from "react";
import { FolderIcon, PenIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useFileManagement } from "../../hooks/useFileManagement";
import { useFilesContext } from "../../context/FilesContext";
import { FileGroup } from "../../types";
import { cn } from "@/lib/utils";

interface ModularGroupCardProps {
  group: FileGroup;
  isActive?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ModularGroupCard = ({
  group,
  isActive = false,
  isDragging = false,
  onClick,
  className,
}: ModularGroupCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description || "");
  
  const { activeTab } = useFilesContext();
  const { updateFileGroup, deleteFileGroup } = useFileManagement();
  
  const fileCount = group.files?.length || 0;
  const isCurrentTab = activeTab === group.id;
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(group.name);
    setEditDescription(group.description || "");
  };
  
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (editName.trim()) {
      await updateFileGroup(group.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
    }
    
    setIsEditing(false);
  };
  
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteFileGroup(group.id);
  };
  
  const groupColor = group.color || "bg-primary";
  
  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer overflow-hidden",
        isActive && "ring-2 ring-primary",
        isDragging && "opacity-50",
        className
      )}
      onClick={onClick}
    >
      <div className={cn("h-1.5", groupColor)} />
      
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5 text-muted-foreground" />
            
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-7 text-sm"
                placeholder="Group name"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <CardTitle className="text-base">{group.name}</CardTitle>
            )}
          </div>
          
          {!isEditing ? (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={handleEdit}
              >
                <PenIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive" 
                onClick={handleDelete}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-green-500" 
                onClick={handleSave}
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive" 
                onClick={handleCancel}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        {isEditing ? (
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="mt-2 text-sm resize-none h-20"
            placeholder="Add a description..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            {group.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {group.description}
              </p>
            )}
            
            <div className="flex items-center text-sm">
              <Badge variant="secondary" className="mr-2">
                {fileCount} {fileCount === 1 ? "file" : "files"}
              </Badge>
              
              {isCurrentTab && (
                <Badge variant="secondary" className="bg-primary/10">
                  Current
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 