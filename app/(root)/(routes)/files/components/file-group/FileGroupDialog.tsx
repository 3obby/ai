"use client";

import { useState } from "react";
import { FolderIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFileManagement } from "../../hooks/useFileManagement";

interface FileGroupDialogProps {
  className?: string;
}

export const FileGroupDialog = ({ className }: FileGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const { createFileGroup } = useFileManagement();
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    
    const success = await createFileGroup(name.trim(), description.trim() || undefined);
    
    if (success) {
      // Reset form and close dialog
      setName("");
      setDescription("");
      setOpen(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className={className}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            Create New File Group
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              className="resize-none"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 