"use client"

import { useState } from "react"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  TextIcon, 
  UploadIcon, 
  CheckIcon
} from "lucide-react"

// Import custom hooks
import { useFileState } from "../hooks/useFileState"
import { useFileOperations } from "../hooks/useFileOperations"
import { useGroupOperations } from "../hooks/useGroupOperations"
import { useFileUpload } from "../hooks/useFileUpload"
import { useDragAndDrop } from "../hooks/useDragAndDrop"

// Import UI components
import { DraggableFileGroups } from "./file-group/DraggableFileGroups"
import { DraggableFiles } from "./ui/DraggableFiles"
import { PromptsPanel } from "./prompts/PromptsPanel"

// Import types
import { FileData, FileGroup, Prompt } from "../types"

interface ModularizedFilesClientProps {
  files: FileData[]
  fileGroups: FileGroup[]
  userId: string
  availableTokens: number
  totalStorage: number
  storageLimit: number
  storagePercentage: number
  userPrompts?: Prompt[]
}

export default function ModularizedFilesClient({
  files: initialFiles,
  fileGroups: initialFileGroups,
  userId,
  availableTokens,
  totalStorage,
  storageLimit,
  storagePercentage,
  userPrompts = []
}: ModularizedFilesClientProps) {
  // State for UI dialogs
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showTextInputDialog, setShowTextInputDialog] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [textFileName, setTextFileName] = useState("New Text File")
  const [textFileDescription, setTextFileDescription] = useState("")
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>(userPrompts)
  
  // Refresh handler to update state after operations
  const refreshData = () => {
    // This will be called whenever a file/group operation completes
    // and requires refreshing the UI state
  }
  
  // Initialize hooks
  const {
    files,
    setFiles,
    filteredFiles,
    fileGroups,
    setFileGroups,
    activeTab,
    setActiveTab,
    handleFileSearch,
    selectedFileIds,
    toggleFileSelection,
    clearSelections,
    getFileById,
    getGroupById,
    addFile,
    removeFile,
    updateFile,
    addGroup,
    removeGroup,
    updateGroup
  } = useFileState({
    initialFiles,
    initialFileGroups
  })
  
  const {
    deleteFile,
    editFile,
    createTextFile,
    quickCreateTextFile,
    isCreatingFile,
    uploadProgress: fileCreationProgress
  } = useFileOperations(userId, refreshData)
  
  const {
    createGroup,
    editGroup,
    deleteGroup,
    addFileToGroup,
    removeFileFromGroup,
    createGroupFromFiles,
    mergeGroups,
    updateChatConfig,
    isManagingGroup
  } = useGroupOperations(refreshData)
  
  const {
    uploadFile,
    uploadFiles,
    isUploading,
    uploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
    openFileSelector
  } = useFileUpload({
    userId,
    onUploadComplete: refreshData
  })
  
  const {
    draggedItem,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop({
    onAddFileToGroup: addFileToGroup,
    onMergeGroups: mergeGroups
  })
  
  // Handler for opening file upload dialog
  const handleOpenUploadDialog = () => {
    setShowUploadDialog(true)
  }
  
  // Handler for closing file upload dialog
  const handleCloseUploadDialog = () => {
    setShowUploadDialog(false)
  }
  
  // Handler for opening text input dialog
  const handleOpenTextInputDialog = () => {
    setTextInput("")
    setTextFileName("New Text File")
    setTextFileDescription("")
    setShowTextInputDialog(true)
  }
  
  // Handler for closing text input dialog
  const handleCloseTextInputDialog = () => {
    setShowTextInputDialog(false)
  }
  
  // Handler for saving text file
  const handleSaveTextFile = async () => {
    if (textInput.trim()) {
      await createTextFile(textInput, textFileName, textFileDescription)
      handleCloseTextInputDialog()
    }
  }
  
  // Handler for quick text file creation
  const handleQuickTextFileCreate = async () => {
    await quickCreateTextFile()
  }
  
  // Handler for creating a group from two selected files
  const handleCreateGroupFromSelection = async () => {
    if (selectedFileIds.length === 2) {
      await createGroupFromFiles(selectedFileIds[0], selectedFileIds[1])
      clearSelections()
    }
  }
  
  // Handler for clicking on a group
  const handleGroupClick = (group: FileGroup) => {
    setActiveTab(group.id)
  }
  
  // Handler for clicking on a prompt
  const handlePromptClick = (prompt: Prompt) => {
    setCurrentPrompt(prompt)
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Storage indicator */}
      <div className="px-4 py-2 mb-4 bg-secondary/30 rounded-md">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm">Storage used: {Math.round(totalStorage / 1024 / 1024)}MB of {Math.round(storageLimit / 1024 / 1024)}MB</span>
          <span className="text-sm">{storagePercentage}%</span>
        </div>
        <Progress value={storagePercentage} className="h-2" />
      </div>
      
      {/* Main content */}
      <Tabs defaultValue="all-files" className="w-full" onValueChange={(value) => setActiveTab(value)}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all-files">All Files</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button
              variant="outline" 
              size="sm"
              onClick={handleQuickTextFileCreate}
              disabled={isCreatingFile}
            >
              <TextIcon className="w-4 h-4 mr-2" />
              Quick Text
            </Button>
            
            <Button
              variant="outline" 
              size="sm"
              onClick={handleOpenTextInputDialog}
            >
              <TextIcon className="w-4 h-4 mr-2" />
              New Text
            </Button>
            
            <Button
              variant="default" 
              size="sm"
              onClick={openFileSelector}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload
            </Button>
            
            {selectedFileIds.length === 2 && (
              <Button
                variant="outline" 
                size="sm"
                onClick={handleCreateGroupFromSelection}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            )}
          </div>
        </div>
        
        <div {...getRootProps()} className={`w-full h-full rounded-md ${isDragActive ? 'border-2 border-dashed border-primary' : ''}`}>
          <input {...getInputProps()} />
          
          <TabsContent value="all-files" className="mt-0">
            <div className="flex gap-6">
              {/* File groups section */}
              <div className="w-1/3">
                <DraggableFileGroups 
                  fileGroups={fileGroups}
                  onCreateGroup={createGroup}
                  onEditGroup={editGroup}
                  onDeleteGroup={deleteGroup}
                  onGroupClick={handleGroupClick}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  draggedItem={draggedItem}
                  dropTarget={dropTarget}
                  activeGroup={activeTab !== 'all-files' && activeTab !== 'prompts' ? activeTab : undefined}
                />
              </div>
              
              {/* Files section */}
              <div className="w-2/3">
                <DraggableFiles 
                  files={activeTab === 'all-files' ? filteredFiles : 
                    fileGroups.find(g => g.id === activeTab)?.files.map(f => f.file) || []}
                  onSearchChange={handleFileSearch}
                  onDeleteFile={deleteFile}
                  onEditFile={editFile}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  draggedItem={draggedItem}
                  dropTarget={dropTarget}
                  selectedFileIds={selectedFileIds}
                  onFileSelect={toggleFileSelection}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="prompts" className="mt-0">
            <PromptsPanel 
              prompts={prompts}
              currentPrompt={currentPrompt}
              onPromptClick={handlePromptClick}
              onSavePrompt={(prompt) => {
                setPrompts(prev => {
                  if (prompt.id && prev.find(p => p.id === prompt.id)) {
                    return prev.map(p => p.id === prompt.id ? prompt : p);
                  } else {
                    return [...prev, prompt];
                  }
                });
              }}
            />
          </TabsContent>
          
          {activeTab !== 'all-files' && activeTab !== 'prompts' && (
            <TabsContent value={activeTab} className="mt-0">
              <div className="flex gap-6">
                <div className="w-1/3">
                  <DraggableFileGroups 
                    fileGroups={fileGroups}
                    onCreateGroup={createGroup}
                    onEditGroup={editGroup}
                    onDeleteGroup={deleteGroup}
                    onGroupClick={handleGroupClick}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    draggedItem={draggedItem}
                    dropTarget={dropTarget}
                    activeGroup={activeTab}
                  />
                </div>
                
                <div className="w-2/3">
                  {/* Group detail view */}
                  {fileGroups.find(g => g.id === activeTab) && (
                    <div>
                      <h2 className="text-xl font-bold mb-4">
                        {fileGroups.find(g => g.id === activeTab)?.name}
                      </h2>
                      
                      {/* Chat integration settings */}
                      <div className="mb-4 p-4 bg-secondary/20 rounded-md">
                        <h3 className="text-md font-semibold mb-2">Chat Integration Settings</h3>
                        <div className="space-y-2">
                          {/* Chat settings form */}
                          {/* ... */}
                        </div>
                      </div>
                      
                      {/* Group files */}
                      <DraggableFiles 
                        files={fileGroups.find(g => g.id === activeTab)?.files.map(f => f.file) || []}
                        onSearchChange={handleFileSearch}
                        onDeleteFile={(fileId) => removeFileFromGroup(activeTab, fileId)}
                        onEditFile={editFile}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        draggedItem={draggedItem}
                        dropTarget={dropTarget}
                        selectedFileIds={selectedFileIds}
                        onFileSelect={toggleFileSelection}
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
      
      {/* Text input dialog */}
      <Dialog open={showTextInputDialog} onOpenChange={setShowTextInputDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Text File</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="File name"
                value={textFileName}
                onChange={(e) => setTextFileName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Description (optional)"
                value={textFileDescription}
                onChange={(e) => setTextFileDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Enter your text content here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="h-64"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCloseTextInputDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTextFile} disabled={!textInput.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Upload progress indicators */}
      {(uploadProgress.length > 0 || fileCreationProgress.length > 0) && (
        <div className="fixed bottom-4 right-4 w-80 bg-card p-4 rounded-md shadow-lg">
          <h3 className="font-medium mb-2">Uploads in progress</h3>
          <div className="space-y-3">
            {[...uploadProgress, ...fileCreationProgress].map((file) => (
              <div key={file.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{file.filename}</span>
                  <span>{file.progress}%</span>
                </div>
                <Progress value={file.progress} className="h-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 