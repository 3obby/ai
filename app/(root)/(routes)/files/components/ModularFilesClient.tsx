"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GridIcon, ListIcon } from "lucide-react";
import { FilesProvider } from "../context/FilesProvider";
import { useFilesContext } from "../context/FilesContext";
import { FileUploader } from "./upload/FileUploader";
import { TextFileCreator } from "./upload/TextFileCreator";
import { FileGrid } from "./view/FileGrid";
import { FileList } from "./view/FileList";
import { FileSearch } from "./actions/FileSearch";
import { StorageUsage } from "./management/StorageUsage";
import { FileBulkActions } from "./actions/FileBulkActions";
import { FileGroupDialog } from "./file-group/FileGroupDialog";
import { SortableGroupCard } from "./file-group/SortableGroupCard";
import { FileData, FileGroup, Prompt } from "../types";
import { cn } from "@/lib/utils";

interface ModularFilesClientProps {
  files: FileData[];
  fileGroups: FileGroup[];
  userId: string;
  availableTokens: number;
  totalStorage: number;
  storageLimit: number;
  storagePercentage: number;
  userPrompts: Prompt[];
}

const FilesClientContent = () => {
  const { 
    activeTab, 
    setActiveTab, 
    viewMode, 
    setViewMode,
    fileGroups
  } = useFilesContext();

  return (
    <div className="space-y-4">
      {/* Header with search and view controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <FileSearch />
        
        <div className="flex gap-2">
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('grid')}
            >
              <GridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <TextFileCreator />
          
          <FileGroupDialog />
        </div>
      </div>
      
      {/* Storage usage indicator */}
      <StorageUsage />
      
      {/* Bulk actions for selected files */}
      <FileBulkActions />
      
      {/* Tabs for all files and groups */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all-files" className="flex-shrink-0">
            All Files
          </TabsTrigger>
          
          {fileGroups.map(group => (
            <TabsTrigger key={group.id} value={group.id} className="flex-shrink-0">
              {group.name}
            </TabsTrigger>
          ))}
          
          <TabsTrigger value="prompts" className="flex-shrink-0">
            Prompts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-files" className="mt-4">
          <FileUploader className="mb-4" />
          
          {viewMode === 'grid' ? (
            <FileGrid />
          ) : (
            <FileList />
          )}
        </TabsContent>
        
        {/* Group content tabs */}
        {fileGroups.map(group => (
          <TabsContent key={group.id} value={group.id} className="mt-4">
            {viewMode === 'grid' ? (
              <FileGrid />
            ) : (
              <FileList />
            )}
          </TabsContent>
        ))}
        
        <TabsContent value="prompts" className="mt-4">
          <div className="text-center p-8 text-muted-foreground">
            Prompts panel would be rendered here
          </div>
        </TabsContent>
      </Tabs>
      
      {/* File groups grid - visible only when in "all-files" tab */}
      {activeTab === 'all-files' && fileGroups.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-3">File Groups</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fileGroups.map(group => (
              <SortableGroupCard
                key={group.id}
                group={group}
                id={`group:${group.id}`}
                onClick={() => setActiveTab(group.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ModularFilesClient = ({
  files,
  fileGroups,
  userId,
  availableTokens,
  totalStorage,
  storageLimit,
  storagePercentage,
  userPrompts,
}: ModularFilesClientProps) => {
  return (
    <FilesProvider
      initialFiles={files}
      initialFileGroups={fileGroups}
      initialUserPrompts={userPrompts}
      userId={userId}
      availableTokens={availableTokens}
      totalStorage={totalStorage}
      storageLimit={storageLimit}
      storagePercentage={storagePercentage}
    >
      <FilesClientContent />
    </FilesProvider>
  );
}; 