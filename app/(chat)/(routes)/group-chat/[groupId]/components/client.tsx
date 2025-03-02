"use client"

import { FormEvent, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useChatLimit } from "@/store/use-chat-limit"
import { usePrompts } from "@/store/use-prompts"

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
}

export const GroupChatClient = ({
  groupChat,
  initialLoad,
}: GroupChatClientProps) => {
  const router = useRouter()
  const { decrementRemaining } = useChatLimit()
  const { prompts, togglePrompt } = usePrompts()
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
        // Reset active prompts
        activePrompts.forEach((prompt) => togglePrompt(prompt.id))

        const response = await fetch(`/api/group-chat/${groupChat.id}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: modifiedInput }),
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        const data = await response.json()
        const { botMessages, respondingBots } = data

        // Add initial messages
        for (let i = 0; i < botMessages.length; i++) {
          const msg = botMessages[i]
          const bot = respondingBots.find((b: any) => b.id === msg.senderId)
          const delay = bot?.messageDelay || 0

          await new Promise((resolve) => setTimeout(resolve, delay * 1000))
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: msg.id,
              content: msg.content,
              isBot: true,
              senderId: msg.senderId,
              createdAt: new Date(msg.createdAt),
            },
          ])
        }

        // Check for second message (15% chance)
        const doubleMessageRoll = Math.random() * 100
        if (doubleMessageRoll <= 15) {
          setMessages((prev) => [
            ...prev,
            {
              id: "loading",
              content: "",
              isBot: true,
              senderId: botMessages[0].senderId,
              createdAt: new Date(),
            },
          ])

          // Include prompts in follow-up message too
          let followUpPrompt = botMessages[0].content

          if (activePrompts.length > 0) {
            const promptsText = activePrompts
              .map((prompt) => `- ${prompt.text}`)
              .join("\n")

            followUpPrompt = `[ADDITIONAL INSTRUCTIONS]\n${promptsText}\n\n${followUpPrompt}`
          }

          const followUpResponse = await fetch(
            `/api/group-chat/${groupChat.id}/chat`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: followUpPrompt,
                isFollowUp: true,
              }),
            }
          )

          const followUpData = await followUpResponse.json()

          setMessages((prev) => {
            const filtered = prev.filter((msg) => msg.id !== "loading")
            return [
              ...filtered,
              ...followUpData.botMessages.map((msg: BotResponse) => ({
                id: msg.id,
                content: msg.content,
                isBot: true,
                senderId: msg.senderId,
                createdAt: new Date(msg.createdAt),
              })),
            ]
          })

          // Check for third message (5% chance)
          const tripleMessageRoll = Math.random() * 100
          if (tripleMessageRoll <= 5) {
            setMessages((prev) => [
              ...prev,
              {
                id: "loading",
                content: "",
                isBot: true,
                senderId: botMessages[0].senderId,
                createdAt: new Date(),
              },
            ])

            // Include prompts in third message too
            let thirdPrompt = followUpData.botMessages[0].content

            if (activePrompts.length > 0) {
              const promptsText = activePrompts
                .map((prompt) => `- ${prompt.text}`)
                .join("\n")

              thirdPrompt = `[ADDITIONAL INSTRUCTIONS]\n${promptsText}\n\n${thirdPrompt}`
            }

            const thirdResponse = await fetch(
              `/api/group-chat/${groupChat.id}/chat`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: thirdPrompt,
                  isFollowUp: true,
                }),
              }
            )

            const thirdData = await thirdResponse.json()

            setMessages((prev) => {
              const filtered = prev.filter((msg) => msg.id !== "loading")
              return [
                ...filtered,
                ...thirdData.botMessages.map((msg: BotResponse) => ({
                  id: msg.id,
                  content: msg.content,
                  isBot: true,
                  senderId: msg.senderId,
                  createdAt: new Date(msg.createdAt),
                })),
              ]
            })
          }
        }

        decrementRemaining()
      } catch (error) {
        console.error("Error sending message:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [input, activePrompts, togglePrompt, decrementRemaining]
  )

  // Ensure all hooks are called at the top level
  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      // Add user message to state immediately
      setIsLoading(true)
      const userMessage: GroupMessage = {
        id: Date.now().toString(),
        content: input,
        isBot: false,
        senderId: "user",
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      handleSubmit(e)
    },
    [handleSubmit, input]
  )

  // Initialize state with messages from the database
  useEffect(() => {
    if (groupChat.messages.length > 0) {
      setMessages(groupChat.messages)
      setIsInitializing(false)
    }
  }, [groupChat.messages])

  const handleClearGroupChat = async () => {
    setIsClearing(true)
    try {
      const response = await fetch(`/api/group-chat/${groupChat.id}/chat`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to clear messages")
      }

      setMessages([])
      console.log("Group chat messages cleared")
    } catch (error) {
      console.error("Error clearing messages:", error)
    } finally {
      setIsClearing(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading messages...
      </div>
    )
  }

  // Transform group messages to chat message format
  const transformedMessages: ChatMessageProps[] = messages.map((message) => {
    if (message.isBot) {
      const companion = groupChat.members.find(
        (m: any) => m.companion.id === message.senderId
      )?.companion
      return {
        id: message.id,
        role: "system",
        content: message.content,
        src: companion?.src,
        name: companion?.name,
      }
    }
    return {
      id: message.id,
      role: "user",
      content: message.content,
    }
  })

  return isClearing ? (
    <div className="flex items-center justify-center h-full">
      <div className="spinner mr-2" />
      Clearing chat messages...
    </div>
  ) : (
    <div className="flex flex-col h-full p-4 space-y-4 bg-transparent">
      <GroupChatHeader groupChat={groupChat} onClear={handleClearGroupChat} />
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={transformedMessages} isLoading={isLoading} />
      </div>
      <ChatForm
        isLoading={isLoading}
        input={input}
        handleInputChange={handleInputChange}
        onSubmit={onSubmit}
        placeholder="Type a message..."
      />
    </div>
  )
}
