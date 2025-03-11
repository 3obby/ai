"use client";

import { useState } from "react";
import { 
  Trash2, 
  FolderPlus, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFilesContext } from "../../context/FilesContext";
import { useFileManagement } from "../../hooks/useFileManagement";
import { cn } from "@/lib/utils";

interface FileBulkActionsProps {
  className?: string;
}

export const FileBulkActions = ({ className }: FileBulkActionsProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { selectedFiles, setSelectedFiles, fileGroups } = useFilesContext();
  const { deleteMultipleFiles, addFileToGroup } = useFileManagement();
  
  const selectedCount = selectedFiles.size;
  const hasSelection = selectedCount > 0;
  
  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };
  
  const handleDelete = async () => {
    if (!hasSelection) return;
    
    try {
      setIsDeleting(true);
      await deleteMultipleFiles(Array.from(selectedFiles));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting files:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleAddToGroup = async (groupId: string) => {
    if (!hasSelection) return;
    
    const fileIds = Array.from(selectedFiles);
    
    for (const fileId of fileIds) {
      await addFileToGroup(fileId, groupId);
    }
  };
  
  if (!hasSelection) {
    return null;
  }
  
  return (
    <div className={cn("flex items-center gap-2 p-2 bg-muted/50 rounded-md", className)}>
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "file" : "files"} selected
        </span>
      </div>
      
      <div className="flex-1" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderPlus className="h-4 w-4 mr-2" />
            Add to Group
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Select Group</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {fileGroups.length > 0 ? (
            fileGroups.map(group => (
              <DropdownMenuItem 
                key={group.id}
                onClick={() => handleAddToGroup(group.id)}
              >
                {group.name}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>
              No groups available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="text-destructive hover:text-destructive/90"
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleClearSelection}
      >
        <X className="h-4 w-4 mr-2" />
        Clear
      </Button>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete {selectedCount} {selectedCount === 1 ? "file" : "files"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected 
              {selectedCount === 1 ? " file" : " files"} from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 