"use client";

import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useFilesContext } from "../../context/FilesContext";
import { useSearch } from "../../hooks/useSearch";
import { useFileDragDrop } from "../../hooks/useFileDragDrop";
import { FileData } from "../../types";
import { SortableFileListItem } from "../ui/SortableFileListItem";
import { FileListItem } from "../ui/FileListItem";
import { cn } from "@/lib/utils";

interface FileListProps {
  className?: string;
}

export const FileList = ({ className }: FileListProps) => {
  const { selectedFiles, setSelectedFiles } = useFilesContext();
  const { filteredFiles } = useSearch();
  const { activeId, activeType, handleDragStart, handleDragOver, handleDragEnd } = useFileDragDrop();
  
  // Find the active file for the drag overlay
  const activeFile = activeId && activeType === 'file' 
    ? filteredFiles.find(file => file.id === activeId)
    : null;
  
  // Toggle file selection
  const toggleFileSelection = (fileId: string, isMultiSelect: boolean) => {
    const newSelection = new Set(selectedFiles);
    
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
    
    setSelectedFiles(newSelection);
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
      <SortableContext items={filteredFiles.map(file => `file:${file.id}`)} strategy={verticalListSortingStrategy}>
        <div className={cn("divide-y divide-border rounded-md border", className)}>
          <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div className="col-span-5 md:col-span-6">File</div>
            <div className="col-span-3 md:col-span-2">Type</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Actions</div>
          </div>
          
          {filteredFiles.map(file => (
            <SortableFileListItem
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
          <FileListItem 
            file={activeFile} 
            isDragging={true}
            className="w-full opacity-80 bg-background shadow-md"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}; 