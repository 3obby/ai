'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { ChatParticipant, ParticipantType, ParticipantRole } from '@/app/shared/types/chat';
import { Companion } from '@/app/shared/types/companion';

interface GroupChatState {
  groupChat: {
    id: string;
    name: string;
    creatorId: string;
    createdAt: Date;
    updatedAt: Date;
    members: {
      id: string;
      companion: Companion;
    }[];
  } | null;
  isLoading: boolean;
  error: any;
  participants: ChatParticipant[];
  availableCompanions: Companion[];
  isAddingMember: boolean;
  isRemovingMember: boolean;
  isRenamingGroup: boolean;
  addMember: (companionId: string) => Promise<void>;
  removeMember: (companionId: string) => Promise<void>;
  renameGroup: (newName: string) => Promise<void>;
  refreshMembers: () => void;
}

interface GroupChatProviderProps {
  children: ReactNode;
  groupId: string;
}

const GroupChatContext = createContext<GroupChatState | undefined>(undefined);

export const GroupChatProvider = ({ children, groupId }: GroupChatProviderProps) => {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);

  // Fetch the group chat data
  const { data: groupChatData, error: groupChatError, isLoading: isGroupChatLoading, mutate: refreshGroupChat } = useSWR(
    `/api/chats/group/${groupId}`,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5 seconds
    }
  );

  // Fetch available companions to add to the group
  const { data: companionsData, isLoading: isCompanionsLoading } = useSWR(
    `/api/companions`,
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  // Convert group members to chat participants
  const participants: ChatParticipant[] = groupChatData?.groupChat?.members?.map((member: any) => ({
    id: member.id,
    chatId: groupId,
    participantId: member.companion.id,
    participantType: ParticipantType.COMPANION,
    role: ParticipantRole.MEMBER,
    joinedAt: new Date(member.createdAt),
    displayName: member.companion.name,
    avatarUrl: member.companion.src,
  })) || [];

  // Filter available companions to exclude those already in the group
  const groupMemberIds = groupChatData?.groupChat?.members?.map((member: any) => member.companion.id) || [];
  const availableCompanions = (companionsData?.companions || [])
    .filter((companion: Companion) => !groupMemberIds.includes(companion.id));

  // Add a companion to the group
  const addMember = async (companionId: string) => {
    try {
      setIsAddingMember(true);
      await axios.post(`/api/chats/group/${groupId}/members`, {
        companionId,
      });
      // Refresh the group chat data
      await refreshGroupChat();
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove a companion from the group
  const removeMember = async (companionId: string) => {
    try {
      setIsRemovingMember(true);
      await axios.delete(`/api/chats/group/${groupId}/members/${companionId}`);
      // Refresh the group chat data
      await refreshGroupChat();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    } finally {
      setIsRemovingMember(false);
    }
  };

  // Rename the group chat
  const renameGroup = async (newName: string) => {
    try {
      setIsRenamingGroup(true);
      await axios.patch(`/api/chats/group/${groupId}`, {
        name: newName,
      });
      // Refresh the group chat data
      await refreshGroupChat();
    } catch (error) {
      console.error('Error renaming group:', error);
      throw error;
    } finally {
      setIsRenamingGroup(false);
    }
  };

  // Provide the group chat state and actions
  const groupChatState: GroupChatState = {
    groupChat: groupChatData?.groupChat || null,
    isLoading: isGroupChatLoading || isCompanionsLoading,
    error: groupChatError,
    participants,
    availableCompanions,
    isAddingMember,
    isRemovingMember,
    isRenamingGroup,
    addMember,
    removeMember,
    renameGroup,
    refreshMembers: refreshGroupChat,
  };

  return (
    <GroupChatContext.Provider value={groupChatState}>
      {children}
    </GroupChatContext.Provider>
  );
};

export const useGroupChat = (): GroupChatState => {
  const context = useContext(GroupChatContext);
  
  if (context === undefined) {
    throw new Error('useGroupChat must be used within a GroupChatProvider');
  }
  
  return context;
}; 