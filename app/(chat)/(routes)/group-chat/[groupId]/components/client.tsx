"use client"

import { FormEvent, useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useChatLimit } from "@/store/use-chat-limit"
import { usePrompts } from "@/store/use-prompts"
import { toast } from "react-hot-toast"

import { ChatForm } from "@/components/chat-form"
import { ChatMessages } from "@/components/chat-messages"
import { GroupChatHeader } from "./header"
import { ChatMessageProps } from "@/components/chat-message"

interface GroupMessage {
  id: string
  content: string
  isBot: boolean
  senderId: string
  createdAt: Date
  messageStatus?: "sent" | "delivered" | "read"
  reactions?: { emoji: string; from: string; botSrc?: string }[]
  readBy?: { name: string; src: string }[]
}

interface Companion {
  id: string
  name: string
  src: string
  userId: string
  xpEarned: number
  userName: string
  description: string
  instructions: string
  seed: string
  private: boolean
  isFree: boolean
  messageDelay: number
  sendMultipleMessages: boolean
  createdAt: Date
  updatedAt: Date
  categoryId: string
}

interface GroupChat {
  id: string
  name: string
  creatorId: string
  members: {
    companion: Companion
  }[]
  messages: GroupMessage[]
}

interface GroupChatClientProps {
  groupChat: any
  initialLoad: boolean
  userId?: string
}

interface BotResponse {
  id: string
  content: string
  isBot: boolean
  senderId: string
  createdAt: string
}

interface RespondingBot {
  id: string
  name: string
  messageDelay: number
}

interface GroupChatHeaderProps {
  groupChat: GroupChat
  onClear: () => void
  isGroupChat: boolean
  userId?: string
}

export const GroupChatClient = ({
  groupChat,
  initialLoad,
  userId,
}: GroupChatClientProps) => {
  const router = useRouter()
  const { decrementRemaining } = useChatLimit()
  const { prompts } = usePrompts()
  const activePrompts = prompts.filter((prompt) => prompt.isActive)

  const [messages, setMessages] = useState<GroupMessage[]>(groupChat.messages)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(initialLoad)
  const [isClearing, setIsClearing] = useState(false)

  // Ensure the useCompletion hook is called unconditionally
  const [input, setInput] = useState("")

  const handleInputChange = (e: any) => {
    setInput(e.target.value)
  }

  // Moving handleSubmit into useCallback
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      try {
        // Modify the input to include active prompts
        let modifiedInput = input

        if (activePrompts.length > 0) {
          const promptsText = activePrompts
            .map((prompt) => `- ${prompt.text}`)
            .join("\n")
          modifiedInput = `${input}\n\nRespond with these prompts in mind:\n${promptsText}`
        }

        // Don't send empty messages
        if (!modifiedInput.trim()) {
          return
        }

        setInput("")
        // We don't need to reset active prompts here as they are now stored in the database
        // activePrompts.forEach((prompt) => togglePrompt(prompt.id))

        // Create a new AbortController for this request
        const controller = new AbortController()
        const signal = controller.signal

        const response = await fetch(`/api/group-chat/${groupChat.id}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: modifiedInput }),
          signal, // Add the signal to the fetch request
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        if (!response.body) {
          throw new Error("No response body")
        }

        // Set up the reader
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        // Read the stream
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          // Decode the stream chunk and parse the JSON
          const chunk = decoder.decode(value)
          const botMessage = JSON.parse(chunk)

          // Add the message to the state
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: botMessage.id,
              content: botMessage.content,
              isBot: true,
              senderId: botMessage.senderId,
              createdAt: new Date(botMessage.createdAt),
            },
          ])
        }

        decrementRemaining()
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request was aborted")
        } else {
          console.error("Error sending message:", error)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [input, activePrompts]
  )

  // Ensure all hooks are called at the top level
  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      if (!input.trim() || isLoading) return;
      
      try {
        setIsLoading(true);
        
        // Create a new user message
        const userMessage: ChatMessageProps = {
          role: "user",
          content: input,
          isLoading: false,
        };
        
        // Add the user message to the chat
        setMessages((prevMessages) => [...prevMessages, {
          id: Date.now().toString(),
          content: input,
          isBot: false,
          senderId: "user",
          createdAt: new Date(),
          messageStatus: "sent",
          reactions: [],
          readBy: [],
        }]);
        setInput("");
        
        // Send the message to the server to get bot responses
        const url = userId ? 
          `/api/group-chat/${groupChat.id}/chat?userId=${userId}` : 
          `/api/group-chat/${groupChat.id}/chat`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: input,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Set up the reader
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Read the stream
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Decode the stream chunk and parse the JSON
          const chunk = decoder.decode(value);
          const botMessage = JSON.parse(chunk);

          // Add the message to the state
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: botMessage.id,
              content: botMessage.content,
              isBot: true,
              senderId: botMessage.senderId,
              createdAt: new Date(botMessage.createdAt),
            },
          ]);
        }

        decrementRemaining();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request was aborted");
        } else {
          console.error("Error sending message:", error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, activePrompts, groupChat.id, userId]
  );

  // Initialize state with messages from the database
  useEffect(() => {
    if (groupChat.messages && groupChat.messages.length > 0) {
      setMessages(groupChat.messages)
      setIsInitializing(false)
    } else {
      // Initialize with empty array if messages is undefined or empty
      setMessages([])
      setIsInitializing(false)
    }
  }, [groupChat.messages])

  const handleClearGroupChat = async () => {
    try {
      setIsLoading(true);
      
      const url = userId ? 
        `/api/group-chat/${groupChat.id}/chat/clear?userId=${userId}` : 
        `/api/group-chat/${groupChat.id}/chat/clear`;
      
      await fetch(url, {
        method: "DELETE",
      });
      
      setMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading messages...
      </div>
    )
  }

  // Transform group messages to chat message props
  const transformedMessages: ChatMessageProps[] = messages.map((message) => {
    const sender = message.isBot
      ? groupChat.members.find(
          (member: any) => member.companion.id === message.senderId
        )?.companion
      : null

    return {
      id: message.id,
      role: message.isBot ? "assistant" : "user",
      content: message.content,
      src: sender?.src || "",
      name: sender?.name || "User",
      messageStatus: message.messageStatus || "read",
      reactions: message.reactions || [],
      readBy: message.readBy || [],
    } as ChatMessageProps
  })

  return isClearing ? (
    <div className="flex items-center justify-center h-full">
      <div className="spinner mr-2" />
      Clearing chat messages...
    </div>
  ) : (
    <div className="flex flex-col h-full p-4 space-y-2">
      <GroupChatHeader
        groupChat={groupChat}
        onClear={handleClearGroupChat}
        userId={userId}
      />
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={transformedMessages} isLoading={isLoading} />
      </div>
      <div className="mt-4">
        <ChatForm
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
