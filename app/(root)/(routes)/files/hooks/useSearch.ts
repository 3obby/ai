"use client";

import { useMemo } from "react";
import { useFilesContext } from "../context/FilesContext";
import { FileData, FileGroup } from "../types";

export const useSearch = () => {
  const { 
    files, 
    fileGroups, 
    searchQuery, 
    activeTab 
  } = useFilesContext();

  // Filter files based on search query and active tab
  const filteredFiles = useMemo(() => {
    if (!files) return [];
    
    // Start with files that match the search query
    let result = files;
    
    // Apply search filter if query exists
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(lowerQuery) || 
        file.originalName.toLowerCase().includes(lowerQuery) ||
        (file.description && file.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Filter by active tab (group) if not on all-files
    if (activeTab !== 'all-files' && activeTab !== 'prompts') {
      const activeGroup = fileGroups.find(group => group.id === activeTab);
      if (activeGroup) {
        const fileIdsInGroup = new Set(activeGroup.files.map(f => f.fileId));
        result = result.filter(file => fileIdsInGroup.has(file.id));
      } else {
        // If group not found, return empty array
        return [];
      }
    }
    
    return result;
  }, [files, fileGroups, searchQuery, activeTab]);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!fileGroups) return [];
    
    if (!searchQuery) return fileGroups;
    
    const lowerQuery = searchQuery.toLowerCase();
    return fileGroups.filter(group => 
      group.name.toLowerCase().includes(lowerQuery) || 
      (group.description && group.description.toLowerCase().includes(lowerQuery))
    );
  }, [fileGroups, searchQuery]);

  // Get files for a specific group
  const getFilesForGroup = (groupId: string): FileData[] => {
    const group = fileGroups.find(g => g.id === groupId);
    if (!group) return [];
    
    const fileIds = new Set(group.files.map(f => f.fileId));
    return files.filter(file => fileIds.has(file.id));
  };

  return {
    filteredFiles,
    filteredGroups,
    getFilesForGroup,
  };
}; 