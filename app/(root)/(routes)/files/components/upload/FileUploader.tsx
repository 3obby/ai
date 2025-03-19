"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, Loader2, AlertTriangle, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFilesContext } from "../../context/FilesContext";
import { useFileUpload } from "../../hooks/useFileUpload";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  className?: string;
}

export const FileUploader = ({ className }: FileUploaderProps) => {
  const { uploading, uploadProgress } = useFilesContext();
  const { handleFileDrop, uploadErrors } = useFileUpload({
    maxFileSize: 50 * 1024 * 1024, // 50MB
    acceptedFileTypes: [
      "image/*",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
      "text/markdown",
      "text/csv",
    ],
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    disabled: uploading,
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: {
      "image/*": [],
      "application/pdf": [],
      "text/plain": [],
      "application/msword": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
      "application/vnd.ms-excel": [],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
      "application/json": [],
      "text/markdown": [],
      "text/csv": [],
    },
  });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          "flex flex-col items-center justify-center text-center",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center space-y-4 py-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-sm text-muted-foreground">
              Uploading files... {uploadProgress}%
            </div>
            <Progress value={uploadProgress} className="w-full max-w-xs" />
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center space-y-4 py-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <FileUp className="h-10 w-10 text-primary" />
            </motion.div>
            <div className="font-medium">Drop files here</div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 py-4">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">
                Drag & drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports images, PDFs, documents, and text files (max 50MB)
              </p>
            </div>
            <Button variant="outline" disabled={uploading}>
              Select Files
            </Button>
          </div>
        )}
      </div>

      {uploadErrors.length > 0 && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center gap-2 text-destructive font-medium mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Upload Errors</span>
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {uploadErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}; 