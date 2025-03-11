import { useState, useEffect, useCallback } from "react";
import { FileData, FileGroup, ActiveTab, FileViewMode } from "../types";

interface UseFileStateProps {
  initialFiles: FileData[];
  initialFileGroups: FileGroup[];
}

export function useFileState({ 
  initialFiles, 
  initialFileGroups 
}: UseFileStateProps) {
  // Files state
  const [files, setFiles] = useState<FileData[]>(initialFiles);
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState("");
  
  // File groups state
  const [fileGroups, setFileGroups] = useState<FileGroup[]>(initialFileGroups);
  
  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>("all-files");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<FileViewMode>("grid");

  // Effect to filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
      return;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = files.filter(file => 
      file.name.toLowerCase().includes(lowerCaseQuery) || 
      file.description?.toLowerCase().includes(lowerCaseQuery)
    );
    
    setFilteredFiles(filtered);
  }, [searchQuery, files]);

  // Handle file search
  const handleFileSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Get file by ID
  const getFileById = useCallback((fileId: string) => {
    return files.find(file => file.id === fileId);
  }, [files]);

  // Get group by ID
  const getGroupById = useCallback((groupId: string) => {
    return fileGroups.find(group => group.id === groupId);
  }, [fileGroups]);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  }, []);

  // Clear selections
  const clearSelections = useCallback(() => {
    setSelectedFileIds([]);
  }, []);

  // Update file state after operations
  const updateFile = useCallback((updatedFile: FileData) => {
    setFiles(prev => prev.map(file => 
      file.id === updatedFile.id ? updatedFile : file
    ));
  }, []);

  // Add a new file to state
  const addFile = useCallback((newFile: FileData) => {
    setFiles(prev => [newFile, ...prev]);
  }, []);

  // Remove a file from state
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Update a group in state
  const updateGroup = useCallback((updatedGroup: FileGroup) => {
    setFileGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? updatedGroup : group
    ));
  }, []);

  // Add a new group to state
  const addGroup = useCallback((newGroup: FileGroup) => {
    setFileGroups(prev => [newGroup, ...prev]);
  }, []);

  // Remove a group from state
  const removeGroup = useCallback((groupId: string) => {
    setFileGroups(prev => prev.filter(group => group.id !== groupId));
  }, []);

  return {
    // File state
    files,
    setFiles,
    filteredFiles,
    searchQuery,
    handleFileSearch,
    
    // Group state
    fileGroups,
    setFileGroups,
    
    // UI state
    activeTab,
    setActiveTab,
    selectedFileIds,
    setSelectedFileIds,
    viewMode,
    setViewMode,
    
    // Helper functions
    getFileById,
    getGroupById,
    toggleFileSelection,
    clearSelections,
    
    // State update functions
    updateFile,
    addFile,
    removeFile,
    updateGroup,
    addGroup,
    removeGroup
  };
} 