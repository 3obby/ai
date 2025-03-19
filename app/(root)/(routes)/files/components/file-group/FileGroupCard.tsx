"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FolderIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  PenIcon, 
  TrashIcon,
  CheckIcon,
  XIcon,
  SettingsIcon
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { FileData, FileGroup } from "../../types"
import { FileCard } from "../ui/FileCard"
import { useFileManagement } from "../../hooks/useFileManagement"
import { useFilesContext } from "../../context/FilesContext"

interface FileGroupCardProps {
  group: FileGroup
  onEdit?: (groupId: string, name: string, description?: string) => void
  onDelete?: (groupId: string) => void
  onAddFile?: (groupId: string, fileId: string) => void
  onRemoveFile?: (groupId: string, fileId: string) => void
  allFiles?: FileData[]
  onChatConfigChange?: (groupId: string, injectAtStart: boolean, injectWithEveryPrompt: boolean) => void
  className?: string
  isDraggable?: boolean
  isActive?: boolean
  isDragging?: boolean
  onClick?: () => void
}

export const FileGroupCard = ({
  group,
  onEdit,
  onDelete,
  onAddFile,
  onRemoveFile,
  allFiles = [],
  onChatConfigChange,
  className,
  isDraggable = true,
  isActive = false,
  isDragging = false,
  onClick
}: FileGroupCardProps) => {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group.name)
  const [editDescription, setEditDescription] = useState(group.description || "")
  const [showChatConfig, setShowChatConfig] = useState(false)
  const [injectAtStart, setInjectAtStart] = useState(true)
  const [injectWithEveryPrompt, setInjectWithEveryPrompt] = useState(false)
  
  const { activeTab } = useFilesContext()
  const { updateFileGroup, deleteFileGroup } = useFileManagement()
  
  const fileCount = group.files?.length || 0
  const isCurrentTab = activeTab === group.id
  
  const handleSaveEdit = () => {
    if (editName.trim()) {
      onEdit?.(group.id, editName.trim(), editDescription.trim() || undefined)
      setIsEditing(false)
    }
  }
  
  const handleCancelEdit = () => {
    setEditName(group.name)
    setEditDescription(group.description || "")
    setIsEditing(false)
  }
  
  const handleSaveChatConfig = () => {
    onChatConfigChange?.(group.id, injectAtStart, injectWithEveryPrompt)
    setShowChatConfig(false)
  }
  
  // Get files that are not already in this group
  const availableFiles = allFiles?.filter(
    file => !group.files.some(groupFile => groupFile.fileId === file.id)
  ) || []
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditName(group.name)
    setEditDescription(group.description || "")
  }
  
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (editName.trim()) {
      await updateFileGroup(group.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
    }
    
    setIsEditing(false)
  }
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteFileGroup(group.id)
  }
  
  const groupColor = group.color || "bg-primary"
  
  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          "w-full",
          className,
          isActive && "ring-2 ring-primary",
          isDragging && "opacity-50"
        )}
        onClick={onClick}
      >
        <Card className="overflow-hidden border-2 transition-all hover:shadow-md">
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white ${groupColor}`}>
                  <FolderIcon className="h-4 w-4" />
                </div>
                
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Group name"
                    autoFocus
                  />
                ) : (
                  <CardTitle className="text-base font-semibold">{group.name}</CardTitle>
                )}
                
                <Badge variant="secondary" className="ml-2">
                  {fileCount} {fileCount === 1 ? 'file' : 'files'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleEdit}
                    >
                      <PenIcon className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <SettingsIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <PenIcon className="h-4 w-4 mr-2" />
                          Edit group
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowChatConfig(true)}>
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Chat settings
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={handleDelete}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Delete group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
            
            {isEditing && (
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-3 text-sm resize-none"
                placeholder="Add a description..."
              />
            )}
            
            {!isEditing && group.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {group.description}
              </p>
            )}
          </CardHeader>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="p-4 pt-2">
                  {group.files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        This group has no files. Drag files here or use the dropdown menu to add files.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {group.files.map(({ fileId, file }) => (
                        <FileCard 
                          key={fileId} 
                          file={file}
                          isInGroup={true}
                          showActions={false}
                          className="scale-90 origin-top-left"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="p-3 pt-0 flex-wrap gap-2">
                  {availableFiles.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Add file
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                        {availableFiles.map(file => (
                          <DropdownMenuItem 
                            key={file.id}
                            onClick={() => onAddFile?.(group.id, file.id)}
                          >
                            {file.originalName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {group.files.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Remove file
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                        {group.files.map(({ fileId, file }) => (
                          <DropdownMenuItem 
                            key={fileId}
                            onClick={() => onRemoveFile?.(group.id, fileId)}
                          >
                            {file.originalName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
      
      {/* Chat settings dialog */}
      <Dialog open={showChatConfig} onOpenChange={setShowChatConfig}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File Group Chat Settings</DialogTitle>
            <DialogDescription>
              Configure how this file group will be used in chats
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>When to include this group&apos;s content:</Label>
              <RadioGroup 
                defaultValue={injectAtStart ? "start" : "every"}
                onValueChange={(value) => {
                  if (value === "start") {
                    setInjectAtStart(true)
                    setInjectWithEveryPrompt(false)
                  } else {
                    setInjectAtStart(false)
                    setInjectWithEveryPrompt(true)
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="start" id="start" />
                  <Label htmlFor="start">Only at the beginning of the conversation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="every" id="every" />
                  <Label htmlFor="every">With every message</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChatConfig(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChatConfig}>
              Save settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 