"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  File as FileIcon, 
  Upload, 
  FolderPlus, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  HardDrive, 
  Plus, 
  PenLine, 
  ExternalLink, 
  Copy, 
  X, 
  ChevronUp, 
  ChevronDown,
  MoreVertical,
  FileText,
  Eye,
  Folder
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

// Types
interface FileData {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  url: string;
  storagePath: string;
  createdAt: string;
  status: string;
  description?: string;
  tokensCost: number;
}

interface FileGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  files: {
    fileId: string;
    file: FileData;
  }[];
}

interface UserPrompt {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: string;
}

interface FilesClientProps {
  files: FileData[];
  fileGroups: FileGroup[];
  userPrompts: UserPrompt[];
  userId: string;
  availableTokens: number;
  totalStorage: number;
  storageLimit: number;
  storagePercentage: number;
}

// Helper functions
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatFileType = (type: string) => {
  if (!type) return 'Unknown';
  
  if (type.startsWith('image/')) {
    return type.split('/')[1].toUpperCase();
  }
  
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word')) return 'DOCX';
  if (type.includes('excel')) return 'XLSX';
  if (type.includes('powerpoint')) return 'PPTX';
  if (type.includes('text/plain')) return 'TXT';
  if (type.includes('text/csv')) return 'CSV';
  if (type.includes('markdown')) return 'MD';
  if (type.includes('json')) return 'JSON';
  if (type.includes('zip')) return 'ZIP';
  
  return type.split('/').pop()?.toUpperCase() || 'File';
};

const getColorForFileType = (type: string) => {
  if (!type) return 'bg-gray-500';
  
  if (type.startsWith('image/')) return 'bg-purple-500';
  if (type.includes('pdf')) return 'bg-red-500';
  if (type.includes('word') || type.includes('text')) return 'bg-blue-500';
  if (type.includes('excel') || type.includes('csv')) return 'bg-green-500';
  if (type.includes('powerpoint')) return 'bg-orange-500';
  if (type.includes('json') || type.includes('code')) return 'bg-yellow-500';
  if (type.includes('zip')) return 'bg-gray-500';
  
  return 'bg-gray-500';
};

// The main component
const FilesClient = ({
  files: initialFiles,
  fileGroups: initialFileGroups,
  userPrompts: initialUserPrompts,
  userId,
  availableTokens,
  totalStorage,
  storageLimit,
  storagePercentage,
}: FilesClientProps) => {
  const router = useRouter();
  
  // State
  const [files, setFiles] = useState<FileData[]>(initialFiles);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>(initialFileGroups);
  const [userPrompts, setUserPrompts] = useState<UserPrompt[]>(initialUserPrompts);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("all-files");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  
  // Prompt state
  const [newPromptText, setNewPromptText] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextContent, setNewTextContent] = useState("");
  const [newTextFileName, setNewTextFileName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [isViewingFileContent, setIsViewingFileContent] = useState(false);
  const [currentFileContent, setCurrentFileContent] = useState<string>("");
  const [currentFileId, setCurrentFileId] = useState<string>("");
  const [isEditingFileContent, setIsEditingFileContent] = useState(false);
  
  // Remaining storage
  const remainingStorage = storageLimit - totalStorage;
  
  // Upload functionality with react-dropzone
  const onDrop = useCallback(async (acceptedFiles: File[], _: FileRejection[], __: DropEvent) => {
    if (acceptedFiles.length === 0) return;
    
    // Calculate total size of files being uploaded
    const totalUploadSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
    
    // Check if total upload exceeds remaining storage
    if (totalUploadSize > remainingStorage) {
      toast({
        title: "Storage Limit Exceeded",
        description: `You have ${formatBytes(remainingStorage)} remaining storage. These files require ${formatBytes(totalUploadSize)}.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Process each file sequentially to show progress
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        
        // Update progress
        setUploadProgress(Math.round((i / acceptedFiles.length) * 50));
        
        // Step 1: Get signed upload URL
        const urlResponse = await axios.post('/api/files/upload-url', {
          filename: file.name,
          contentType: file.type,
          size: file.size,
          remainingStorage, // Send remaining storage for server-side validation
        });
        
        const { uploadUrl, fileId, tokenCost } = urlResponse.data;
        
        // Show warning if token cost is high
        if (tokenCost > 100) {
          toast({
            title: "High Token Cost",
            description: `This file will cost ${tokenCost} tokens to upload and process.`,
            variant: "destructive",
          });
        }
        
        // Step 2: Upload file to signed URL
        try {
          // Check if this is a mock URL (development environment)
          const isMockUrl = uploadUrl.includes('mock-upload') || uploadUrl.includes('mock-bucket');
          
          if (isMockUrl) {
            console.log('Development mode: Skipping actual file upload to mock URL');
            // Simulate progress for development environment
            for (let p = 0; p <= 100; p += 10) {
              setUploadProgress(50 + Math.round((p / 100) * 40));
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } else {
            // Real upload in production
            await axios.put(uploadUrl, file, {
              headers: {
                'Content-Type': file.type,
              },
              onUploadProgress: (progressEvent) => {
                const percentComplete = progressEvent.total 
                  ? Math.round((progressEvent.loaded * 100) / progressEvent.total) 
                  : 0;
                
                // Scale to 50-90% of total progress
                setUploadProgress(50 + Math.round(percentComplete * 0.4));
              },
            });
          }
          
          // Step 3: Confirm upload and update file record
          await axios.post('/api/files/confirm-upload', {
            fileId,
          });
          
          setUploadProgress(90 + Math.round((i / acceptedFiles.length) * 10));
        } catch (error) {
          console.error('Error during file upload:', error);
          toast({
            title: "Upload Error",
            description: "There was an error uploading the file. The file record will still be created for development purposes.",
            variant: "destructive",
          });
          
          // In development, continue with confirmation to create the file record
          if (process.env.NODE_ENV !== 'production') {
            await axios.post('/api/files/confirm-upload', {
              fileId,
            });
          }
        }
      }
      
      // Final step: Reload files from server
      const response = await axios.get('/api/files');
      setFiles(response.data.files);
      
      toast({
        title: "Files Uploaded",
        description: `Successfully uploaded ${acceptedFiles.length} file(s).`,
      });
      
      router.refresh();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.response?.data || "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [router, remainingStorage]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || remainingStorage <= 0,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB max for individual files
  });
  
  // Handle creating a new file group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Group Name Required",
        description: "Please enter a name for your file group.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await axios.post('/api/files/groups', {
        name: newGroupName,
        description: newGroupDescription,
      });
      
      // Add empty files array to the new group
      const newGroup = {
        ...response.data,
        files: []
      };
      
      setFileGroups([...fileGroups, newGroup]);
      setNewGroupName("");
      setNewGroupDescription("");
      setIsCreatingGroup(false);
      
      toast({
        title: "Group Created",
        description: `Created file group: ${newGroupName}`,
      });
    } catch (error) {
      console.error("Create group error:", error);
      toast({
        title: "Create Group Failed",
        description: "An error occurred while creating the group.",
        variant: "destructive",
      });
    }
  };
  
  // Handle adding a file to a group
  const handleAddToGroup = async (fileId: string, groupId: string) => {
    try {
      await axios.post(`/api/files/groups/${groupId}/files`, {
        fileId,
      });
      
      // Update the fileGroups state
      const updatedGroups = fileGroups.map(group => {
        if (group.id === groupId) {
          const fileExists = group.files.some(f => f.fileId === fileId);
          if (!fileExists) {
            const file = files.find(f => f.id === fileId);
            if (file) {
              return {
                ...group,
                files: [...group.files, { fileId, file }],
              };
            }
          }
        }
        return group;
      });
      
      setFileGroups(updatedGroups);
      
      toast({
        title: "File Added to Group",
        description: "File has been added to the selected group.",
      });
    } catch (error) {
      console.error("Add to group error:", error);
      toast({
        title: "Add to Group Failed",
        description: "An error occurred while adding the file to the group.",
        variant: "destructive",
      });
    }
  };
  
  // Handle removing a file from a group
  const handleRemoveFromGroup = async (fileId: string, groupId: string) => {
    try {
      await axios.delete(`/api/files/groups/${groupId}/files/${fileId}`);
      
      // Update the fileGroups state
      const updatedGroups = fileGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            files: group.files.filter(f => f.fileId !== fileId),
          };
        }
        return group;
      });
      
      setFileGroups(updatedGroups);
      
      toast({
        title: "File Removed from Group",
        description: "File has been removed from the group.",
      });
    } catch (error) {
      console.error("Remove from group error:", error);
      toast({
        title: "Remove from Group Failed",
        description: "An error occurred while removing the file from the group.",
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting a file
  const handleDeleteFile = async (fileId: string) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      
      // Update files state
      setFiles(files.filter(f => f.id !== fileId));
      
      // Update selected files
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
      
      toast({
        title: "File Deleted",
        description: "File has been deleted successfully.",
      });
      
      // Refresh the page to update storage data
      router.refresh();
    } catch (error) {
      console.error("Delete file error:", error);
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the file.",
        variant: "destructive",
      });
    }
  };
  
  // Handle drag start
  const handleDragStart = (fileId: string) => {
    setDraggedFileId(fileId);
  };
  
  // Handle dropping a file onto a group
  const handleDropOnGroup = (groupId: string) => {
    if (draggedFileId) {
      handleAddToGroup(draggedFileId, groupId);
      setDraggedFileId(null);
    }
  };

  // Handle add new prompt
  const handleAddPrompt = async () => {
    if (!newPromptText.trim()) return;
    
    try {
      const response = await axios.post("/api/user-prompts", {
        text: newPromptText.trim(),
      });
      
      setUserPrompts((current) => [...current, response.data]);
      setNewPromptText("");
      
      toast({
        title: "Prompt added",
        description: "Your prompt has been saved.",
      });
    } catch (error) {
      console.error("Failed to add prompt:", error);
      toast({
        title: "Error",
        description: "Failed to add prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle toggle prompt active status
  const handleTogglePrompt = async (id: string) => {
    try {
      const prompt = userPrompts.find((p) => p.id === id);
      if (!prompt) return;

      // Optimistically update the UI
      const newIsActive = !prompt.isActive;

      setUserPrompts((current) =>
        current.map((p) => (p.id === id ? { ...p, isActive: newIsActive } : p))
      );

      // Update in the database
      await axios.put("/api/user-prompts", {
        id,
        isActive: newIsActive,
      });
    } catch (error) {
      console.error("Failed to toggle prompt:", error);
      
      // Revert the optimistic update on error
      const currentPrompt = userPrompts.find((p) => p.id === id);
      if (currentPrompt) {
        setUserPrompts((current) =>
          current.map((p) =>
            p.id === id ? { ...p, isActive: !currentPrompt.isActive } : p
          )
        );
      }
      
      toast({
        title: "Error",
        description: "Failed to update prompt status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle update prompt text
  const handleUpdatePromptText = async (id: string, text: string) => {
    try {
      // Optimistically update the UI
      setUserPrompts((current) =>
        current.map((p) => (p.id === id ? { ...p, text } : p))
      );

      // Update in the database
      await axios.put("/api/user-prompts", { id, text });
      setEditingPromptId(null);
      
      toast({
        title: "Prompt updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error("Failed to update prompt:", error);
      
      // Revert the optimistic update on error
      const originalPrompt = userPrompts.find((p) => p.id === id);
      if (originalPrompt) {
        setUserPrompts((current) =>
          current.map((p) => (p.id === id ? originalPrompt : p))
        );
      }
      
      toast({
        title: "Error",
        description: "Failed to update prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle remove prompt
  const handleRemovePrompt = async (id: string) => {
    try {
      await axios.delete(`/api/user-prompts?id=${id}`);
      setUserPrompts((current) => current.filter((prompt) => prompt.id !== id));
      
      toast({
        title: "Prompt removed",
        description: "Your prompt has been deleted.",
      });
    } catch (error) {
      console.error("Failed to remove prompt:", error);
      toast({
        title: "Error",
        description: "Failed to remove prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle create text file
  const handleCreateTextFile = async () => {
    if (!newTextFileName.trim() || !newTextContent.trim()) {
      toast({
        title: "Required Fields",
        description: "Please provide both a file name and content.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Create a text file
      const fileName = newTextFileName.trim().endsWith('.txt') 
        ? newTextFileName.trim() 
        : `${newTextFileName.trim()}.txt`;
      
      // Create a Blob from the text content
      const textBlob = new Blob([newTextContent], { type: 'text/plain' });
      
      // Create a File object from the Blob
      const file = new File([textBlob], fileName, { type: 'text/plain' });
      
      // Use the existing upload functionality
      const urlResponse = await axios.post('/api/files/upload-url', {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        remainingStorage,
      });
      
      const { uploadUrl, fileId } = urlResponse.data;
      
      // Upload the file to the signed URL
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
      });
      
      // Confirm upload
      await axios.post('/api/files/confirm-upload', {
        fileId,
      });
      
      // Reload files
      const response = await axios.get('/api/files');
      setFiles(response.data.files);
      
      // Reset state
      setNewTextContent("");
      setNewTextFileName("");
      setIsAddingText(false);
      
      toast({
        title: "Text File Created",
        description: `Successfully created ${fileName}.`,
      });
    } catch (error) {
      console.error('Error creating text file:', error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating your text file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle viewing and editing file content
  const handleViewFileContent = async (fileId: string) => {
    try {
      const response = await axios.get(`/api/files/${fileId}/content`);
      setCurrentFileContent(response.data.content);
      setCurrentFileId(fileId);
      setIsViewingFileContent(true);
      setIsEditingFileContent(false);
    } catch (error) {
      console.error('Error fetching file content:', error);
      toast({
        title: "Error",
        description: "Could not retrieve file content.",
        variant: "destructive",
      });
    }
  };
  
  // Handle saving edited file content
  const handleSaveFileContent = async () => {
    try {
      await axios.put(`/api/files/${currentFileId}/content`, {
        content: currentFileContent
      });
      
      setIsEditingFileContent(false);
      
      toast({
        title: "Content Updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error('Error saving file content:', error);
      toast({
        title: "Error",
        description: "Could not save your changes.",
        variant: "destructive",
      });
    }
  };
  
  // Handle expanding a group to view its files
  const handleExpandGroup = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top section with storage info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-card rounded-lg">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">Files & Storage</h1>
          <p className="text-sm text-muted-foreground">
            Manage your files, groups, and prompts
          </p>
        </div>
        <div className="w-full md:w-auto flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {formatBytes(totalStorage)} of {formatBytes(storageLimit)} used
            </span>
            <span className="text-sm text-muted-foreground">
              {storagePercentage}%
            </span>
          </div>
          <Progress value={storagePercentage} className="h-2 w-full md:w-64" />
        </div>
      </div>
      
      {/* Main action button - fixed position */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsAddingText(true)}>
              <PenLine className="h-4 w-4 mr-2" />
              New Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => document.getElementById('file-upload')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreatingGroup(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
      
      {/* Main content */}
      <Tabs 
        defaultValue="all-files" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex-1"
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="all-files">Files</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
        </TabsList>
        
        {/* Files Tab */}
        <TabsContent value="all-files" className="flex-1 relative">
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <Progress value={uploadProgress} className="w-64 h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <motion.div
                key={file.id}
                layoutId={`file-${file.id}`}
                className="relative cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={() => handleDragStart(file.id)}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-white mr-2 ${getColorForFileType(file.type)}`}>
                          <span className="text-xs font-bold">{formatFileType(file.type)}</span>
                        </div>
                        <CardTitle className="text-base truncate max-w-[180px]">
                          {file.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.type === 'text/plain' && (
                            <DropdownMenuItem onClick={() => handleViewFileContent(file.id)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View/Edit Content
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open File
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(file.url)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteFile(file.id)}>
                            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                            <span className="text-destructive">Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                    {file.description && (
                      <p className="text-sm mt-1 truncate">{file.description}</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 pb-3">
                    <Badge variant="secondary" className="text-xs">
                      {formatFileType(file.type)}
                    </Badge>
                    {file.tokensCost > 0 && (
                      <Badge className="ml-2 text-xs bg-amber-500">
                        {file.tokensCost} tokens
                      </Badge>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
          
          {files.length === 0 && !isUploading && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
              <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No files yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Upload files or create text notes to organize your content
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setIsAddingText(true)}>
                  <PenLine className="h-4 w-4 mr-2" />
                  Create Text
                </Button>
                <Button onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          )}
          
          {/* Hidden file input */}
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const fileList = Array.from(e.target.files);
                onDrop(fileList, [], new Event('change') as unknown as DropEvent);
              }
            }}
          />
        </TabsContent>
        
        {/* Groups Tab */}
        <TabsContent value="groups" className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fileGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <motion.div
                  layoutId={`group-${group.id}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-primary');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-primary');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary');
                    handleDropOnGroup(group.id);
                  }}
                  onClick={() => handleExpandGroup(group.id)}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Card className="cursor-pointer hover:border-primary transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <Folder className="h-5 w-5 mr-2 text-primary" />
                          <CardTitle className="text-base">{group.name}</CardTitle>
                        </div>
                        <Badge>{group.files.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between">
                      <p className="text-xs text-muted-foreground">
                        {group.files.length} files
                      </p>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {expandedGroupId === group.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
                
                {/* Expanded group files */}
                <AnimatePresence>
                  {expandedGroupId === group.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <Card className="p-4 border-dashed">
                        {group.files.length === 0 ? (
                          <p className="text-sm text-center text-muted-foreground py-4">
                            Drag and drop files here to add them to this group
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {group.files.map(({ file }) => (
                              <div key={file.id} className="flex items-center justify-between p-2 border rounded-md">
                                <div className="flex items-center">
                                  <div className={`w-6 h-6 rounded flex items-center justify-center text-white mr-2 ${getColorForFileType(file.type)}`}>
                                    <span className="text-xs font-bold">{formatFileType(file.type)}</span>
                                  </div>
                                  <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFromGroup(file.id, group.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          
          {fileGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
              <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No groups yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Create groups to organize your files and share them with your companions
              </p>
              <Button onClick={() => setIsCreatingGroup(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          )}
        </TabsContent>
        
        {/* Prompts Tab */}
        <TabsContent value="prompts" className="flex-1">
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <h3 className="text-lg font-medium">Your Prompts</h3>
              <p className="text-sm text-muted-foreground">
                Add, edit, and manage prompts that will be applied to your
                conversations. Toggle the switch to activate or deactivate each
                prompt.
              </p>
            </div>
            
            <div className="space-y-4">
              {userPrompts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No prompts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Add prompts to enhance your conversations with AI companions
                  </p>
                </div>
              ) : (
                userPrompts.map((prompt) => (
                  <motion.div
                    key={prompt.id}
                    layoutId={`prompt-${prompt.id}`}
                    className="flex items-start gap-3 p-3 border rounded-md"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <div className="mt-1">
                      <Switch
                        checked={prompt.isActive}
                        onCheckedChange={() => handleTogglePrompt(prompt.id)}
                      />
                    </div>
                    <div className="flex-1">
                      {editingPromptId === prompt.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={prompt.text}
                            onChange={(e) => {
                              setUserPrompts(userPrompts.map(p => 
                                p.id === prompt.id 
                                  ? { ...p, text: e.target.value } 
                                  : p
                              ));
                            }}
                            className="w-full min-h-[80px] resize-y"
                            placeholder="Enter prompt text..."
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingPromptId(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleUpdatePromptText(prompt.id, prompt.text)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="p-2 bg-muted/50 rounded-md"
                          onClick={() => setEditingPromptId(prompt.id)}
                        >
                          <p className="whitespace-pre-wrap">{prompt.text}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePrompt(prompt.id)}
                      className="h-9 w-9 text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              <Textarea
                placeholder="Add a new prompt..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="w-full min-h-[80px] resize-y"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleAddPrompt();
                }}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-muted-foreground">
                  Press Ctrl+Enter to add
                </span>
                <Button onClick={handleAddPrompt}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Create Group Dialog */}
      <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create File Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your files
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Textarea
                id="group-description"
                placeholder="Enter description..."
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Text Dialog */}
      <Dialog open={isAddingText} onOpenChange={setIsAddingText}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Text Note</DialogTitle>
            <DialogDescription>
              Add text content that will be converted to a file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="text-name">File Name</Label>
              <Input
                id="text-name"
                placeholder="Enter file name..."
                value={newTextFileName}
                onChange={(e) => setNewTextFileName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                .txt extension will be added if not specified
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-content">Content</Label>
              <Textarea
                id="text-content"
                placeholder="Enter your text here..."
                value={newTextContent}
                onChange={(e) => setNewTextContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingText(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTextFile}
              disabled={isUploading}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View/Edit File Content Dialog */}
      <Dialog open={isViewingFileContent} onOpenChange={setIsViewingFileContent}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>File Content</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditingFileContent(!isEditingFileContent)}
              >
                {isEditingFileContent ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    View Mode
                  </>
                ) : (
                  <>
                    <PenLine className="mr-2 h-4 w-4" />
                    Edit Mode
                  </>
                )}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {isEditingFileContent ? (
              <Textarea
                value={currentFileContent}
                onChange={(e) => setCurrentFileContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm resize-y border-none focus-visible:ring-0"
              />
            ) : (
              <div className="p-4 font-mono text-sm whitespace-pre-wrap bg-muted/30 rounded-md">
                {currentFileContent}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewingFileContent(false)}>
              Close
            </Button>
            {isEditingFileContent && (
              <Button onClick={handleSaveFileContent}>
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* File upload dropzone - hidden but functional */}
      <div {...getRootProps()} className="hidden">
        <input {...getInputProps()} />
      </div>
    </div>
  );
};

export default FilesClient; 