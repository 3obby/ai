// File-related types

export interface FileData {
  id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  url: string;
  storagePath: string;
  createdAt: string;
  status: string;
  description?: string;
  tokensCost: number;
}

export interface FileGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  files: {
    fileId: string;
    file: FileData;
  }[];
}

export interface FileToGroupRelation {
  fileId: string;
  fileGroupId: string;
  addedAt: string;
  file: FileData;
}

export interface FilesClientProps {
  files: FileData[];
  fileGroups: FileGroup[];
  userId: string;
  availableTokens: number;
  totalStorage: number;
  storageLimit: number;
  storagePercentage: number;
}

// Prompt-related types
export interface Prompt {
  id: string;
  text: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Chat integration types
export interface FileGroupChatConfig {
  fileGroupId: string;
  groupName: string;
  injectAtStart: boolean;
  injectWithEveryPrompt: boolean;
}

// UI state types
export interface DragItem {
  id: string;
  type: 'file' | 'group';
  index: number;
}

export interface FileUploadProgress {
  id: string;
  progress: number;
  filename: string;
  error?: string;
}

export type FileViewMode = 'grid' | 'list';

export type ActiveTab = 'all-files' | string; // groupId or 'all-files' or 'prompts' 