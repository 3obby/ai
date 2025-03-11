import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";
import { FileUploadProgress } from "../types";

interface UseFileUploadProps {
  userId: string;
  maxSize?: number;
  acceptedTypes?: Record<string, string[]>;
  onUploadComplete?: () => void;
}

export function useFileUpload({
  userId,
  maxSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes = {
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/msword": [".doc"],
    "text/csv": [".csv"],
    "application/json": [".json"]
  },
  onUploadComplete
}: UseFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);

  // Handle file upload
  const uploadFile = useCallback(async (file: File, description: string = "") => {
    const tempId = uuidv4();
    
    try {
      setIsUploading(true);
      
      // Add file to upload progress
      setUploadProgress(prev => [
        ...prev,
        { id: tempId, filename: file.name, progress: 0 }
      ]);

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("description", description);

      // Send upload request
      const response = await axios.post("/api/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
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
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
        variant: "default",
      });
      
      onUploadComplete?.();
      return response.data;
    } catch (error) {
      console.error("Error uploading file:", error);
      
      // Update progress with error
      setUploadProgress(prev => 
        prev.map(p => p.id === tempId ? { ...p, error: "Upload failed" } : p)
      );
      
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
      
      return null;
    } finally {
      // Remove progress item after a delay if there was an error
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.id !== tempId));
        setIsUploading(false);
      }, 3000);
    }
  }, [userId, onUploadComplete]);

  // Handle multiple file uploads
  const uploadFiles = useCallback(async (files: File[], description: string = "") => {
    setIsUploading(true);
    const results = [];
    
    for (const file of files) {
      const result = await uploadFile(file, description);
      if (result) results.push(result);
    }
    
    setIsUploading(false);
    return results;
  }, [uploadFile]);

  // Helper function to update progress for a specific file
  const updateProgressForFile = (fileId: string, progress: number) => {
    setUploadProgress(prev => 
      prev.map(p => p.id === fileId ? { ...p, progress } : p)
    );
  };

  // Configure dropzone
  const { 
    getRootProps, 
    getInputProps, 
    isDragActive,
    open: openFileSelector
  } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await uploadFiles(acceptedFiles);
      }
    },
    maxSize,
    accept: acceptedTypes,
    noClick: true,
    noKeyboard: true
  });

  return {
    uploadFile,
    uploadFiles,
    isUploading,
    uploadProgress,
    getRootProps,
    getInputProps,
    isDragActive,
    openFileSelector
  };
} 