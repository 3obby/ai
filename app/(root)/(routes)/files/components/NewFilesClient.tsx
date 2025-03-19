"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone, FileRejection, DropEvent } from "react-dropzone"
import { DndContext } from "@dnd-kit/core"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertCircle,
  FileUp,
  FolderIcon,
  ListIcon,
  MessageSquarePlusIcon,
  Plus,
  PlusCircleIcon,
  SettingsIcon,
  TextIcon,
  UploadIcon,
  X,
  CheckIcon,
  ThumbsUp,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { PenIcon, TrashIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

import { DraggableFileGroups } from "./file-group/DraggableFileGroups"
import { DraggableFiles } from "./ui/DraggableFiles"
import { PromptsPanel } from "./prompts/PromptsPanel"
import { FileCard } from "./ui/FileCard"
import { FileData, FileGroup, FileUploadProgress, Prompt } from "../types"

interface NewFilesClientProps {
  files: FileData[]
  fileGroups: FileGroup[]
  userId: string
  availableTokens: number
  totalStorage: number
  storageLimit: number
  storagePercentage: number
  userPrompts?: Prompt[]
}

export default function NewFilesClient({
  files: initialFiles,
  fileGroups: initialFileGroups,
  userId,
  availableTokens,
  totalStorage,
  storageLimit,
  storagePercentage,
  userPrompts = []
}: NewFilesClientProps) {
  // State
  const [files, setFiles] = useState<FileData[]>(initialFiles)
  const [fileGroups, setFileGroups] = useState<FileGroup[]>(initialFileGroups)
  const [activeTab, setActiveTab] = useState("files")
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>(initialFiles)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<FileUploadProgress[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showTextInputDialog, setShowTextInputDialog] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [textFileName, setTextFileName] = useState("")
  const [newTextContent, setNewTextContent] = useState("")
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])
  const [editingGroup, setEditingGroup] = useState<FileGroup | null>(null)
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // New state for modals and ghost groups
  const [selectedGroup, setSelectedGroup] = useState<FileGroup | null>(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [promptEditText, setPromptEditText] = useState("")
  const [ghostGroups, setGhostGroups] = useState<FileGroup[]>([])
  const [dragType, setDragType] = useState<'file' | 'group' | null>(null)
  const [showGhostPrompt, setShowGhostPrompt] = useState(false)
  const [ghostPrompt, setGhostPrompt] = useState<Prompt | null>(null)
  
  // Remaining storage
  const remainingStorage = storageLimit - totalStorage
  
  // File upload and drag/drop functionality
  const onDrop = useCallback(async (acceptedFiles: File[], _: FileRejection[], __: DropEvent) => {
    if (acceptedFiles.length === 0) return;
    
    // Calculate total size of files being uploaded
    const totalUploadSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
    
    // Check if total upload exceeds remaining storage
    if (totalUploadSize > remainingStorage) {
      toast({
        title: "Storage Limit Exceeded",
        description: "The files you're trying to upload exceed your available storage. Please upgrade your plan or free up space.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setShowUploadDialog(false); // Close the dialog if open
    
    // Create unique IDs for tracking uploads
    const uploadIds = acceptedFiles.map(() => crypto.randomUUID());
    
    // Initialize progress tracking for each file
    const uploads = acceptedFiles.map((file, index) => ({
      id: uploadIds[index],
      progress: 0,
      filename: file.name,
    }));
    
    setUploadingFiles(uploads);
    
    try {
      // Process each file
      const uploadPromises = acceptedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file);
        
        try {
          const response = await axios.post("/api/files", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = progressEvent.total 
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total) 
                : 0;
              
              setUploadingFiles(current => 
                current.map(item => 
                  item.id === uploadIds[index] 
                    ? { ...item, progress: percentCompleted } 
                    : item
                )
              );
            },
          });
          
          return response.data;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          
          // Mark this upload as failed
          setUploadingFiles(current => 
            current.map(item => 
              item.id === uploadIds[index] 
                ? { ...item, error: "Failed to upload file" } 
                : item
            )
          );
          
          return null;
        }
      });
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Filter out any failed uploads
      const successfulUploads = results.filter(Boolean);
      
      // Add new files to state
      if (successfulUploads.length > 0) {
        setFiles(current => [...successfulUploads, ...current]);
        setFilteredFiles(current => [...successfulUploads, ...current]);
        
        toast({
          title: "Files Uploaded",
          description: `Successfully uploaded ${successfulUploads.length} file${successfulUploads.length === 1 ? "" : "s"}.`,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear upload progress tracking after a delay to let the user see the completion
      setTimeout(() => {
        setUploadingFiles([]);
      }, 3000);
    }
  }, [remainingStorage]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true,
  });
  
  // Filter files based on search
  const handleFileSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredFiles(files);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = files.filter(file => 
      file.originalName.toLowerCase().includes(lowerQuery) ||
      (file.description && file.description.toLowerCase().includes(lowerQuery))
    );
    
    setFilteredFiles(filtered);
  };
  
  // Create a new file group
  const handleCreateGroup = async (name: string, description?: string) => {
    try {
      const response = await axios.post('/api/files/groups', {
        name,
        description,
      });
      
      // Add empty files array to the new group
      const newGroup = {
        ...response.data,
        files: []
      };
      
      setFileGroups([...fileGroups, newGroup]);
      
      toast({
        title: "Group Created",
        description: `Created file group: ${name}`,
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
  
  // Edit a file group
  const handleEditGroup = async (groupId: string, name: string, description?: string) => {
    try {
      await axios.put(`/api/files/groups/${groupId}`, {
        name,
        description,
      });
      
      setFileGroups(current => 
        current.map(group => 
          group.id === groupId 
            ? { ...group, name, description } 
            : group
        )
      );
      
      toast({
        title: "Group Updated",
        description: `Updated file group: ${name}`,
      });
    } catch (error) {
      console.error("Edit group error:", error);
      toast({
        title: "Update Group Failed",
        description: "An error occurred while updating the group.",
        variant: "destructive",
      });
    }
  };
  
  // Delete a file group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Optimistically update UI
      setFileGroups(current => current.filter(g => g.id !== groupId));
      
      // Show pending deletion toast
      const pendingToast = toast({
        title: "Deleting group...",
        description: "Please wait while we delete the group",
      });
      
      // Make the API call with the correct endpoint format
      const response = await axios.delete(`/api/files/groups?id=${groupId}`);
      
      // Update toast on success
      toast({
        title: "Group deleted",
        description: "The file group was deleted successfully",
      });
      
      // Check if any files need to be refreshed
      if (response.data?.refreshFiles) {
        const filesResponse = await axios.get("/api/files");
        setFiles(filesResponse.data);
        setFilteredFiles(filesResponse.data);
      }
      
      // Close modal if open for this group
      if (showGroupModal && selectedGroup && selectedGroup.id === groupId) {
        setShowGroupModal(false);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      
      // Log more detail to help debug
      if (axios.isAxiosError(error)) {
        console.error("API response data:", error.response?.data);
        console.error("API response status:", error.response?.status);
      }
      
      // Revert the optimistic update
      try {
        const groupsResponse = await axios.get("/api/files/groups");
        setFileGroups(groupsResponse.data);
      } catch (e) {
        console.error("Failed to refresh groups after error:", e);
      }
      
      toast({
        title: "Error",
        description: "Could not delete group. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Add a file to a group
  const handleAddFileToGroup = async (groupId: string, fileId: string) => {
    try {
      await axios.post(`/api/files/groups/${groupId}/files`, {
        fileId,
      });
      
      // Find the file
      const file = files.find(f => f.id === fileId);
      
      if (!file) return;
      
      // Update the group with the new file
      setFileGroups(current => 
        current.map(group => {
          if (group.id === groupId) {
            // Check if file already exists in group
            if (group.files.some(f => f.fileId === fileId)) {
              return group;
            }
            
            return {
              ...group,
              files: [...group.files, { fileId, file }],
            };
          }
          return group;
        })
      );
      
      toast({
        title: "File Added",
        description: "File has been added to the group.",
      });
    } catch (error) {
      console.error("Add file to group error:", error);
      toast({
        title: "Add to Group Failed",
        description: "An error occurred while adding the file to the group.",
        variant: "destructive",
      });
    }
  };
  
  // Remove a file from a group
  const handleRemoveFileFromGroup = async (groupId: string, fileId: string) => {
    try {
      await axios.delete(`/api/files/groups/${groupId}/files/${fileId}`);
      
      setFileGroups(current => 
        current.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              files: group.files.filter(f => f.fileId !== fileId),
            };
          }
          return group;
        })
      );
      
      toast({
        title: "File Removed",
        description: "File has been removed from the group.",
      });
    } catch (error) {
      console.error("Remove file from group error:", error);
      toast({
        title: "Remove from Group Failed",
        description: "An error occurred while removing the file from the group.",
        variant: "destructive",
      });
    }
  };
  
  // Edit a file's description
  const handleEditFile = async (file: FileData, description: string) => {
    try {
      await axios.put(`/api/files/${file.id}`, {
        description,
      });
      
      const updatedFile = { ...file, description };
      
      // Update the file in the files array
      setFiles(current => 
        current.map(f => f.id === file.id ? updatedFile : f)
      );
      
      // Update the file in filtered files
      setFilteredFiles(current => 
        current.map(f => f.id === file.id ? updatedFile : f)
      );
      
      // Update the file in any groups
      setFileGroups(current => 
        current.map(group => ({
          ...group,
          files: group.files.map(f => 
            f.fileId === file.id 
              ? { ...f, file: updatedFile } 
              : f
          ),
        }))
      );
      
      toast({
        title: "File Updated",
        description: "File description has been updated.",
      });
    } catch (error) {
      console.error("Edit file error:", error);
      toast({
        title: "Update File Failed",
        description: "An error occurred while updating the file.",
        variant: "destructive",
      });
    }
  };
  
  // Delete a file
  const handleDeleteFile = async (fileId: string) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      
      // Remove the file from the files array
      setFiles(current => 
        current.filter(f => f.id !== fileId)
      );
      
      // Remove the file from filtered files
      setFilteredFiles(current => 
        current.filter(f => f.id !== fileId)
      );
      
      // Remove the file from any groups
      setFileGroups(current => 
        current.map(group => ({
          ...group,
          files: group.files.filter(f => f.fileId !== fileId),
        }))
      );
      
      toast({
        title: "File Deleted",
        description: "File has been deleted.",
      });
    } catch (error) {
      console.error("Delete file error:", error);
      toast({
        title: "Delete File Failed",
        description: "An error occurred while deleting the file.",
        variant: "destructive",
      });
    }
  };
  
  // Handle chat config changes for file groups
  const handleChatConfigChange = async (
    groupId: string, 
    injectAtStart: boolean, 
    injectWithEveryPrompt: boolean
  ) => {
    // This would typically update a database record for chat configuration
    toast({
      title: "Chat Settings Updated",
      description: `Updated chat settings for this file group.`,
    });
  };
  
  // Handle creating a text file
  const handleCreateTextFile = async () => {
    if (!textInput.trim() || !textFileName.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide both content and filename.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setShowTextInputDialog(false);
    
    try {
      // Create a blob from the text input
      const blob = new Blob([textInput], { type: 'text/plain' });
      const file = new File([blob], `${textFileName}.txt`, { type: 'text/plain' });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload the file
      const response = await axios.post('/api/files/upload', formData);
      
      // Add the new file to the state
      setFiles(prevFiles => [...prevFiles, response.data]);
      
      toast({
        title: "Text File Created",
        description: `${textFileName}.txt has been created.`,
      });
      
      // Reset the inputs
      setTextInput("");
      setTextFileName("");
    } catch (error) {
      console.error("Error creating text file:", error);
      toast({
        title: "Error",
        description: "Failed to create text file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle quick text file creation from the card
  const handleQuickTextFileCreate = async () => {
    if (!textInput.trim()) return;
    
    try {
      // Generate a temporary ID for the ghost card
      const ghostId = `ghost-${crypto.randomUUID()}`;
      
      // Create a ghostly prompt card
      const ghostPrompt: Prompt = {
        id: ghostId,
        text: textInput,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add ghost prompt to UI
      const updatedPrompts = [...userPrompts, ghostPrompt];
      
      // Clear the input
      setTextInput("");
      
      // Show pending creation toast
      toast({
        title: "Creating text...",
        description: "Your text is being saved",
      });
      
      // Create the text file on server
      const response = await axios.post('/api/user-prompts', {
        text: ghostPrompt.text,
      });
      
      toast({
        title: "Text saved",
        description: "Your text has been saved successfully",
      });
      
      // Refresh prompts
      const promptsResponse = await axios.get('/api/user-prompts');
      
    } catch (error) {
      console.error("Error creating quick text:", error);
      toast({
        title: "Error",
        description: "Could not create text. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Create a group from two files (updated to handle optimistic updates)
  const handleCreateGroupFromFiles = async (fileId1: string, fileId2: string) => {
    try {
      const file1 = files.find(f => f.id === fileId1);
      const file2 = files.find(f => f.id === fileId2);
      
      if (!file1 || !file2) {
        console.error("Files not found");
        return;
      }
      
      // Create a new group with a default name based on the files
      const newGroupName = `${file1.originalName.substring(0, 10)} & ${file2.originalName.substring(0, 10)}`;
      const ghostId = `ghost-${crypto.randomUUID()}`;
      
      // Create a ghost group for optimistic UI update
      const ghostGroup: FileGroup = {
        id: ghostId,
        name: newGroupName,
        description: `Group created from ${file1.originalName} and ${file2.originalName}`,
        files: [
          { fileId: file1.id, file: file1 },
          { fileId: file2.id, file: file2 }
        ],
        color: ""
      };
      
      // Optimistically update UI
      setFiles(currentFiles => currentFiles.filter(f => f.id !== file1.id && f.id !== file2.id));
      setFilteredFiles(currentFiles => currentFiles.filter(f => f.id !== file1.id && f.id !== file2.id));
      setGhostGroups(current => [...current, ghostGroup]);
      
      // Create the group in the backend
      const response = await axios.post("/api/files/groups", {
        name: newGroupName,
        description: `Group created from ${file1.originalName} and ${file2.originalName}`,
      });
      
      const newGroup = response.data;
      
      // Add both files to the group
      await handleAddFileToGroup(newGroup.id, fileId1);
      await handleAddFileToGroup(newGroup.id, fileId2);
      
      // Refresh groups and remove ghost
      const groupsResponse = await axios.get("/api/files/groups");
      setFileGroups(groupsResponse.data);
      setGhostGroups(current => current.filter(g => g.id !== ghostId));
      
      toast({
        title: "Group Created",
        description: `Created group "${newGroupName}" with 2 files`,
      });
      
      // Switch to the files tab to see the new group
      setActiveTab("files");
      
    } catch (error) {
      console.error("Error creating group from files:", error);
      
      // Revert optimistic updates on error
      const revertFiles = async () => {
        try {
          const filesResponse = await axios.get("/api/files");
          setFiles(filesResponse.data);
          setFilteredFiles(filesResponse.data);
          setGhostGroups([]);
        } catch (e) {
          console.error("Failed to revert optimistic updates:", e);
        }
      };
      
      revertFiles();
      
      toast({
        title: "Error",
        description: "Could not create group from files. Changes reverted.",
        variant: "destructive",
      });
    }
  };

  // Merge groups (when one group is dragged onto another)
  const handleMergeGroups = async (sourceGroupId: string, targetGroupId: string) => {
    try {
      if (sourceGroupId === targetGroupId) return;
      
      const sourceGroup = fileGroups.find(g => g.id === sourceGroupId);
      const targetGroup = fileGroups.find(g => g.id === targetGroupId);
      
      if (!sourceGroup || !targetGroup) {
        console.error("Groups not found");
        return;
      }
      
      // Optimistically update UI
      const updatedTargetGroup: FileGroup = {
        ...targetGroup,
        files: [...targetGroup.files, ...sourceGroup.files]
      };
      
      // Type-safe version of the setFileGroups update
      setFileGroups(prevGroups => {
        return prevGroups.reduce<FileGroup[]>((acc, group) => {
          // Skip the source group
          if (group.id === sourceGroupId) return acc;
          
          // Replace the target group with updated version
          if (group.id === targetGroupId) {
            acc.push(updatedTargetGroup);
          } else {
            acc.push(group);
          }
          
          return acc;
        }, []);
      });
      
      // Move files from source to target group
      for (const fileRelation of sourceGroup.files) {
        await handleAddFileToGroup(targetGroupId, fileRelation.fileId);
      }
      
      // Delete the source group
      await handleDeleteGroup(sourceGroupId);
      
      // Refresh groups
      const groupsResponse = await axios.get("/api/files/groups");
      setFileGroups(groupsResponse.data);
      
      toast({
        title: "Groups Merged",
        description: `Merged "${sourceGroup.name}" into "${targetGroup.name}"`,
      });
      
    } catch (error) {
      console.error("Error merging groups:", error);
      
      // Refresh groups to revert UI
      try {
        const groupsResponse = await axios.get("/api/files/groups");
        setFileGroups(groupsResponse.data);
      } catch (e) {
        console.error("Failed to refresh groups:", e);
      }
      
      toast({
        title: "Error",
        description: "Could not merge groups. Please try again.",
        variant: "destructive",
      });
    }
  };

  // When removing the last file from a group, delete the group
  const enhancedHandleRemoveFileFromGroup = async (groupId: string, fileId: string) => {
    try {
      const group = fileGroups.find(g => g.id === groupId);
      
      if (!group) {
        console.error("Group not found");
        return;
      }
      
      // If this is the last or second-last file in the group, prepare to delete the group
      const isLastOrSecondLastFile = group.files.length <= 2;
      
      // Standard file removal
      await handleRemoveFileFromGroup(groupId, fileId);
      
      // If this was the last or second-last file, check if group is now empty or has only one file
      if (isLastOrSecondLastFile) {
        const freshGroupsResponse = await axios.get("/api/files/groups");
        const updatedGroups = freshGroupsResponse.data;
        const updatedGroup = updatedGroups.find((g: FileGroup) => g.id === groupId);
        
        // Delete group if empty or only has one file
        if (updatedGroup && updatedGroup.files.length <= 1) {
          // If only one file left, move it back to main files area
          if (updatedGroup.files.length === 1) {
            // Get the file back to main view
            const lastFileId = updatedGroup.files[0].fileId;
            const filesResponse = await axios.get("/api/files");
            setFiles(filesResponse.data);
            setFilteredFiles(filesResponse.data);
          }
          
          // Delete the empty or single-file group
          await handleDeleteGroup(groupId);
          
          // Close modal if open
          if (showGroupModal && selectedGroup?.id === groupId) {
            setShowGroupModal(false);
          }
          
          toast({
            title: updatedGroup.files.length === 0 ? "Empty Group Deleted" : "Group Disbanded",
            description: updatedGroup.files.length === 0 
              ? "Group was automatically deleted because it had no files"
              : "Group was disbanded and file returned to main area",
          });
        }
      }
    } catch (error) {
      console.error("Error in enhanced remove file from group:", error);
      toast({
        title: "Error",
        description: "Could not remove file from group. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle drag over for file-to-file drag or group-to-group drag
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, itemId: string, itemType: 'file' | 'group') => {
    e.preventDefault();
    
    if (dragTargetId && dragTargetId !== itemId) {
      // Set this item as the drop target
      setDragTargetId(itemId);
      e.currentTarget.classList.add("ring-2", "ring-primary", "ring-offset-2");
    }
  };
  
  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary", "ring-offset-2");
    setDragTargetId(null);
  };
  
  // Handle drop for file-to-file or group-to-group drag
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string, targetType: 'file' | 'group') => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary", "ring-offset-2");
    
    const draggedId = e.dataTransfer.getData("itemId");
    const draggedType = e.dataTransfer.getData("itemType") as 'file' | 'group';
    
    // Only proceed if we have valid data
    if (!draggedId || !draggedType) return;
    
    // Don't allow dragging onto self
    if (draggedId === targetId) return;
    
    // Handle file-to-file drag (create a group)
    if (draggedType === 'file' && targetType === 'file') {
      handleCreateGroupFromFiles(draggedId, targetId);
    }
    
    // Handle group-to-group drag (merge groups)
    if (draggedType === 'group' && targetType === 'group') {
      handleMergeGroups(draggedId, targetId);
    }
    
    // Handle file-to-group drag (add file to group)
    if (draggedType === 'file' && targetType === 'group') {
      handleAddFileToGroup(targetId, draggedId);
    }
  };
  
  // Handle drag start for files or groups
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string, itemType: 'file' | 'group') => {
    e.dataTransfer.setData("itemId", itemId);
    e.dataTransfer.setData("itemType", itemType);
    e.dataTransfer.effectAllowed = "move";
    setDragType(itemType);
  };

  // Handle prompt click to open modal immediately for editing
  const handlePromptClick = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setPromptEditText(prompt.text);
    setShowPromptModal(true);
  };

  // Handle prompt save in modal
  const handleSavePrompt = async () => {
    if (!selectedPrompt) return;
    
    try {
      // API call to update the prompt
      await axios.put('/api/user-prompts', {
        id: selectedPrompt.id,
        text: promptEditText,
      });
      
      // Update local state
      const updatedPrompts = userPrompts.map(p => 
        p.id === selectedPrompt.id ? { ...p, text: promptEditText } : p
      );
      
      // Close modal and reset state
      setShowPromptModal(false);
      setSelectedPrompt(null);
      
      toast({
        title: "Prompt updated",
        description: "Your prompt has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast({
        title: "Error",
        description: "Failed to update prompt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle group click to open modal
  const handleGroupClick = (group: FileGroup) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  // Combined items including ghost groups
  const unifiedItems = [
    ...(files.map(file => ({
      id: file.id,
      type: 'file' as const,
      item: file
    }))),
    ...(fileGroups.map(group => ({
      id: group.id,
      type: 'group' as const,
      item: group
    }))),
    ...(ghostGroups.map(group => ({
      id: group.id,
      type: 'ghost-group' as const,
      item: group
    }))),
    ...userPrompts.map(prompt => ({
      id: prompt.id,
      type: 'prompt' as const,
      item: prompt
    }))
  ];

  // Create a ghost prompt when text is entered
  useEffect(() => {
    // If we have text input, create a ghost prompt preview
    if (textInput.trim() && !showGhostPrompt) {
      setGhostPrompt({
        id: `ghost-${crypto.randomUUID()}`,
        text: textInput,
        isActive: true,
        createdAt: new Date().toISOString()
      });
      setShowGhostPrompt(true);
    } else if (!textInput.trim() && showGhostPrompt) {
      setShowGhostPrompt(false);
    }
  }, [textInput, showGhostPrompt]);

  return (
    <DndContext>
      <div className="flex flex-col h-[calc(100vh-200px)] space-y-6">
        {/* Top action buttons */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Your Files</h1>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              Upload
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setActiveTab("files");
                setShowTextInputDialog(true);
              }}
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>
        
        {/* Storage usage indicator */}
        <div className="w-full space-y-1">
          <div className="flex justify-between text-sm">
            <span>Storage: {Math.round(totalStorage / 1024 / 1024)} MB used</span>
            <span>{Math.round(storageLimit / 1024 / 1024)} MB total</span>
          </div>
          <Progress value={storagePercentage} className="h-2" />
        </div>
        
        {/* Upload progress indicators */}
        <AnimatePresence>
          {uploadingFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {uploadingFiles.map(file => (
                <div key={file.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate max-w-[200px]">{file.filename}</span>
                    <span>{file.error ? "Error" : `${file.progress}%`}</span>
                  </div>
                  <Progress 
                    value={file.progress} 
                    className={`h-1 ${file.error ? "bg-red-200" : ""}`}
                  />
                  {file.error && (
                    <div className="flex items-center text-red-500 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {file.error}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main tabs */}
        <Tabs 
          defaultValue="files" 
          className="flex-1 flex flex-col"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="border-b">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="files" className="flex items-center gap-1">
                <ListIcon className="h-4 w-4" />
                Files
              </TabsTrigger>
              <TabsTrigger value="all-files" className="flex items-center gap-1">
                <ListIcon className="h-4 w-4" />
                All Files
              </TabsTrigger>
              <TabsTrigger value="file-groups" className="flex items-center gap-1">
                <FolderIcon className="h-4 w-4" />
                File Groups
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-1">
                <MessageSquarePlusIcon className="h-4 w-4" />
                Prompts
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Files Tab (Unified View) */}
          <TabsContent value="files" className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search everything..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSearchQuery(e.target.value);
                      handleFileSearch(e.target.value);
                    }}
                    className="pr-8"
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchQuery("");
                        handleFileSearch("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {unifiedItems.length === 0 && !searchQuery ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed">
                  <p className="text-muted-foreground">No items found. Start by creating or uploading a file.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                  <AnimatePresence>
                    {/* New File Button Card */}
                    <motion.div
                      key="new-file-button"
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="touch-manipulation"
                    >
                      <Card className="h-full overflow-hidden border-2 border-dashed hover:border-primary transition-colors">
                        <div className="flex flex-col p-4 h-full">
                          <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                              <TextIcon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-medium">New Text File</h3>
                          </div>
                          
                          <div className="mt-2 space-y-3 flex-1">
                            <Input
                              placeholder="Enter text content..."
                              value={textInput}
                              onChange={(e) => setTextInput(e.target.value)}
                              className="w-full"
                            />
                            
                            <Button
                              onClick={handleQuickTextFileCreate}
                              className={`w-full ${textInput.trim().length > 0 ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                              disabled={textInput.trim().length === 0}
                            >
                              <ThumbsUp className="h-4 w-4 mr-2" />
                              Create
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                    
                    {/* Upload Button Card */}
                    <motion.div
                      key="upload-button"
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="touch-manipulation"
                      onClick={() => setShowUploadDialog(true)}
                    >
                      <Card className="h-full overflow-hidden border-2 border-dashed hover:border-primary transition-colors cursor-pointer">
                        <div className="flex flex-col items-center justify-center p-6 h-full">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <UploadIcon className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="text-sm font-medium">Upload Files</h3>
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            Upload documents, images, and more
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                    
                    {/* Content Items */}
                    {searchQuery !== "" && unifiedItems.length === 0 ? (
                      <motion.div
                        key="no-search-results"
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="col-span-full"
                      >
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                        </div>
                      </motion.div>
                    ) : (
                      unifiedItems.map(item => {
                        if (item.type === 'file') {
                          return (
                            <motion.div
                              key={`file-${item.id}`}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                              <div
                                className="touch-manipulation cursor-grab h-full"
                                draggable
                                onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, item.id, 'file')}
                                onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragOver(e, item.id, 'file')}
                                onDragLeave={(e: React.DragEvent<HTMLDivElement>) => handleDragLeave(e)}
                                onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, item.id, 'file')}
                              >
                                <FileCard
                                  file={item.item}
                                  onEdit={handleEditFile}
                                  onDelete={() => handleDeleteFile(item.id)}
                                  className="h-full"
                                />
                              </div>
                            </motion.div>
                          );
                        } else if (item.type === 'group' || item.type === 'ghost-group') {
                          // Regular group or ghost group
                          const isGhost = item.type === 'ghost-group';
                          return (
                            <motion.div
                              key={`${isGhost ? 'ghost-' : 'group-'}${item.id}`}
                              layout
                              initial={{ 
                                opacity: isGhost ? 0.7 : 1, 
                                scale: 1,
                                filter: isGhost ? 'blur(1px)' : 'none'
                              }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              whileHover={{ scale: isGhost ? 1 : 1.02 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              className={`touch-manipulation ${isGhost ? '' : 'cursor-pointer'}`}
                              onClick={() => !isGhost && handleGroupClick(item.item)}
                            >
                              <div
                                draggable={!isGhost}
                                onDragStart={!isGhost ? (e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, item.id, 'group') : undefined}
                                onDragOver={!isGhost ? (e: React.DragEvent<HTMLDivElement>) => handleDragOver(e, item.id, 'group') : undefined}
                                onDragLeave={!isGhost ? (e: React.DragEvent<HTMLDivElement>) => handleDragLeave(e) : undefined}
                                onDrop={!isGhost ? (e: React.DragEvent<HTMLDivElement>) => handleDrop(e, item.id, 'group') : undefined}
                                className="h-full"
                              >
                                <Card className={`h-full overflow-hidden border-2 ${isGhost ? 'border-dashed border-muted-foreground' : 'hover:border-primary'} transition-colors`}>
                                  <div className="p-3">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                          <div className="w-10 h-10 rounded-md flex items-center justify-center text-white bg-primary">
                                            <FolderIcon className="h-5 w-5" />
                                          </div>
                                        </div>
                                        <div className="ml-2 truncate flex-1 min-w-0">
                                          <h3 className="text-sm font-medium truncate">{item.item.name}</h3>
                                          <p className="text-xs text-muted-foreground">
                                            {item.item.files?.length || 0} files {isGhost && '(processing...)'}
                                          </p>
                                          {item.item.files && item.item.files.length > 0 && (
                                            <div className="mt-1 text-xs text-muted-foreground space-y-0.5 max-w-full">
                                              {item.item.files.slice(0, 3).map((fileRel, idx) => {
                                                const name = fileRel.file?.originalName || fileRel.file?.name || 'Unnamed file';
                                                const extension = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
                                                const basename = name.slice(0, name.lastIndexOf('.') > 0 ? name.lastIndexOf('.') : name.length);
                                                const shortName = basename.length > 12 
                                                  ? `${basename.substring(0, 12)}...${extension}`
                                                  : name;
                                                
                                                return (
                                                  <p key={fileRel.fileId} className="truncate">
                                                    {shortName}
                                                  </p>
                                                );
                                              })}
                                              {item.item.files.length > 3 && (
                                                <p>+{item.item.files.length - 3} more</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {!isGhost && (
                                        <div className="flex gap-1 flex-shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingGroup(item.item);
                                              setShowEditGroupDialog(true);
                                            }}
                                          >
                                            <PenIcon className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteGroup(item.id);
                                            }}
                                          >
                                            <TrashIcon className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            </motion.div>
                          );
                        } else if (item.type === 'prompt') {
                          return (
                            <motion.div
                              key={`prompt-${item.id}`}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              className="touch-manipulation cursor-pointer"
                              onClick={() => handlePromptClick(item.item)}
                            >
                              <Card className="h-full overflow-hidden border-2 hover:border-primary transition-colors">
                                <div className="p-3">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center flex-1 min-w-0">
                                      <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-md flex items-center justify-center text-white bg-violet-500">
                                          <MessageSquarePlusIcon className="h-5 w-5" />
                                        </div>
                                      </div>
                                      <div className="ml-2 truncate flex-1 min-w-0">
                                        <h3 className="text-sm font-medium truncate">Prompt</h3>
                                        <p className="text-xs text-muted-foreground">
                                          {item.item.isActive ? 'Active' : 'Inactive'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                                    {item.item.text}
                                  </p>
                                </div>
                              </Card>
                            </motion.div>
                          );
                        }
                        return null;
                      })
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* All Files Tab */}
          <TabsContent value="all-files" className="flex-1 overflow-y-auto">
            <DraggableFiles
              files={filteredFiles}
              onFileEdit={handleEditFile}
              onFileDelete={handleDeleteFile}
              onSearch={handleFileSearch}
              emptyMessage="You don't have any files yet. Click the Upload button to get started."
            />
          </TabsContent>
          
          {/* File Groups Tab */}
          <TabsContent value="file-groups" className="flex-1 overflow-y-auto">
            <DraggableFileGroups
              fileGroups={fileGroups}
              files={files}
              onCreateGroup={handleCreateGroup}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
              onAddFileToGroup={handleAddFileToGroup}
              onRemoveFileFromGroup={enhancedHandleRemoveFileFromGroup}
              onChatConfigChange={handleChatConfigChange}
              onFileEdit={handleEditFile}
              onFileDelete={handleDeleteFile}
            />
          </TabsContent>
          
          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <PromptsPanel initialPrompts={userPrompts} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload files to add to your collection. Drag and drop or click to select.
            </DialogDescription>
          </DialogHeader>
          
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <FileUp className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supported file types: Documents, Images, and more
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Text input dialog */}
      <Dialog open={showTextInputDialog} onOpenChange={setShowTextInputDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Text File</DialogTitle>
            <DialogDescription>
              Enter text content to create a new text file
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Filename (without extension)"
                value={textFileName}
                onChange={(e) => setTextFileName(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Enter your text content here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[200px] resize-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTextInput("")
                setTextFileName("")
                setShowTextInputDialog(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTextFile}>
              Create File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              {selectedGroup?.description || 'Manage files in this group'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {selectedGroup && (
              <>
                {selectedGroup.files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/20 rounded-xl border-2 border-dashed">
                    <p className="text-muted-foreground">This group has no files yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedGroup.files.map(fileRelation => (
                      <FileCard 
                        key={fileRelation.fileId}
                        file={fileRelation.file}
                        onEdit={handleEditFile}
                        onDelete={() => {
                          enhancedHandleRemoveFileFromGroup(selectedGroup.id, fileRelation.fileId);
                          // Group closing is now handled inside enhancedHandleRemoveFileFromGroup
                        }}
                        isInGroup={true}
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingGroup(selectedGroup);
                      setShowEditGroupDialog(true);
                      setShowGroupModal(false);
                    }}
                  >
                    Edit Group
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setShowGroupModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt Edit Modal */}
      <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>
              Edit your prompt text below
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <Textarea
              value={promptEditText}
              onChange={(e) => setPromptEditText(e.target.value)}
              className="w-full min-h-[200px] resize-y"
              placeholder="Enter your prompt..."
            />
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPromptModal(false);
                  setSelectedPrompt(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSavePrompt}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  )
} 