import { useState } from "react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { FileData, FileUploadProgress } from "../types";

export function useFileOperations(userId: string, onSuccess?: () => void) {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);

  // Delete a file
  const deleteFile = async (fileId: string) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      toast({
        title: "File deleted",
        description: "Your file has been deleted successfully.",
        variant: "default",
      });
      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Edit file details
  const editFile = async (file: FileData, description: string) => {
    try {
      await axios.patch(`/api/files/${file.id}`, {
        description,
      });
      toast({
        title: "File updated",
        description: "Your file has been updated successfully.",
        variant: "default",
      });
      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error updating file:", error);
      toast({
        title: "Error",
        description: "Failed to update file. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Create a text file from text content
  const createTextFile = async (content: string, name: string = "New Text File", description: string = "") => {
    setIsCreatingFile(true);
    try {
      const tempId = uuidv4();
      setUploadProgress(prev => [
        ...prev,
        { id: tempId, filename: name, progress: 0 }
      ]);

      // Create a blob from the text content
      const textBlob = new Blob([content], { type: 'text/plain' });
      const file = new File([textBlob], name + '.txt', { type: 'text/plain' });

      // Create form data for the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('description', description);

      // Upload the file
      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateProgressForFile(tempId, progress);
          }
        },
      });

      // Remove from progress after upload is complete
      setUploadProgress(prev => prev.filter(p => p.id !== tempId));
      
      toast({
        title: "File created",
        description: "Your text file has been created successfully.",
        variant: "default",
      });
      
      onSuccess?.();
      return response.data;
    } catch (error) {
      console.error("Error creating text file:", error);
      toast({
        title: "Error",
        description: "Failed to create text file. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreatingFile(false);
    }
  };

  // Create a quick text file with minimal UI
  const quickCreateTextFile = async () => {
    return createTextFile("", "Quick Note", "");
  };

  // Helper function to update progress for a specific file
  const updateProgressForFile = (fileId: string, progress: number) => {
    setUploadProgress(prev => 
      prev.map(p => p.id === fileId ? { ...p, progress } : p)
    );
  };

  return {
    deleteFile,
    editFile,
    createTextFile,
    quickCreateTextFile,
    isCreatingFile,
    uploadProgress
  };
} 