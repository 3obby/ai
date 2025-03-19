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
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent) => void
}

export const FileCard = ({
  file,
  onEdit,
  onDelete,
  className,
  isDragging = false,
  isInGroup = false,
  showActions = true,
  isSelected = false,
  onSelect
}: FileCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(file.description || "")
  
  // Check if file content is text and can be edited
  const isTextFile = file.type.includes("text") || 
                     /\.(txt|md|csv|json)$/i.test(file.originalName);
  
  const handleEdit = () => {
    setIsEditing(true)
    setEditText(file.description || "")
  }
  
  const handleSave = () => {
    if (onEdit) {
      onEdit(file, editText)
    }
    setIsEditing(false)
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditText(file.description || "")
  }
  
  const fileTypeColor = getColorForFileType(file.type)
  const formattedType = formatFileType(file.type)
  const formattedSize = formatBytes(file.size)
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        isDragging && "opacity-50",
        isSelected && "ring-2 ring-primary",
        className
      )}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center text-white",
                fileTypeColor
              )}
            >
              {formattedType.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <h3 className="font-medium truncate">{file.name}</h3>
              <p className="text-xs text-muted-foreground">
                {formattedType} • {formattedSize}
              </p>
            </div>
          </div>
          
          {showActions && !isEditing && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
              >
                <PenIcon className="h-4 w-4" />
              </Button>
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(file)
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {isEditing && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-green-500" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave()
                }}
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancel()
                }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="mt-2 text-sm"
            placeholder="Add a description..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          file.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {file.description}
            </p>
          )
        )}
      </div>
    </Card>
  )
} 