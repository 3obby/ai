"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { PlusIcon } from "lucide-react"

import { FileCard } from "../ui/FileCard"
import { FileGroupCard } from "./FileGroupCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileData, FileGroup } from "../../types"

interface DraggableFileGroupsProps {
  fileGroups: FileGroup[]
  files: FileData[]
  onCreateGroup: (name: string, description?: string) => void
  onEditGroup: (groupId: string, name: string, description?: string) => void
  onDeleteGroup: (groupId: string) => void
  onAddFileToGroup: (groupId: string, fileId: string) => void
  onRemoveFileFromGroup: (groupId: string, fileId: string) => void
  onChatConfigChange?: (groupId: string, injectAtStart: boolean, injectWithEveryPrompt: boolean) => void
  onFileEdit?: (file: FileData, description: string) => void
  onFileDelete?: (fileId: string) => void
}

export function DraggableFileGroups({
  fileGroups,
  files,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onAddFileToGroup,
  onRemoveFileFromGroup,
  onChatConfigChange,
  onFileEdit,
  onFileDelete,
}: DraggableFileGroupsProps) {
  const [activeFile, setActiveFile] = useState<FileData | null>(null)
  const [activeGroup, setActiveGroup] = useState<FileGroup | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  
  // Set up mouse and touch sensors for drag and drop
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // Minimum distance in pixels to start drag
    },
  })
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // Delay in ms to start drag
      tolerance: 5, // Tolerance in pixels
    },
  })
  
  const sensors = useSensors(mouseSensor, touchSensor)
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    
    // Handle dragging files
    if (active.data.current?.type === "file") {
      const fileId = active.id as string
      const file = files.find(f => f.id === fileId)
      if (file) {
        setActiveFile(file)
      }
    }
    
    // Handle dragging groups (for future expansion)
    if (active.data.current?.type === "group") {
      const groupId = active.id as string
      const group = fileGroups.find(g => g.id === groupId)
      if (group) {
        setActiveGroup(group)
      }
    }
  }
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.data.current?.type === "file" && over.data.current?.type === "group") {
      const fileId = active.id as string
      const groupId = over.id as string
      
      onAddFileToGroup(groupId, fileId)
    }
    
    // Reset active items
    setActiveFile(null)
    setActiveGroup(null)
  }
  
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onCreateGroup(
        newGroupName.trim(), 
        newGroupDescription.trim() || undefined
      )
      setNewGroupName("")
      setNewGroupDescription("")
      setShowCreateDialog(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">File Groups</h2>
        <Button
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="rounded-full"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {fileGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed">
            <p className="text-muted-foreground mb-4">You don&apos;t have any file groups yet.</p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="outline"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {fileGroups.map(group => (
                <motion.div
                  key={group.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  data-group-id={group.id}
                >
                  <FileGroupCard
                    group={group}
                    onEdit={onEditGroup}
                    onDelete={onDeleteGroup}
                    onAddFile={onAddFileToGroup}
                    onRemoveFile={onRemoveFileFromGroup}
                    allFiles={files}
                    onChatConfigChange={onChatConfigChange}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {/* Drag overlay */}
        <DragOverlay>
          {activeFile && (
            <FileCard
              file={activeFile}
              isDragging={true}
              className="w-64 opacity-90"
            />
          )}
        </DragOverlay>
      </DndContext>
      
      {/* Create group dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New File Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your files
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Group description (optional)"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewGroupName("")
                setNewGroupDescription("")
                setShowCreateDialog(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 