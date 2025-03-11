"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileCard } from "./FileCard"
import { FileData } from "../../types"
import { formatBytes } from "../../utils/format"
import { useDraggable } from "@dnd-kit/core"
import { PlusIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DraggableFilesProps {
  files: FileData[]
  onFileEdit: (file: FileData, description: string) => void
  onFileDelete: (fileId: string) => void
  onSearch?: (query: string) => void
  className?: string
  emptyMessage?: string
}

export function DraggableFiles({
  files,
  onFileEdit,
  onFileDelete,
  onSearch,
  className = "",
  emptyMessage = "No files found"
}: DraggableFilesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={handleSearch}
            className="pr-8"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchQuery("")
                onSearch?.("")
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          <AnimatePresence>
            {files.map(file => (
              <DraggableFile
                key={file.id}
                file={file}
                onEdit={onFileEdit}
                onDelete={onFileDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// Individual draggable file component
function DraggableFile({
  file,
  onEdit,
  onDelete
}: {
  file: FileData
  onEdit: (file: FileData, description: string) => void
  onDelete: (fileId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: file.id,
    data: {
      type: "file",
      file
    }
  })
  
  // Prevent clicks from firing when dragging ends
  const [isDragActive, setIsDragActive] = useState(false)
  
  return (
    <div 
      ref={setNodeRef} 
      {...attributes} 
      {...listeners}
      onMouseDown={() => setIsDragActive(true)}
      onMouseUp={() => setTimeout(() => setIsDragActive(false), 50)}
      className="touch-manipulation cursor-grab"
    >
      <FileCard
        file={file}
        onEdit={onEdit}
        onDelete={(file) => !isDragActive && onDelete(file.id)}
        isDragging={isDragging}
      />
    </div>
  )
} 