import { create } from 'zustand';

export interface GroupMessage {
  id: string;
  content: string;
  isBot: boolean;
  senderId: string;
  createdAt: Date;
  groupChatId?: string; // Make optional to match database model
}

interface GroupMessagesStore {
  messages: Record<string, GroupMessage[]>; // Key is groupChatId
  addMessage: (groupId: string, message: GroupMessage) => void;
  setMessages: (groupId: string, messages: GroupMessage[]) => void;
  clearMessages: (groupId: string) => void;
  getMessages: (groupId: string) => GroupMessage[];
}

export const useGroupMessages = create<GroupMessagesStore>((set, get) => ({
  messages: {},
  addMessage: (groupId, message) => {
    set((state) => {
      const currentMessages = state.messages[groupId] || [];
      // Check if message already exists
      if (!currentMessages.some(m => m.id === message.id)) {
        return {
          messages: {
            ...state.messages,
            [groupId]: [...currentMessages, message]
          }
        };
      }
      return state;
    });
  },
  setMessages: (groupId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [groupId]: messages
      }
    }));
  },
  clearMessages: (groupId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [groupId]: []
      }
    }));
  },
  getMessages: (groupId) => {
    return get().messages[groupId] || [];
  }
})); 