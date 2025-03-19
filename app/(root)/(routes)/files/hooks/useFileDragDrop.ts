"use client";

import { useState, useCallback } from "react";
import { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { useFilesContext } from "../context/FilesContext";
import { useFileManagement } from "./useFileManagement";

export const useFileDragDrop = () => {
  const {
    activeTab,
    setActiveTab,
  } = useFilesContext();
  
  const { addFileToGroup, removeFileFromGroup } = useFileManagement();
  
  // Local state for drag operations
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'file' | 'group' | null>(null);
  
  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    
    // Extract type from the id format "type:id"
    if (id.includes(':')) {
      const [type, actualId] = id.split(':');
      setActiveId(actualId);
      setActiveType(type as 'file' | 'group');
    } else {
      setActiveId(id);
      // Assume it's a file if no type is specified
      setActiveType('file');
    }
  }, []);
  
  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Skip if same ID
    if (activeId === overId) return;
    
    // Extract type and id
    let activeType = 'file';
    let actualActiveId = activeId;
    let overType = 'group';
    let actualOverId = overId;
    
    if (activeId.includes(':')) {
      const [type, id] = activeId.split(':');
      activeType = type;
      actualActiveId = id;
    }
    
    if (overId.includes(':')) {
      const [type, id] = overId.split(':');
      overType = type;
      actualOverId = id;
    }
    
    // Only allow dragging files over groups
    if (activeType === 'file' && overType === 'group') {
      // Can implement preview state here if needed
    }
  }, []);
  
  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveType(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Skip if same ID
    if (activeId === overId) return;
    
    // Extract type and id
    let activeType = 'file';
    let actualActiveId = activeId;
    let overType = 'group';
    let actualOverId = overId;
    
    if (activeId.includes(':')) {
      const [type, id] = activeId.split(':');
      activeType = type;
      actualActiveId = id;
    }
    
    if (overId.includes(':')) {
      const [type, id] = overId.split(':');
      overType = type;
      actualOverId = id;
    }
    
    // Handle file drop into group
    if (activeType === 'file' && overType === 'group') {
      // If we're in a group view, check if we need to remove from current group
      if (activeTab !== 'all-files' && activeTab !== 'prompts') {
        // Remove from current group first
        await removeFileFromGroup(actualActiveId, activeTab);
      }
      
      // Add to the new group
      await addFileToGroup(actualActiveId, actualOverId);
    }
    
    // Handle file drop into all-files (remove from group)
    if (activeType === 'file' && overId === 'all-files-drop-area' && activeTab !== 'all-files') {
      await removeFileFromGroup(actualActiveId, activeTab);
    }
  }, [activeTab, addFileToGroup, removeFileFromGroup]);
  
  return {
    activeId,
    activeType,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}; 