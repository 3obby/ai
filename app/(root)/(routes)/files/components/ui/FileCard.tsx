"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PenIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatBytes, formatFileType, getColorForFileType } from "../../utils/format"
import { cn } from "@/lib/utils"
import { FileData } from "../../types"

interface FileCardProps {
  file: FileData
  onEdit?: (file: FileData, newText: string) => void
  onDelete?: (file: FileData) => void
  className?: string
  isDragging?: boolean
  isInGroup?: boolean
  showActions?: boolean
}

export const FileCard = ({
  file,
  onEdit,
  onDelete,
  className,
  isDragging = false,
  isInGroup = false,
  showActions = true
}: FileCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(file.description || "")
  
  // Check if file content is text and can be edited
  const isTextFile = file.type.includes("text") || 
                     /\.(txt|md|csv|json)$/i.test(file.originalName);
  
  const handleSaveEdit = () => {
    onEdit?.(file, editText)
    setIsEditing(false)
  }
  
  const handleCancelEdit = () => {
    setEditText(file.description || "")
    setIsEditing(false)
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: isDragging ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)" : "none",
        zIndex: isDragging ? 50 : 1
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("touch-manipulation", className)}
    >
      <Card className={cn(
        "overflow-hidden border-2 transition-colors", 
        isDragging ? "border-primary shadow-lg" : "border-border",
        isInGroup ? "bg-primary/5" : ""
      )}>
        <div className="p-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white ${getColorForFileType(file.type)}`}>
                  <span className="text-xs font-bold">{formatFileType(file.type)}</span>
                </div>
              </div>
              <div className="ml-2 truncate flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{file.originalName}</h3>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            </div>
            
            {showActions && (
              <div className="flex gap-1 flex-shrink-0">
                {isTextFile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsEditing(true)}
                  >
                    <PenIcon className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
                  onClick={() => onDelete?.(file)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-24 text-sm resize-none"
                placeholder="Add a description..."
              />
              <div className="flex justify-end gap-2">
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                >
                  <XIcon className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            file.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                {file.description}
              </p>
            )
          )}
        </div>
      </Card>
    </motion.div>
  )
} 