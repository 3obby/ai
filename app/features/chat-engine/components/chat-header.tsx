"use client"

import { useState } from "react"
import axios from "axios"
import api from '@/lib/axios-config'
import {
  Edit,
  MessagesSquare,
  MoreVertical,
  Trash,
  ChevronLeft,
  Users,
  Settings,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Companion, Message } from "@prisma/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { getAbsoluteUrl } from '@/lib/url-helper'
import Cookies from 'js-cookie'

import { Button } from "@/components/ui/button"
import { BotAvatar } from "@/components/bot-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmationModal } from "@/components/modals/confirmation-modal"
import { CreateGroupChatModal } from "@/components/modals/create-group-chat-modal"

interface ChatHeaderProps {
  companion: Companion & {
    messages: Message[]
    _count: {
      messages: number
    }
  }
  onClear: (onClose: () => void) => void
  isGroupChat: boolean
  isClearingMessages: boolean
  children?: React.ReactNode;
  userId?: string;
}

export const ChatHeader = ({
  companion,
  onClear,
  isGroupChat,
  isClearingMessages,
  children,
  userId,
}: ChatHeaderProps) => {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const onDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Use our pre-configured axios instance
      await api.delete(`/api/companion/${companion.id}`);
      
      toast({
        description: "Success."
      });
      
      router.refresh();
      router.push("/");
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Something went wrong.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const onCreateGroupChat = async (name: string) => {
    try {
      setIsCreatingGroup(true)
      
      // Make sure we have the userId for anonymous users
      const anonymousUserId = userId || Cookies.get('anonymousUserId');
      
      // Use our pre-configured axios instance for fetching messages
      const messagesResponse = await api.get(`/api/companion/${companion.id}/messages`, {
        params: {
          limit: 20,
          userId: anonymousUserId // Ensure we always have a userId parameter
        }
      });
      
      const latestMessages = messagesResponse.data;
      
      // Use pre-configured axios for creating group chat
      const groupResponse = await api.post(`/api/group-chat`, {
        name: name,
        initialCompanionId: companion.id,
        chatHistory: latestMessages.slice(-5), // Match the parameter name expected by the API
        userId: anonymousUserId // Always include userId for anonymous users
      });
      
      router.push(anonymousUserId ? 
        `/group-chat/${groupResponse.data.id}?userId=${anonymousUserId}` : 
        `/group-chat/${groupResponse.data.id}`
      );
    } catch (error) {
      console.error('Error creating group chat:', error);
      toast({
        variant: "destructive",
        description: "Failed to create group chat.",
      });
    } finally {
      setIsCreatingGroup(false);
    }
  }

  const handleClearChat = () => {
    onClear(() => setShowClearConfirmation(false))
  }

  return (
    <>
      <div className="flex w-full justify-between items-center border-b border-primary/10 pb-4">
        <div className="flex gap-x-2 items-center">
          <Button onClick={() => router.back()} size="icon" variant="ghost">
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <BotAvatar src={companion.src} />
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-x-2">
              <p className="font-bold">{companion.name}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <MessagesSquare className="w-3 h-3 mr-1" />
                {companion._count.messages}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Created by {companion.userName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          {children}
          
          <Button
            onClick={() => setShowCreateGroup(true)}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-primary"
          >
            <Users className="h-4 w-4 mr-2" />
            Create Group
          </Button>

          {companion.messages.length > 0 && (
            <Button
              onClick={() => setShowClearConfirmation(true)}
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-red-500"
            >
              <Trash className="h-5 w-5" />
            </Button>
          )}
          {user?.id === companion.userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/companion/${companion.id}`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete}>
                  <Trash className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={handleClearChat}
        title="Clear Chat History"
        description="Are you sure you want to clear all messages? This action cannot be undone."
        isLoading={isClearingMessages}
      />

      <CreateGroupChatModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onConfirm={onCreateGroupChat}
        companionName={companion.name}
        isLoading={isCreatingGroup}
        userId={userId}
      />
    </>
  )
}
