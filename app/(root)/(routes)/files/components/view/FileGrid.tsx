"use client";

import { useState } from "react";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useFilesContext } from "../../context/FilesContext";
import { useSearch } from "../../hooks/useSearch";
import { useFileDragDrop } from "../../hooks/useFileDragDrop";
import { FileData } from "../../types";
import { SortableFileCard } from "../ui/SortableFileCard";
import { FileCard } from "../ui/FileCard";
import { cn } from "@/lib/utils";

interface FileGridProps {
  className?: string;
}

export const FileGrid = ({ className }: FileGridProps) => {
  const { selectedFiles, setSelectedFiles } = useFilesContext();
  const { filteredFiles } = useSearch();
  const { activeId, activeType, handleDragStart, handleDragOver, handleDragEnd } = useFileDragDrop();
  
  // Find the active file for the drag overlay
  const activeFile = activeId && activeType === 'file' 
    ? filteredFiles.find(file => file.id === activeId)
    : null;
  
  // Toggle file selection
  const toggleFileSelection = (fileId: string, isMultiSelect: boolean) => {
    setSelectedFiles((prev: Set<string>) => {
      const newSelection = new Set(prev);
      
      if (isMultiSelect) {
        // Toggle selection
        if (newSelection.has(fileId)) {
          newSelection.delete(fileId);
        } else {
          newSelection.add(fileId);
        }
      } else {
        // Replace selection
        if (newSelection.size === 1 && newSelection.has(fileId)) {
          // Deselect if it's the only selected file
          newSelection.clear();
        } else {
          // Select only this file
          newSelection.clear();
          newSelection.add(fileId);
        }
      }
      
      return newSelection;
    });
  };
  
  if (filteredFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <p className="text-muted-foreground">No files found</p>
      </div>
    );
  }
  
  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <SortableContext items={filteredFiles.map(file => `file:${file.id}`)} strategy={rectSortingStrategy}>
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
          {filteredFiles.map(file => (
            <SortableFileCard
              key={file.id}
              file={file}
              id={`file:${file.id}`}
              isSelected={selectedFiles.has(file.id)}
              onSelect={(e: React.MouseEvent) => toggleFileSelection(file.id, e.ctrlKey || e.metaKey || e.shiftKey)}
            />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeFile && activeType === 'file' && (
          <FileCard 
            file={activeFile} 
            isDragging={true}
            className="w-64 opacity-80"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}; 