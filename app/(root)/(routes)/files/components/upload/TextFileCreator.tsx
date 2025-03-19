"use client";

import { useState } from "react";
import { FileText, Plus, Loader2 } from "lucide-react";
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
import { useFileUpload } from "../../hooks/useFileUpload";
import { useFilesContext } from "../../context/FilesContext";

interface TextFileCreatorProps {
  className?: string;
}

export const TextFileCreator = ({ className }: TextFileCreatorProps) => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("New Text File.txt");
  const [fileContent, setFileContent] = useState("");
  const [description, setDescription] = useState("");
  
  const { uploading } = useFilesContext();
  const { createTextFile } = useFileUpload();
  
  const handleCreate = async () => {
    if (!fileName || !fileContent) return;
    
    const success = await createTextFile(fileContent, fileName, description);
    
    if (success) {
      // Reset form and close dialog
      setFileName("New Text File.txt");
      setFileContent("");
      setDescription("");
      setOpen(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={className}
          disabled={uploading}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>Create Text File</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Text File
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              disabled={uploading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter file description"
              disabled={uploading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="Enter file content"
              className="min-h-[200px] font-mono text-sm"
              disabled={uploading}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!fileName || !fileContent || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Create File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 