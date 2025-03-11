"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileData } from "../../types";
import { FileCard } from "./FileCard";
import { cn } from "@/lib/utils";

interface SortableFileCardProps {
  file: FileData;
  id: string;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  className?: string;
}

export const SortableFileCard = ({
  file,
  id,
  isSelected,
  onSelect,
  className,
}: SortableFileCardProps) => {
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
      <FileCard
        file={file}
        isDragging={isDragging}
        isSelected={isSelected}
        onSelect={onSelect}
        className={cn(
          "transition-all",
          isSelected && "ring-2 ring-primary",
          isDragging && "opacity-50"
        )}
      />
    </div>
  );
}; 