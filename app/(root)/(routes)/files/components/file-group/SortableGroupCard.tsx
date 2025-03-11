"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileGroup } from "../../types";
import { ModularGroupCard } from "./ModularGroupCard";
import { cn } from "@/lib/utils";

interface SortableGroupCardProps {
  group: FileGroup;
  id: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SortableGroupCard = ({
  group,
  id,
  isActive,
  onClick,
  className,
}: SortableGroupCardProps) => {
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
      <ModularGroupCard
        group={group}
        isActive={isActive}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "transition-all",
          isDragging && "shadow-md"
        )}
      />
    </div>
  );
}; 