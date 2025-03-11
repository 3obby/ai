"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileData } from "../../types";
import { FileListItem } from "./FileListItem";
import { cn } from "@/lib/utils";

interface SortableFileListItemProps {
  file: FileData;
  id: string;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  className?: string;
}

export const SortableFileListItem = ({
  file,
  id,
  isSelected,
  onSelect,
  className,
}: SortableFileListItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "z-10",
        className
      )}
      {...attributes}
      {...listeners}
    >
      <FileListItem
        file={file}
        isDragging={isDragging}
        isSelected={isSelected}
        onSelect={onSelect}
        className={cn(
          "transition-all",
          isDragging && "shadow-md"
        )}
      />
    </div>
  );
}; 