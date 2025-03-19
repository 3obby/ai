"use client";

import { ReactNode, useState, useCallback } from "react";
import { FilesContext } from "./FilesContext";
import { FileData, FileGroup, Prompt } from "../types";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";

interface FilesProviderProps {
  children: ReactNode;
  initialFiles: FileData[];
  initialFileGroups: FileGroup[];
  initialUserPrompts: Prompt[];
  userId: string;
  availableTokens: number;
  totalStorage: number;
  storageLimit: number;
  storagePercentage: number;
}

export const FilesProvider = ({
  children,
  initialFiles,
  initialFileGroups,
  initialUserPrompts,
  userId,
  availableTokens,
  totalStorage,
  storageLimit,
  storagePercentage,
}: FilesProviderProps) => {
  // File data state
  const [files, setFiles] = useState<FileData[]>(initialFiles);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>(initialFileGroups);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Prompt state
  const [userPrompts, setUserPrompts] = useState<Prompt[]>(initialUserPrompts);
  
  // UI state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all-files');
  
  // Refresh data function
  const refreshData = useCallback(async () => {
    try {
      // Fetch files
      const filesResponse = await axios.get('/api/files');
      if (filesResponse.data.files) {
        setFiles(filesResponse.data.files);
      }
      
      // Fetch file groups with files
      const groupsResponse = await axios.get('/api/files/groups?includeFiles=true');
      if (groupsResponse.data.fileGroups) {
        setFileGroups(groupsResponse.data.fileGroups);
      }
      
      // Fetch prompts
      const promptsResponse = await axios.get('/api/prompts');
      if (promptsResponse.data.prompts) {
        setUserPrompts(promptsResponse.data.prompts);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  }, []);
  
  return (
    <FilesContext.Provider
      value={{
        files,
        setFiles,
        fileGroups,
        setFileGroups,
        uploading,
        setUploading,
        uploadProgress,
        setUploadProgress,
        userId,
        availableTokens,
        totalStorage,
        storageLimit,
        storagePercentage,
        userPrompts,
        setUserPrompts,
        selectedFiles,
        setSelectedFiles,
        viewMode,
        setViewMode,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        refreshData,
      }}
    >
      {children}
    </FilesContext.Provider>
  );
}; 