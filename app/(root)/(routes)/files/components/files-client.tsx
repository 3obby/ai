"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { useRouter } from "next/navigation";
import axios from "axios";
import { File as FileIcon, Upload, FolderPlus, Trash2, Loader2, AlertTriangle, HardDrive } from "lucide-react";

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

interface FilesClientProps {
  files: FileData[];
  fileGroups: FileGroup[];
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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("all-files");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  
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
      
      setFileGroups([...fileGroups, response.data]);
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
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Files</h2>
          <p className="text-sm text-muted-foreground">
            Upload and organize your files for AI companions
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Badge className="text-xs">
              {formatBytes(totalStorage)} used of {formatBytes(storageLimit)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {availableTokens.toLocaleString()} tokens available
            </Badge>
          </div>
          
          {/* Storage Meter */}
          <div className="w-full max-w-md mt-1">
            <div className="flex justify-between text-xs mb-1">
              <span>{storagePercentage}% used</span>
              <span>{formatBytes(remainingStorage)} remaining</span>
            </div>
            <Progress 
              value={storagePercentage} 
              className="h-2"
              color={storagePercentage > 90 ? 'bg-red-500' : 
                    storagePercentage > 75 ? 'bg-yellow-500' : 
                    'bg-primary'}
            />
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() => setIsCreatingGroup(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all-files" className="px-4">
              All Files
            </TabsTrigger>
            {fileGroups.map((group) => (
              <TabsTrigger key={group.id} value={group.id} className="px-4">
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <div className="mt-4 flex-1 flex flex-col">
          {/* Upload area */}
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-6 mb-6 transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${remainingStorage <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center text-center">
              {remainingStorage <= 0 ? (
                <>
                  <AlertTriangle className="h-10 w-10 mb-2 text-red-500" />
                  <h3 className="text-lg font-medium text-red-500">
                    Storage Limit Reached (5GB)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Please delete some files to free up space before uploading new files.
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">
                    {isDragActive 
                      ? "Drop files here..." 
                      : "Drag & drop files or click to upload"
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Upload documents, images, and other files to use with your AI companions.
                    Max file size: 50MB. Max total storage: 5GB.
                  </p>
                </>
              )}
              
              {isUploading && (
                <div className="w-full max-w-md mt-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Uploading and processing... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* File display area */}
          <TabsContent value="all-files" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-420px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {files.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                    <FileIcon className="h-10 w-10 mb-2 text-muted-foreground" />
                    <h3 className="text-lg font-medium">No files yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload files to get started
                    </p>
                  </div>
                ) : (
                  files.map((file) => (
                    <Card 
                      key={file.id} 
                      className="overflow-hidden"
                      draggable
                      onDragStart={() => handleDragStart(file.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${getColorForFileType(file.type)}`}>
                              <span className="text-xs font-bold">{formatFileType(file.type)}</span>
                            </div>
                            <div className="ml-2 truncate">
                              <CardTitle className="text-sm truncate">
                                {file.originalName}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(file.size)}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                  <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                                Download
                              </DropdownMenuItem>
                              {fileGroups.map((group) => (
                                <DropdownMenuItem 
                                  key={group.id}
                                  onClick={() => handleAddToGroup(file.id, group.id)}
                                >
                                  Add to {group.name}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                        {file.status === "PROCESSING" && (
                          <div className="mt-2 flex items-center text-yellow-500 text-xs">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Processing...
                          </div>
                        )}
                        {file.status === "ERROR" && (
                          <div className="mt-2 flex items-center text-red-500 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Error processing file
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* File group tabs */}
          {fileGroups.map((group) => (
            <TabsContent key={group.id} value={group.id} className="flex-1 overflow-hidden">
              <div 
                className="border-2 border-dashed rounded-lg p-4 mb-4 min-h-[100px] transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDropOnGroup(group.id);
                }}
              >
                <h3 className="text-sm font-medium mb-2">Drag files here to add to this group</h3>
                <p className="text-xs text-muted-foreground">{group.description || "No description"}</p>
              </div>
              
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.files.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <FileIcon className="h-10 w-10 mb-2 text-muted-foreground" />
                      <h3 className="text-lg font-medium">No files in this group</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Drag files here or use the dropdown menu to add files
                      </p>
                    </div>
                  ) : (
                    group.files.map(({ fileId, file }) => (
                      <Card key={fileId} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${getColorForFileType(file.type)}`}>
                                <span className="text-xs font-bold">{formatFileType(file.type)}</span>
                              </div>
                              <div className="ml-2 truncate">
                                <CardTitle className="text-sm truncate">
                                  {file.originalName}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {formatBytes(file.size)}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveFromGroup(fileId, group.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                              <span className="sr-only">Remove from group</span>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </div>
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
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                placeholder="Enter group description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilesClient; 