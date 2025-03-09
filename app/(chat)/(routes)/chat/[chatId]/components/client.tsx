"use client"

import { useChat } from "ai/react"
import { FormEvent, useState, useEffect } from "react"
import { Companion, Message } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useChatLimit } from "@/store/use-chat-limit"
import { usePrompts } from "@/store/use-prompts"

import { ChatForm } from "@/components/chat-form"
import { ChatHeader } from "@/components/chat-header"
import { ChatMessages } from "@/components/chat-messages"
import { ChatMessageProps } from "@/components/chat-message"
import { ConfigProvider } from "@/components/chat-config/config-provider"
import { ChatConfigButton } from "@/app/components/chat-config/ChatConfigButton"

interface ChatClientProps {
  companion: Companion & {
    messages: Message[]
    _count: {
      messages: number
    }
  }
}

export const ChatClient = ({ companion }: ChatClientProps) => {
  const router = useRouter()
  const { prompts } = usePrompts()
  const activePrompts = prompts.filter((prompt) => prompt.isActive)

  const [messages, setMessages] = useState<ChatMessageProps[]>(
    companion.messages.length === 0
      ? [
          {
            role: "system",
            content:
              (companion as any).customIntroduction ||
              `Hi there! I'm ${companion.name}. 👋`,
            src: companion.src,
          },
        ]
      : companion.messages
  )
  const { decrementRemaining } = useChatLimit()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isClearingMessages, setIsClearingMessages] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessageProps = {
      role: "user",
      content: input,
      messageStatus: "sent",
      readBy: [],
      reactions: [],
    }

    setMessages((prevMessages) => [...prevMessages, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      setTimeout(() => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg === userMessage) {
              return { ...msg, messageStatus: "delivered" }
            }
            return msg
          })
        })
      }, 500)

      setTimeout(() => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg.role === "user" && msg.content === userMessage.content) {
              return {
                ...msg,
                messageStatus: "read",
                readBy: [{ name: companion.name, src: companion.src }],
              }
            }
            return msg
          })
        })

        if (Math.random() < 0.7) {
          const emojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.role === "user" && msg.content === userMessage.content) {
                return {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    {
                      emoji: randomEmoji,
                      from: companion.name,
                      botSrc: companion.src,
                    },
                  ],
                }
              }
              return msg
            })
          })
        }

        if (Math.random() < 0.2) {
          const botMessages = messages.filter((msg) => msg.role === "assistant")

          if (botMessages.length > 0) {
            const randomBotMessage =
              botMessages[Math.floor(Math.random() * botMessages.length)]
            const emojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]
            const randomEmoji =
              emojis[Math.floor(Math.random() * emojis.length)]

            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                if (msg.id === randomBotMessage.id) {
                  return {
                    ...msg,
                    reactions: [
                      ...(msg.reactions || []),
                      {
                        emoji: randomEmoji,
                        from: companion.name,
                        botSrc: companion.src,
                      },
                    ],
                  }
                }
                return msg
              })
            })
          }
        }
      }, 1500)

      let messageWithPrompts = [...messages, userMessage]

      if (activePrompts.length > 0) {
        const systemMessageIndex = messageWithPrompts.findIndex(
          (msg) => msg.role === "system"
        )

        if (systemMessageIndex >= 0) {
          const systemMessage = messageWithPrompts[systemMessageIndex]
          const promptsText = activePrompts
            .map((prompt) => `- ${prompt.text}`)
            .join("\n")

          messageWithPrompts[systemMessageIndex] = {
            ...systemMessage,
            content: `${systemMessage.content}\n\nAdditional instructions:\n${promptsText}`,
          }
        } else {
          const promptsText = activePrompts
            .map((prompt) => `- ${prompt.text}`)
            .join("\n")

          messageWithPrompts.unshift({
            role: "system",
            content: `Additional instructions:\n${promptsText}`,
          })
        }
      }

      const response = await fetch(`/api/chat/${companion.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allMessages: messageWithPrompts,
          isFollowUp: false,
        }),
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Failed to get response reader")
      }

      const assistantMessage: ChatMessageProps = {
        role: "assistant",
        content: "",
        src: companion.src,
        name: companion.name,
      }

      setMessages((prevMessages) => [...prevMessages, assistantMessage])

      const decoder = new TextDecoder()
      let done = false
      let sentInitialMessageId = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        const chunkValue = decoder.decode(value, { stream: true })

        if (chunkValue) {
          try {
            // First try to parse as JSON
            const parsedChunks = chunkValue
              .split("\n")
              .filter(Boolean)
              .map((chunk) => {
                try {
                  return JSON.parse(chunk)
                } catch (e) {
                  // If parsing fails, treat as raw text
                  return { content: chunk }
                }
              })

            for (const parsedChunk of parsedChunks) {
              if (parsedChunk.message && !sentInitialMessageId) {
                // First message, set the ID on the assistant message
                assistantMessage.id = parsedChunk.message.id
                sentInitialMessageId = true
              } else if (parsedChunk.message) {
                // Another message, add it as a new message
                setMessages((prevMessages) => [
                  ...prevMessages.slice(0, -1),
                  {
                    ...prevMessages[prevMessages.length - 1],
                    content:
                      prevMessages[prevMessages.length - 1].content +
                      parsedChunk.message.content,
                  },
                ])
              } else if (parsedChunk.content) {
                // Stream chunk for the current message
                setMessages((prevMessages) => [
                  ...prevMessages.slice(0, -1),
                  {
                    ...prevMessages[prevMessages.length - 1],
                    content:
                      prevMessages[prevMessages.length - 1].content +
                      parsedChunk.content,
                  },
                ])
              }
            }
          } catch (error) {
            console.error("Error parsing chunk", chunkValue, error)
            
            // Fallback: treat entire chunk as plain text content
            setMessages((prevMessages) => [
              ...prevMessages.slice(0, -1),
              {
                ...prevMessages[prevMessages.length - 1],
                content:
                  prevMessages[prevMessages.length - 1].content + chunkValue,
              },
            ])
          }
        }
      }

      // After receiving the full message, mark it as delivered
      setTimeout(() => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg, index) => {
            if (index === prevMessages.length - 1) {
              return { ...msg, messageStatus: "delivered" }
            }
            return msg
          })
        })
      }, 1000)

      // After a delay, mark the last assistant message as read
      setTimeout(() => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg, index) => {
            if (index === prevMessages.length - 1) {
              return {
                ...msg,
                messageStatus: "read",
                readBy: [{ name: "You", src: "/placeholder-user.jpg" }],
              }
            }
            return msg
          })
        })
      }, 2000)

      // Occasionally add a random reaction to the assistant's message
      setTimeout(() => {
        if (Math.random() < 0.4) {
          const emojis = ["👍", "❤️", "😄", "🙌", "👏", "🤔", "💡", "✨"]
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

          setMessages((prevMessages) => {
            return prevMessages.map((msg, index) => {
              if (index === prevMessages.length - 1) {
                return {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    {
                      emoji: randomEmoji,
                      from: "You",
                      userSrc: "/placeholder-user.jpg",
                    },
                  ],
                }
              }
              return msg
            })
          })
        }
      }, 4000)
    } catch (error) {
      console.error(error)
    } finally {
      decrementRemaining?.()
      setIsLoading(false)
    }
  }

  const onClear = async (onClose: () => void) => {
    try {
      setIsClearingMessages(true)
      const cleared = await fetch(`/api/chat/${companion.id}/clear`, {
        method: "DELETE",
      })
      setMessages([
        {
          role: "system",
          content: `Hi there! I'm ${companion.name}. 👋`,
          src: companion.src,
        },
      ])
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsClearingMessages(false)
    }
  }

  const handleInputFocus = () => {}

  return (
    <ConfigProvider initialCompanionId={companion.id}>
      <div className="flex flex-col h-full p-1 space-y-1">
        <div className="flex items-center justify-between">
          <ChatHeader
            companion={companion}
            onClear={onClear}
            isGroupChat={false}
            isClearingMessages={isClearingMessages}
          />
          <div className="flex items-center space-x-2">
            <ChatConfigButton companionId={companion.id} />
          </div>
        </div>
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
        />
        <ChatForm
          input={input}
          handleInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onFocus={handleInputFocus}
        />
      </div>
    </ConfigProvider>
  )
}
