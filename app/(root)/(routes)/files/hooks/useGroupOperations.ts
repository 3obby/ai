import { useState } from "react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { FileData, FileGroup } from "../types";

export function useGroupOperations(onSuccess?: () => void) {
  const [isManagingGroup, setIsManagingGroup] = useState(false);

  // Create a new file group
  const createGroup = async (name: string, description?: string) => {
    setIsManagingGroup(true);
    try {
      const response = await axios.post("/api/files/groups", {
        name,
        description,
      });

      toast({
        title: "Group created",
        description: "Your file group has been created successfully.",
        variant: "default",
      });

      onSuccess?.();
      return response.data;
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsManagingGroup(false);
    }
  };

  // Edit an existing file group
  const editGroup = async (groupId: string, name: string, description?: string) => {
    setIsManagingGroup(true);
    try {
      const response = await axios.patch(`/api/files/groups/${groupId}`, {
        name,
        description,
      });

      toast({
        title: "Group updated",
        description: "Your file group has been updated successfully.",
        variant: "default",
      });

      onSuccess?.();
      return response.data;
    } catch (error) {
      console.error("Error updating group:", error);
      toast({
        title: "Error",
        description: "Failed to update group. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsManagingGroup(false);
    }
  };

  // Delete a file group
  const deleteGroup = async (groupId: string) => {
    setIsManagingGroup(true);
    try {
      await axios.delete(`/api/files/groups/${groupId}`);

      toast({
        title: "Group deleted",
        description: "Your file group has been deleted successfully.",
        variant: "default",
      });

      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsManagingGroup(false);
    }
  };

  // Add a file to a group
  const addFileToGroup = async (groupId: string, fileId: string) => {
    try {
      await axios.post(`/api/files/groups/${groupId}/files`, {
        fileId,
      });

      toast({
        title: "File added to group",
        description: "The file has been added to the group successfully.",
        variant: "default",
      });

      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error adding file to group:", error);
      toast({
        title: "Error",
        description: "Failed to add file to group. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remove a file from a group
  const removeFileFromGroup = async (groupId: string, fileId: string) => {
    try {
      await axios.delete(`/api/files/groups/${groupId}/files/${fileId}`);

      toast({
        title: "File removed from group",
        description: "The file has been removed from the group successfully.",
        variant: "default",
      });

      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error removing file from group:", error);
      toast({
        title: "Error",
        description: "Failed to remove file from group. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Create a group from two files
  const createGroupFromFiles = async (fileId1: string, fileId2: string, name: string = "New Group") => {
    setIsManagingGroup(true);
    try {
      // First create the group
      const newGroup = await createGroup(name);
      
      if (!newGroup) {
        throw new Error("Failed to create group");
      }
      
      // Then add both files to the group
      await addFileToGroup(newGroup.id, fileId1);
      await addFileToGroup(newGroup.id, fileId2);

      toast({
        title: "Group created with files",
        description: "A new group has been created with the selected files.",
        variant: "default",
      });

      onSuccess?.();
      return newGroup;
    } catch (error) {
      console.error("Error creating group from files:", error);
      toast({
        title: "Error",
        description: "Failed to create group with files. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsManagingGroup(false);
    }
  };

  // Merge two groups
  const mergeGroups = async (sourceGroupId: string, targetGroupId: string) => {
    setIsManagingGroup(true);
    try {
      const response = await axios.post(`/api/files/groups/${targetGroupId}/merge`, {
        sourceGroupId,
      });

      toast({
        title: "Groups merged",
        description: "The groups have been merged successfully.",
        variant: "default",
      });

      onSuccess?.();
      return response.data;
    } catch (error) {
      console.error("Error merging groups:", error);
      toast({
        title: "Error",
        description: "Failed to merge groups. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsManagingGroup(false);
    }
  };

  // Update chat configuration for a group
  const updateChatConfig = async (
    groupId: string, 
    injectAtStart: boolean, 
    injectWithEveryPrompt: boolean
  ) => {
    try {
      await axios.patch(`/api/files/groups/${groupId}/chat-config`, {
        injectAtStart,
        injectWithEveryPrompt,
      });

      toast({
        title: "Chat settings updated",
        description: "Chat integration settings have been updated successfully.",
        variant: "default",
      });

      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error updating chat config:", error);
      toast({
        title: "Error",
        description: "Failed to update chat settings. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    createGroup,
    editGroup,
    deleteGroup,
    addFileToGroup,
    removeFileFromGroup,
    createGroupFromFiles,
    mergeGroups,
    updateChatConfig,
    isManagingGroup
  };
} 