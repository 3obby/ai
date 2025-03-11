import { useState } from "react";
import { FileData, FileGroup } from "../types";

interface UseDragAndDropProps {
  onAddFileToGroup: (groupId: string, fileId: string) => Promise<boolean>;
  onMergeGroups: (sourceGroupId: string, targetGroupId: string) => Promise<any>;
}

export function useDragAndDrop({
  onAddFileToGroup,
  onMergeGroups,
}: UseDragAndDropProps) {
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    type: "file" | "group";
  } | null>(null);
  
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    type: "file" | "group";
  } | null>(null);

  // Handle drag start
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    itemId: string,
    itemType: "file" | "group"
  ) => {
    setDraggedItem({ id: itemId, type: itemType });
    // Set data transfer properties
    e.dataTransfer.setData("application/json", JSON.stringify({ id: itemId, type: itemType }));
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
    targetType: "file" | "group"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drop target if it's not the same as the dragged item
    if (draggedItem && (draggedItem.id !== targetId || draggedItem.type !== targetType)) {
      setDropTarget({ id: targetId, type: targetType });
      e.dataTransfer.dropEffect = "move";
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  // Handle drop
  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
    targetType: "file" | "group"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Get the dragged item data
      const data = e.dataTransfer.getData("application/json");
      const { id: draggedId, type: draggedType } = JSON.parse(data);
      
      // Perform actions based on drag and drop combination
      if (draggedType === "file" && targetType === "group") {
        // Add file to group
        await onAddFileToGroup(targetId, draggedId);
      } else if (draggedType === "group" && targetType === "group" && draggedId !== targetId) {
        // Merge groups
        await onMergeGroups(draggedId, targetId);
      }
      
      // Reset states
      setDraggedItem(null);
      setDropTarget(null);
      
      return true;
    } catch (error) {
      console.error("Error handling drop:", error);
      setDraggedItem(null);
      setDropTarget(null);
      return false;
    }
  };

  return {
    draggedItem,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
} 