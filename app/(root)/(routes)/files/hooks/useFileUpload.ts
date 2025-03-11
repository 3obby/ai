"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { FileData } from "../types";
import { useFilesContext } from "../context/FilesContext";
import { toast } from "@/components/ui/use-toast";

interface FileUploadOptions {
  maxFileSize?: number;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

export const useFileUpload = (options: FileUploadOptions = {}) => {
  const {
    maxFileSize = 50 * 1024 * 1024, // 50MB default
    maxFiles = 10,
    acceptedFileTypes = [],
  } = options;

  const {
    files,
    setFiles,
    setUploading,
    setUploadProgress,
    refreshData,
    totalStorage,
    storageLimit,
  } = useFilesContext();

  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const validateFile = useCallback(
    (file: File) => {
      // Size check
      if (file.size > maxFileSize) {
        return `File ${file.name} exceeds maximum size of ${maxFileSize / (1024 * 1024)}MB`;
      }

      // Type check
      if (
        acceptedFileTypes.length > 0 &&
        !acceptedFileTypes.some((type) => {
          if (type.includes("*")) {
            const baseType = type.split("/")[0];
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        })
      ) {
        return `File ${file.name} is not an accepted file type`;
      }

      // Storage limit check
      if (totalStorage + file.size > storageLimit) {
        return `Uploading ${file.name} would exceed your storage limit`;
      }

      return null;
    },
    [maxFileSize, acceptedFileTypes, totalStorage, storageLimit]
  );

  const uploadFile = useCallback(
    async (file: File, description?: string) => {
      try {
        setUploading(true);
        setUploadErrors([]);
        
        // Request a signed URL
        const { data: uploadUrlData } = await axios.post("/api/files/upload-url", {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });

        // Upload to Google Cloud Storage
        await axios.put(uploadUrlData.url, file, {
          headers: {
            "Content-Type": file.type,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        });

        // Confirm upload with our API
        const { data: confirmData } = await axios.post("/api/files/confirm-upload", {
          storagePath: uploadUrlData.storagePath,
          originalName: file.name,
          contentType: file.type,
          size: file.size,
          description,
        });

        // Add the new file to the files list
        if (confirmData.file) {
          setFiles([confirmData.file, ...files]);
        }

        setUploading(false);
        setUploadProgress(0);
        
        return confirmData.file;
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploading(false);
        setUploadProgress(0);
        
        const errorMessage = axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Error uploading file.";
          
        setUploadErrors((prev) => [...prev, errorMessage]);
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        return null;
      }
    },
    [files, setFiles, setUploading, setUploadProgress]
  );

  const createTextFile = useCallback(
    async (content: string, name: string = "New Text File.txt", description?: string) => {
      try {
        setUploading(true);
        
        // Create a text file from content
        const file = new File([content], name, { type: "text/plain" });
        
        const uploadedFile = await uploadFile(file, description);
        if (uploadedFile) {
          toast({
            title: "Text File Created",
            description: `Successfully created ${name}`,
          });
        }
        
        return uploadedFile;
      } catch (error) {
        console.error("Error creating text file:", error);
        toast({
          title: "Creation Failed",
          description: "Error creating text file.",
          variant: "destructive",
        });
        return null;
      } finally {
        setUploading(false);
      }
    },
    [uploadFile]
  );

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (acceptedFiles.length === 0 && rejectedFiles.length === 0) {
        return;
      }

      if (acceptedFiles.length > maxFiles) {
        toast({
          title: "Too Many Files",
          description: `You can only upload ${maxFiles} files at once.`,
          variant: "destructive",
        });
        return;
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map((rejected) => {
          const file = rejected.file;
          const errors = rejected.errors.map((e: any) => e.message).join(", ");
          return `${file.name}: ${errors}`;
        });
        
        setUploadErrors(errors);
        errors.forEach((error) => {
          toast({
            title: "File Rejected",
            description: error,
            variant: "destructive",
          });
        });
      }

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        setUploading(true);

        // Validate each file
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        for (const file of acceptedFiles) {
          const error = validateFile(file);
          if (error) {
            invalidFiles.push(error);
          } else {
            validFiles.push(file);
          }
        }

        // Show errors for invalid files
        if (invalidFiles.length > 0) {
          setUploadErrors(invalidFiles);
          invalidFiles.forEach((error) => {
            toast({
              title: "File Validation Failed",
              description: error,
              variant: "destructive",
            });
          });
        }

        // Upload valid files
        if (validFiles.length > 0) {
          try {
            for (const file of validFiles) {
              await uploadFile(file);
            }
            
            toast({
              title: "Upload Complete",
              description: `Successfully uploaded ${validFiles.length} file(s)`,
            });
            
            // Refresh the file list
            await refreshData();
          } catch (error) {
            console.error("Error during batch upload:", error);
            toast({
              title: "Upload Failed",
              description: "An error occurred during file upload.",
              variant: "destructive",
            });
          } finally {
            setUploading(false);
          }
        } else {
          setUploading(false);
        }
      }
    },
    [validateFile, uploadFile, maxFiles, refreshData, setUploading]
  );

  return {
    uploadFile,
    createTextFile,
    handleFileDrop,
    uploadErrors,
    validateFile,
  };
}; 