"use client";

import { useCallback } from "react";
import axios from "axios";
import { FileData, FileGroup } from "../types";
import { useFilesContext } from "../context/FilesContext";
import { toast } from "@/components/ui/use-toast";

export const useFileManagement = () => {
  const {
    files,
    setFiles,
    fileGroups,
    setFileGroups,
    selectedFiles,
    setSelectedFiles,
    refreshData
  } = useFilesContext();

  // Delete a single file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      
      // Update local state
      setFiles(files.filter(file => file.id !== fileId));
      
      // Remove the file from selected files
      if (selectedFiles.has(fileId)) {
        const newSelectedFiles = new Set(selectedFiles);
        newSelectedFiles.delete(fileId);
        setSelectedFiles(newSelectedFiles);
      }
      
      // Also update the file in any groups
      const updatedGroups = fileGroups.map(group => ({
        ...group,
        files: group.files.filter(f => f.fileId !== fileId)
      }));
      
      setFileGroups(updatedGroups);
      
      toast({
        title: "File Deleted",
        description: "File has been deleted successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [files, setFiles, fileGroups, setFileGroups, selectedFiles, setSelectedFiles]);

  // Delete multiple files
  const deleteMultipleFiles = useCallback(async (fileIds: string[]) => {
    try {
      const promises = fileIds.map(id => axios.delete(`/api/files/${id}`));
      await Promise.all(promises);
      
      // Update local state
      setFiles(files.filter(file => !fileIds.includes(file.id)));
      
      // Clear selected files
      setSelectedFiles(new Set());
      
      // Update file groups
      const updatedGroups = fileGroups.map(group => ({
        ...group,
        files: group.files.filter(f => !fileIds.includes(f.fileId))
      }));
      
      setFileGroups(updatedGroups);
      
      toast({
        title: "Files Deleted",
        description: `Successfully deleted ${fileIds.length} files`,
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting multiple files:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete one or more files. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [files, setFiles, fileGroups, setFileGroups, setSelectedFiles]);

  // Update file details (name, description)
  const updateFile = useCallback(async (fileId: string, updateData: { name?: string; description?: string }) => {
    try {
      const { data } = await axios.patch(`/api/files/${fileId}`, updateData);
      
      if (data.file) {
        // Update the file in the files list
        setFiles(files.map(file => 
          file.id === fileId ? { ...file, ...data.file } : file
        ));
        
        // Update the file in any groups
        const updatedGroups = fileGroups.map(group => ({
          ...group,
          files: group.files.map(f => 
            f.fileId === fileId 
              ? { ...f, file: { ...f.file, ...data.file } } 
              : f
          )
        }));
        
        setFileGroups(updatedGroups);
        
        toast({
          title: "File Updated",
          description: "File details have been updated successfully",
        });
      }
      
      return data.file;
    } catch (error) {
      console.error("Error updating file:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update file details. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [files, setFiles, fileGroups, setFileGroups]);

  // Add a file to a group
  const addFileToGroup = useCallback(async (fileId: string, groupId: string) => {
    try {
      await axios.post(`/api/files/groups/${groupId}/files`, { fileId });
      
      // Refresh data to get updated structure
      await refreshData();
      
      toast({
        title: "File Added to Group",
        description: "File has been added to the group successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error adding file to group:", error);
      toast({
        title: "Action Failed",
        description: "Failed to add file to group. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [refreshData]);
  
  // Remove a file from a group
  const removeFileFromGroup = useCallback(async (fileId: string, groupId: string) => {
    try {
      await axios.delete(`/api/files/groups/${groupId}/files/${fileId}`);
      
      // Update local state
      const updatedGroups = fileGroups.map(group => 
        group.id === groupId
          ? { ...group, files: group.files.filter(f => f.fileId !== fileId) }
          : group
      );
      
      setFileGroups(updatedGroups);
      
      toast({
        title: "File Removed from Group",
        description: "File has been removed from the group successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error removing file from group:", error);
      toast({
        title: "Action Failed",
        description: "Failed to remove file from group. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [fileGroups, setFileGroups]);
  
  // Create a new file group
  const createFileGroup = useCallback(async (name: string, description?: string, color?: string) => {
    try {
      const { data } = await axios.post('/api/files/groups', {
        name,
        description,
        color
      });
      
      if (data.fileGroup) {
        // Add the new group to state
        setFileGroups([...fileGroups, { ...data.fileGroup, files: [] }]);
        
        toast({
          title: "Group Created",
          description: "New file group has been created successfully",
        });
        
        return data.fileGroup;
      }
      
      return null;
    } catch (error) {
      console.error("Error creating file group:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create file group. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [fileGroups, setFileGroups]);
  
  // Update a file group
  const updateFileGroup = useCallback(async (groupId: string, updateData: { name?: string; description?: string; color?: string }) => {
    try {
      const { data } = await axios.patch(`/api/files/groups/${groupId}`, updateData);
      
      if (data.fileGroup) {
        // Update the group in state
        setFileGroups(fileGroups.map(group => 
          group.id === groupId 
            ? { ...group, ...data.fileGroup } 
            : group
        ));
        
        toast({
          title: "Group Updated",
          description: "File group has been updated successfully",
        });
        
        return data.fileGroup;
      }
      
      return null;
    } catch (error) {
      console.error("Error updating file group:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update file group. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [fileGroups, setFileGroups]);
  
  // Delete a file group
  const deleteFileGroup = useCallback(async (groupId: string) => {
    try {
      await axios.delete(`/api/files/groups/${groupId}`);
      
      // Remove the group from state
      setFileGroups(fileGroups.filter(group => group.id !== groupId));
      
      toast({
        title: "Group Deleted",
        description: "File group has been deleted successfully",
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting file group:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete file group. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [fileGroups, setFileGroups]);
  
  return {
    deleteFile,
    deleteMultipleFiles,
    updateFile,
    addFileToGroup,
    removeFileFromGroup,
    createFileGroup,
    updateFileGroup,
    deleteFileGroup,
  };
}; 