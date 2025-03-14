import prismadb from '@/lib/prismadb';
import { Chat, ChatType, ChatMessage } from '@/app/shared/types/chat';
import { cache } from 'react';

export async function getChat(chatId: string): Promise<Chat | null> {
  try {
    // First try to get as individual chat
    const individualChat = await prismadb.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        participants: {
          include: {
            companion: true
          }
        }
      }
    });

    if (individualChat) {
      // Process individual chat data
      const formattedParticipants = individualChat.participants.map(p => ({
        id: p.id,
        chatId: p.chatId,
        participantId: p.companion.id,
        participantType: 'companion',
        role: p.role,
        joinedAt: p.createdAt,
        displayName: p.companion.name,
        avatarUrl: p.companion.src
      }));

      return {
        id: individualChat.id,
        name: individualChat.name,
        type: ChatType.INDIVIDUAL,
        createdAt: individualChat.createdAt,
        updatedAt: individualChat.updatedAt,
        participants: formattedParticipants,
        messageCount: await prismadb.message.count({
          where: { chatId: individualChat.id }
        }),
        lastMessageAt: individualChat.messages[0]?.createdAt || individualChat.createdAt
      };
    }

    // Try to get as group chat
    const groupChat = await prismadb.groupChat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            companion: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (groupChat) {
      // Process group chat data
      const formattedParticipants = groupChat.members.map(m => ({
        id: m.id,
        chatId: m.groupChatId,
        participantId: m.companion.id,
        participantType: 'companion',
        role: 'member',
        joinedAt: m.createdAt,
        displayName: m.companion.name,
        avatarUrl: m.companion.src
      }));

      return {
        id: groupChat.id,
        name: groupChat.name,
        type: ChatType.GROUP,
        creatorId: groupChat.creatorId,
        createdAt: groupChat.createdAt,
        updatedAt: groupChat.updatedAt,
        participants: formattedParticipants,
        messageCount: await prismadb.groupMessage.count({
          where: { groupChatId: groupChat.id }
        }),
        lastMessageAt: groupChat.messages[0]?.createdAt || groupChat.createdAt
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

export const getRecentChats = cache(async (userId: string, limit = 5): Promise<Chat[]> => {
  try {
    // Get both individual and group chats where the user is a participant
    const chats = await prismadb.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: true,
            companion: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });

    return chats;
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    return [];
  }
});

export const getChatById = cache(async (chatId: string): Promise<Chat | null> => {
  try {
    const chat = await prismadb.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: true,
            companion: true
          }
        }
      }
    });

    return chat;
  } catch (error) {
    console.error(`Error fetching chat with id ${chatId}:`, error);
    return null;
  }
});

export const getChatMessages = cache(async (chatId: string, limit = 50): Promise<ChatMessage[]> => {
  try {
    const messages = await prismadb.message.findMany({
      where: { chatId },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit,
      include: {
        companion: true,
        user: true
      }
    });

    return messages;
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error);
    return [];
  }
}); 