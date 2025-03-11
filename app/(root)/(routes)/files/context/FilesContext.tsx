import { createContext, useContext } from 'react';
import { FileData, FileGroup, Prompt } from '../types';

export interface FilesContextType {
  // File data
  files: FileData[];
  setFiles: (files: FileData[]) => void;
  
  // File groups
  fileGroups: FileGroup[];
  setFileGroups: (groups: FileGroup[]) => void;
  
  // Upload state
  uploading: boolean;
  setUploading: (state: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
  
  // User data
  userId: string;
  availableTokens: number;
  
  // Storage metrics
  totalStorage: number;
  storageLimit: number;
  storagePercentage: number;
  
  // Prompts
  userPrompts: Prompt[];
  setUserPrompts: (prompts: Prompt[]) => void;
  
  // Selected items for bulk actions
  selectedFiles: Set<string>;
  setSelectedFiles: (selectedFiles: Set<string>) => void;
  
  // View state
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Refresh data
  refreshData: () => Promise<void>;
}

export const FilesContext = createContext<FilesContextType | undefined>(undefined);

export const useFilesContext = () => {
  const context = useContext(FilesContext);
  
  if (context === undefined) {
    throw new Error('useFilesContext must be used within a FilesProvider');
  }
  
  return context;
}; 